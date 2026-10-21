import type { CallKind } from "@/lib/database.types";

/** STUN for discovery, plus an optional TURN relay (strongly recommended on mobile networks). */
export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const urls = (process.env.NEXT_PUBLIC_TURN_URLS ?? "").split(",").map((u) => u.trim()).filter(Boolean);
  if (urls.length) {
    servers.push({ urls, username: process.env.NEXT_PUBLIC_TURN_USERNAME, credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL });
  }
  return servers;
}

/** Modest video settings keep calls smooth on mobile data. */
export function getCallMedia(kind: CallKind): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video:
      kind === "video"
        ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } }
        : false,
  });
}

export function mediaErrorMessage(kind: CallKind, err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return kind === "video"
      ? "Please allow camera and microphone access to make a video call."
      : "Please allow microphone access to make a voice call.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return kind === "video" ? "No camera or microphone was found on this device." : "No microphone was found on this device.";
  }
  if (!navigator.mediaDevices) return "Calls need a secure (https) connection and a modern browser.";
  return "We couldn't start your camera or microphone. Please try again.";
}

/** A soft, synthesized ringtone (no audio file to download). Silently does nothing if audio is blocked. */
export class Ringtone {
  private ctx: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  start(kind: "incoming" | "outgoing") {
    this.stop();
    try {
      this.ctx = new AudioContext();
    } catch {
      return;
    }
    const play = () => {
      const ctx = this.ctx;
      if (!ctx) return;
      const notes = kind === "incoming" ? [660, 880] : [440];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + i * 0.25;
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(kind === "incoming" ? 0.18 : 0.08, t + 0.03);
        gain.gain.linearRampToValueAtTime(0, t + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.45);
      });
      if (kind === "incoming") navigator.vibrate?.([300, 150, 300]);
    };
    play();
    this.timer = setInterval(play, kind === "incoming" ? 2500 : 3500);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    navigator.vibrate?.(0);
  }
}
