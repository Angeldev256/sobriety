"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useCalls } from "@/components/calls/call-provider";
import { MicIcon, MicOffIcon, PhoneIcon, PhoneOffIcon, VideoIcon, VideoOffIcon } from "@/components/icons";
import { initials } from "@/lib/support";

/**
 * Callback ref that attaches a stream to a <video>/<audio> element whenever the element
 * mounts (e.g. when a call becomes active) or the stream changes.
 */
function useStreamRef(stream: MediaStream | null) {
  return useCallback(
    (el: HTMLMediaElement | null) => {
      if (!el) return;
      if (el.srcObject !== stream) el.srcObject = stream;
      if (stream) void el.play().catch(() => {});
    },
    [stream],
  );
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  return (
    <span className="tabular-nums">
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </span>
  );
}

function Control({ label, onClick, active = false, danger = false, children }: { label: string; onClick: () => void; active?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={danger ? undefined : active} className="flex flex-col items-center gap-2 text-xs text-white/80">
      <span
        className={`flex size-14 items-center justify-center rounded-full transition-colors ${
          danger ? "bg-[#c81b3a] text-white hover:bg-[#a8152f]" : active ? "bg-white text-black" : "bg-white/15 text-white hover:bg-white/25"
        }`}
      >
        {children}
      </span>
      {label}
    </button>
  );
}

/** Incoming-call sheet and the full-screen call view. Rendered once by <CallProvider>. */
export function CallScreen() {
  const { state, error, clearError, localStream, remoteStream, accept, decline, hangUp, toggleMute, toggleCamera } = useCalls();
  const remoteVideo = useStreamRef(remoteStream);
  const remoteAudio = useStreamRef(remoteStream);
  const localVideo = useStreamRef(localStream);
  const { phase, peer, kind } = state;
  const isVideo = kind === "video";
  const name = peer?.peerName ?? "";

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(clearError, 6000);
    return () => clearTimeout(id);
  }, [error, clearError]);

  const errorToast = error ? (
    <div role="alert" className="fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-md rounded-lg bg-black px-5 py-4 text-sm text-white shadow-lg lg:bottom-8">
      {error}
      <button type="button" onClick={clearError} className="ml-3 font-semibold text-[#53b1ff]">Dismiss</button>
    </div>
  ) : null;

  if (phase === "idle") return errorToast;

  if (phase === "incoming") {
    return (
      <div role="dialog" aria-modal="true" aria-labelledby="incoming-title" className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
        <div className="animate-rise w-full max-w-sm rounded-lg bg-black p-8 text-center text-white">
          <span aria-hidden className="mx-auto flex size-24 animate-pulse items-center justify-center rounded-full bg-white/10 text-3xl font-light">
            {initials(name)}
          </span>
          <p className="mt-6 text-xs font-medium tracking-[0.08em] text-white/60 uppercase">Incoming {isVideo ? "video" : "voice"} call</p>
          <h2 id="incoming-title" className="mt-2 text-3xl font-light">{name}</h2>
          <div className="mt-10 flex justify-center gap-16">
            <Control label="Decline" onClick={decline} danger>
              <PhoneOffIcon />
            </Control>
            <Control label="Answer" onClick={accept} active>
              {isVideo ? <VideoIcon /> : <PhoneIcon />}
            </Control>
          </div>
        </div>
        {errorToast}
      </div>
    );
  }

  const status =
    phase === "outgoing"
      ? "Ringing…"
      : phase === "connecting"
        ? "Connecting…"
        : phase === "ended"
          ? state.endedLabel
          : state.reconnecting
            ? "Reconnecting…"
            : null;

  return (
    <div role="dialog" aria-modal="true" aria-label={`${isVideo ? "Video" : "Voice"} call with ${name}`} className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      {isVideo && remoteStream && phase === "active" ? (
        <video ref={remoteVideo} autoPlay playsInline className="absolute inset-0 size-full object-cover" />
      ) : (
        <audio ref={remoteAudio} autoPlay />
      )}

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        {!(isVideo && phase === "active") && (
          <span aria-hidden className={`flex size-28 items-center justify-center rounded-full bg-white/10 text-4xl font-light ${phase === "outgoing" ? "animate-pulse" : ""}`}>
            {initials(name)}
          </span>
        )}
        <div className={isVideo && phase === "active" ? "absolute top-6 left-6 text-left" : "mt-6"}>
          <h2 className={`font-light ${isVideo && phase === "active" ? "text-xl drop-shadow" : "text-3xl"}`}>{name}</h2>
          <p className="mt-1 text-sm text-white/70" aria-live="polite">
            {status ?? (state.startedAt ? <Elapsed since={state.startedAt} /> : null)}
          </p>
        </div>
      </div>

      {isVideo && localStream && phase !== "ended" && (
        <video
          ref={localVideo}
          autoPlay
          playsInline
          muted
          aria-label="Your camera"
          className={`absolute top-6 right-6 z-20 aspect-[3/4] w-28 rounded-lg border border-white/20 bg-white/5 object-cover sm:w-40 [transform:scaleX(-1)] ${state.cameraOff ? "opacity-0" : ""}`}
        />
      )}

      {phase !== "ended" && (
        <div className="relative z-10 flex justify-center gap-8 bg-black/40 px-6 pt-8 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
          <Control label={state.muted ? "Unmute" : "Mute"} onClick={toggleMute} active={state.muted}>
            {state.muted ? <MicOffIcon /> : <MicIcon />}
          </Control>
          {isVideo && (
            <Control label={state.cameraOff ? "Camera on" : "Camera off"} onClick={toggleCamera} active={state.cameraOff}>
              {state.cameraOff ? <VideoOffIcon /> : <VideoIcon />}
            </Control>
          )}
          <Control label="End" onClick={hangUp} danger>
            <PhoneOffIcon />
          </Control>
        </div>
      )}
      {errorToast}
    </div>
  );
}
