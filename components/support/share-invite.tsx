"use client";

import { useState } from "react";
import { whatsappShareLink } from "@/lib/support";

/** Copy the invite link, or send it straight from WhatsApp. */
export function ShareInvite({ link, helperName, compact = false }: { link: string; helperName: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const message = `Hi ${helperName}, I'd like you to be part of my support circle on Sobriety Tracker. You can accept here: ${link}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this invitation link:", link);
    }
  };

  return (
    <div className="space-y-3">
      {!compact && (
        <input readOnly value={link} aria-label="Invitation link" onFocus={(e) => e.currentTarget.select()} className="input h-11 text-sm text-muted" />
      )}
      <div className="flex flex-wrap gap-2">
        <a href={whatsappShareLink(message)} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
          Share on WhatsApp
        </a>
        <button type="button" onClick={copy} className="btn btn-secondary btn-sm" aria-live="polite">
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
