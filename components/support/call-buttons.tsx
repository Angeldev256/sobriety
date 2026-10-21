"use client";

import { useCalls } from "@/components/calls/call-provider";
import { PhoneIcon, VideoIcon } from "@/components/icons";
import { telLink, whatsappLink } from "@/lib/support";

type Props = {
  connectionId: string;
  peerId: string | null;
  peerName: string;
  phone?: string | null;
  tone?: "default" | "inverse";
  size?: "md" | "sm";
};

/** In-app video/voice calls, with WhatsApp and phone fallbacks for weak data connections. */
export function CallButtons({ connectionId, peerId, peerName, phone, tone = "default", size = "md" }: Props) {
  const { startCall, state } = useCalls();
  const busy = state.phase !== "idle";
  const secondary = tone === "inverse" ? "btn-on-inverse" : "btn-secondary";
  const sm = size === "sm" ? "btn-sm" : "";
  const peer = peerId ? { connectionId, peerId, peerName } : null;

  return (
    <div className="flex flex-wrap gap-2">
      {peer && (
        <>
          <button type="button" className={`btn btn-primary ${sm}`} disabled={busy} onClick={() => startCall(peer, "video")}>
            <VideoIcon size={18} />
            Video call
          </button>
          <button type="button" className={`btn ${secondary} ${sm}`} disabled={busy} onClick={() => startCall(peer, "audio")}>
            <PhoneIcon size={18} />
            Voice call
          </button>
        </>
      )}
      {phone && (
        <>
          <a href={whatsappLink(phone)} target="_blank" rel="noopener noreferrer" className={`btn ${secondary} ${sm}`}>
            WhatsApp
          </a>
          <a href={telLink(phone)} className={`btn ${secondary} ${sm}`}>
            Phone
          </a>
        </>
      )}
    </div>
  );
}
