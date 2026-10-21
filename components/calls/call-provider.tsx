"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { logCall, notifyIncomingCall } from "@/app/(app)/support/actions";
import { CallScreen } from "@/components/calls/call-screen";
import type { CallKind, Database } from "@/lib/database.types";
import { getCallMedia, iceServers, mediaErrorMessage, Ringtone } from "@/lib/calls/media";
import { createClient } from "@/lib/supabase/client";

export type CallPeer = { connectionId: string; peerId: string; peerName: string };
type Phase = "idle" | "incoming" | "outgoing" | "connecting" | "active" | "ended";

export type CallState = {
  phase: Phase;
  callId?: string;
  kind?: CallKind;
  role?: "caller" | "callee";
  peer?: CallPeer;
  startedAt?: number;
  reconnecting?: boolean;
  muted: boolean;
  cameraOff: boolean;
  endedLabel?: string;
};

type CallContext = {
  state: CallState;
  error: string | null;
  clearError: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (peer: CallPeer, kind: CallKind) => void;
  accept: () => void;
  decline: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
};

const Ctx = createContext<CallContext | null>(null);

export function useCalls() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCalls must be used inside <CallProvider>");
  return ctx;
}

const IDLE: CallState = { phase: "idle", muted: false, cameraOff: false };
const RING_TIMEOUT_MS = 40_000;
const RING_REPEAT_MS = 4_000;

type Ring = { callId: string; connectionId: string; fromId: string; fromName: string; kind: CallKind };

function subscribe(channel: RealtimeChannel): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), 10_000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        clearTimeout(timer);
        reject(new Error(status));
      }
    });
  });
}

/**
 * One call at a time, app-wide. Signalling runs over private Supabase Realtime channels:
 *   user:<id>   — "ring"/"cancel" for incoming calls (only people you're connected with can ring you)
 *   call:<conn> — accept / decline / offer / answer / ice / hangup between the two participants
 * Media flows peer-to-peer over WebRTC.
 */
export function CallProvider({ me, peers, children }: { me: { id: string; name: string }; peers: CallPeer[]; children: ReactNode }) {
  const [state, setStateRaw] = useState<CallState>(IDLE);
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const stateRef = useRef<CallState>(IDLE);
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const callChRef = useRef<RealtimeChannel | null>(null);
  const ringChRef = useRef<RealtimeChannel | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ringInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringtone = useRef<Ringtone | null>(null);
  const peersRef = useRef(peers);
  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  const setState = useCallback((next: CallState) => {
    stateRef.current = next;
    setStateRaw(next);
  }, []);
  const patch = useCallback((p: Partial<CallState>) => setState({ ...stateRef.current, ...p }), [setState]);

  const sb = useCallback(() => (supabaseRef.current ??= createClient()), []);
  const tone = () => (ringtone.current ??= new Ringtone());

  const send = (channel: RealtimeChannel | null, event: string, payload: Record<string, unknown>) => {
    void channel?.send({ type: "broadcast", event, payload });
  };

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (ringInterval.current) clearInterval(ringInterval.current);
    ringInterval.current = null;
  };

  const releaseChannels = () => {
    const client = supabaseRef.current;
    const chans = [callChRef.current, ringChRef.current];
    callChRef.current = null;
    ringChRef.current = null;
    // Give final messages (hangup/cancel) a moment to leave before closing.
    setTimeout(() => chans.forEach((c) => c && client?.removeChannel(c)), 600);
  };

  const releaseMedia = () => {
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    pendingIce.current = [];
    setLocalStream(null);
    setRemoteStream(null);
  };

  /** Ends the call everywhere. The caller records the outcome in the conversation history. */
  const finish = useCallback(
    (reason: "ended" | "declined" | "missed" | "failed" | "cancelled", notifyPeer: boolean) => {
      const s = stateRef.current;
      if (s.phase === "idle" || s.phase === "ended") return;
      clearTimers();
      tone().stop();

      if (notifyPeer) send(callChRef.current, "hangup", { callId: s.callId });
      if (s.role === "caller" && s.phase === "outgoing") send(ringChRef.current, "cancel", { callId: s.callId });

      const duration = s.startedAt ? Math.round((Date.now() - s.startedAt) / 1000) : 0;
      if (s.role === "caller" && s.peer && s.kind) {
        const status = s.startedAt ? "completed" : reason === "declined" ? "declined" : reason === "failed" ? "failed" : "missed";
        void logCall({ connection_id: s.peer.connectionId, kind: s.kind, status, duration_seconds: duration }).catch(() => {});
      }

      releaseMedia();
      releaseChannels();

      const label =
        reason === "declined"
          ? `${s.peer?.peerName ?? "They"} can't talk right now`
          : reason === "missed"
            ? "No answer"
            : reason === "failed"
              ? "The connection dropped"
              : s.startedAt
                ? `Call ended · ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`
                : "Call ended";
      setState({ ...s, phase: "ended", endedLabel: label, reconnecting: false });
      timers.current.push(setTimeout(() => setState(IDLE), 2200));
    },
    [setState],
  );

  const addIce = async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) {
      pendingIce.current.push(candidate);
      return;
    }
    await pc.addIceCandidate(candidate).catch(() => {});
  };

  const flushIce = async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const queued = pendingIce.current;
    pendingIce.current = [];
    for (const c of queued) await pc.addIceCandidate(c).catch(() => {});
  };

  const createPeer = (callId: string) => {
    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    const local = localRef.current;
    local?.getTracks().forEach((t) => pc.addTrack(t, local));
    pc.ontrack = (e) => setRemoteStream(e.streams[0] ?? new MediaStream([e.track]));
    pc.onicecandidate = (e) => {
      if (e.candidate) send(callChRef.current, "ice", { callId, candidate: e.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "connected") {
        patch({ phase: "active", startedAt: stateRef.current.startedAt ?? Date.now(), reconnecting: false });
      } else if (st === "disconnected") {
        patch({ reconnecting: true });
        timers.current.push(
          setTimeout(() => {
            if (pcRef.current === pc && pc.connectionState !== "connected") finish("failed", true);
          }, 12_000),
        );
      } else if (st === "failed") {
        finish("failed", true);
      }
    };
    pcRef.current = pc;
    return pc;
  };

  /** Joins the shared call channel for a connection and wires up signalling handlers. */
  const joinCallChannel = async (connectionId: string, callId: string, handlers: Record<string, (p: Record<string, unknown>) => void>) => {
    const client = sb();
    await client.realtime.setAuth();
    const ch = client.channel(`call:${connectionId}`, { config: { private: true, broadcast: { self: false } } });
    for (const [event, fn] of Object.entries(handlers)) {
      ch.on("broadcast", { event }, ({ payload }) => {
        if ((payload as { callId?: string })?.callId === callId) fn(payload as Record<string, unknown>);
      });
    }
    ch.on("broadcast", { event: "ice" }, ({ payload }) => {
      const p = payload as { callId?: string; candidate?: RTCIceCandidateInit };
      if (p.callId === callId && p.candidate) void addIce(p.candidate);
    });
    ch.on("broadcast", { event: "hangup" }, ({ payload }) => {
      if ((payload as { callId?: string })?.callId === callId) finish("ended", false);
    });
    callChRef.current = ch;
    await subscribe(ch);
    return ch;
  };

  // ---- outgoing ----------------------------------------------------------
  const startCall = useCallback(
    async (peer: CallPeer, kind: CallKind) => {
      if (stateRef.current.phase !== "idle") return;
      setError(null);
      let stream: MediaStream;
      try {
        stream = await getCallMedia(kind);
      } catch (err) {
        setError(mediaErrorMessage(kind, err));
        return;
      }
      localRef.current = stream;
      setLocalStream(stream);
      const callId = crypto.randomUUID();
      setState({ phase: "outgoing", callId, kind, role: "caller", peer, muted: false, cameraOff: false });
      tone().start("outgoing");

      try {
        await joinCallChannel(peer.connectionId, callId, {
          accept: async () => {
            if (stateRef.current.phase !== "outgoing") return;
            clearTimers();
            tone().stop();
            patch({ phase: "connecting" });
            const pc = createPeer(callId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            send(callChRef.current, "offer", { callId, sdp: pc.localDescription?.toJSON() });
          },
          decline: () => finish("declined", false),
          answer: async (p) => {
            const pc = pcRef.current;
            if (!pc || !p.sdp) return;
            await pc.setRemoteDescription(p.sdp as RTCSessionDescriptionInit);
            await flushIce();
          },
        });

        const client = sb();
        const ringCh = client.channel(`user:${peer.peerId}`, { config: { private: true } });
        ringChRef.current = ringCh;
        await subscribe(ringCh);
        const ring = () => send(ringCh, "ring", { callId, connectionId: peer.connectionId, fromId: me.id, fromName: me.name, kind } satisfies Ring);
        ring();
        // Repeat the ring so someone who opens the app from the notification still catches it.
        ringInterval.current = setInterval(ring, RING_REPEAT_MS);
        timers.current.push(setTimeout(() => stateRef.current.phase === "outgoing" && finish("missed", true), RING_TIMEOUT_MS));
        void notifyIncomingCall(peer.connectionId, kind).catch(() => {});
      } catch {
        setError("We couldn't start the call. Check your internet connection and try again.");
        finish("failed", false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helpers only touch refs
    [me.id, me.name, finish, patch, setState],
  );

  // ---- incoming ----------------------------------------------------------
  const accept = useCallback(async () => {
    const s = stateRef.current;
    if (s.phase !== "incoming" || !s.peer || !s.kind || !s.callId) return;
    const { peer, kind, callId } = s;
    tone().stop();
    let stream: MediaStream;
    try {
      stream = await getCallMedia(kind);
    } catch (err) {
      setError(mediaErrorMessage(kind, err));
      return;
    }
    localRef.current = stream;
    setLocalStream(stream);
    patch({ phase: "connecting" });
    try {
      const ch = await joinCallChannel(peer.connectionId, callId, {
        offer: async (p) => {
          if (!p.sdp) return;
          const pc = createPeer(callId);
          await pc.setRemoteDescription(p.sdp as RTCSessionDescriptionInit);
          await flushIce();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send(callChRef.current, "answer", { callId, sdp: pc.localDescription?.toJSON() });
        },
      });
      send(ch, "accept", { callId });
      timers.current.push(setTimeout(() => stateRef.current.phase === "connecting" && finish("failed", true), 30_000));
    } catch {
      setError("We couldn't connect the call. Please try again.");
      finish("failed", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helpers only touch refs
  }, [finish, patch]);

  const decline = useCallback(async () => {
    const s = stateRef.current;
    if (s.phase !== "incoming" || !s.peer || !s.callId) return;
    tone().stop();
    setState(IDLE);
    try {
      const client = sb();
      await client.realtime.setAuth();
      const ch = client.channel(`call:${s.peer.connectionId}`, { config: { private: true } });
      await subscribe(ch);
      send(ch, "decline", { callId: s.callId });
      setTimeout(() => client.removeChannel(ch), 600);
    } catch {
      // The caller's ring will time out on its own.
    }
  }, [sb, setState]);

  // Listen for rings on my own channel for as long as I'm signed in.
  useEffect(() => {
    const client = sb();
    let ch: RealtimeChannel | null = null;
    let cancelled = false;
    (async () => {
      await client.realtime.setAuth();
      if (cancelled) return;
      ch = client.channel(`user:${me.id}`, { config: { private: true } });
      ch.on("broadcast", { event: "ring" }, ({ payload }) => {
        const r = payload as Ring;
        const cur = stateRef.current;
        if (cur.callId === r.callId) return; // repeated ring for a call we already know about
        const known = peersRef.current.find((p) => p.connectionId === r.connectionId && p.peerId === r.fromId);
        if (!known) return;
        if (cur.phase !== "idle") return; // busy: the caller will hear no answer
        setState({ phase: "incoming", callId: r.callId, kind: r.kind, role: "callee", peer: known, muted: false, cameraOff: false });
        tone().start("incoming");
        timers.current.push(setTimeout(() => stateRef.current.callId === r.callId && stateRef.current.phase === "incoming" && setState(IDLE), RING_TIMEOUT_MS + 5_000));
      });
      ch.on("broadcast", { event: "cancel" }, ({ payload }) => {
        const cur = stateRef.current;
        if (cur.phase === "incoming" && cur.callId === (payload as { callId?: string }).callId) {
          tone().stop();
          setState(IDLE);
        }
      });
      ch.subscribe();
    })().catch(() => {});
    return () => {
      cancelled = true;
      if (ch) void client.removeChannel(ch);
    };
  }, [me.id, sb, setState]);

  // Clean up if the user navigates away entirely.
  useEffect(() => {
    const onUnload = () => {
      if (stateRef.current.phase !== "idle") send(callChRef.current, "hangup", { callId: stateRef.current.callId });
    };
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("pagehide", onUnload);
      ringtone.current?.stop();
    };
  }, []);

  const hangUp = useCallback(() => {
    const s = stateRef.current;
    finish(s.phase === "outgoing" ? "cancelled" : "ended", true);
  }, [finish]);

  const toggleMute = useCallback(() => {
    const muted = !stateRef.current.muted;
    localRef.current?.getAudioTracks().forEach((t) => (t.enabled = !muted));
    patch({ muted });
  }, [patch]);

  const toggleCamera = useCallback(() => {
    const cameraOff = !stateRef.current.cameraOff;
    localRef.current?.getVideoTracks().forEach((t) => (t.enabled = !cameraOff));
    patch({ cameraOff });
  }, [patch]);

  const value = useMemo<CallContext>(
    () => ({
      state,
      error,
      clearError: () => setError(null),
      localStream,
      remoteStream,
      startCall: (p, k) => void startCall(p, k),
      accept: () => void accept(),
      decline: () => void decline(),
      hangUp,
      toggleMute,
      toggleCamera,
    }),
    [state, error, localStream, remoteStream, startCall, accept, decline, hangUp, toggleMute, toggleCamera],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <CallScreen />
    </Ctx.Provider>
  );
}
