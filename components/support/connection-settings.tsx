"use client";

import { useState, useTransition } from "react";
import { endConnection, updateConnectionPrefs } from "@/app/(app)/support/actions";
import { formatPhone } from "@/lib/support";

/** Member-side controls for one helper. Helpers only see "Leave". */
export function ConnectionSettings({
  connectionId,
  peerName,
  viewerIsMember,
  isPreferred,
  shareProgress,
  phone,
}: {
  connectionId: string;
  peerName: string;
  viewerIsMember: boolean;
  isPreferred: boolean;
  shareProgress: boolean;
  phone: string | null;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState(phone ? formatPhone(phone) : "");

  const save = (patch: Parameters<typeof updateConnectionPrefs>[0]) =>
    start(async () => {
      const res = await updateConnectionPrefs(patch);
      setMessage(res.message ?? null);
    });

  return (
    <details className="group rounded-lg border border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold">
        {viewerIsMember ? `Manage ${peerName}` : "Connection settings"}
        <span aria-hidden className="text-lg font-light text-muted group-open:rotate-45 motion-safe:transition-transform">+</span>
      </summary>
      <div className="space-y-5 border-t border-border px-5 py-5">
        {viewerIsMember && (
          <>
            <label className="flex items-start justify-between gap-6">
              <span>
                <span className="block font-medium">Preferred helper</span>
                <span className="caption block">Shown first on your overview and help page.</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                defaultChecked={isPreferred}
                disabled={pending}
                onChange={(e) => save({ connection_id: connectionId, is_preferred: e.target.checked })}
                className="mt-1 size-5 accent-[var(--primary)]"
              />
            </label>
            <label className="flex items-start justify-between gap-6">
              <span>
                <span className="block font-medium">Share my sober days</span>
                <span className="caption block">{peerName} sees how many days you&apos;ve been free — never your check-ins or notes.</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                defaultChecked={shareProgress}
                disabled={pending}
                onChange={(e) => save({ connection_id: connectionId, share_progress: e.target.checked })}
                className="mt-1 size-5 accent-[var(--primary)]"
              />
            </label>
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                save({ connection_id: connectionId, phone: phoneDraft });
              }}
            >
              <label htmlFor={`phone-${connectionId}`} className="block font-medium">
                {peerName}&apos;s phone
              </label>
              <div className="flex gap-2">
                <input
                  id={`phone-${connectionId}`}
                  type="tel"
                  inputMode="tel"
                  value={phoneDraft}
                  onChange={(e) => setPhoneDraft(e.target.value)}
                  placeholder="0772 123 456"
                  className="input"
                />
                <button type="submit" className="btn btn-secondary shrink-0" disabled={pending}>Save</button>
              </div>
              <p className="caption">Used for the WhatsApp and phone buttons.</p>
            </form>
          </>
        )}
        {message && (
          <p role="status" className="border-l-2 border-primary pl-3 text-sm">
            {message}
          </p>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const what = viewerIsMember ? `Remove ${peerName} from your support circle?` : `Leave ${peerName}'s support circle?`;
            if (confirm(`${what} You won't be able to message or call each other.`)) start(() => endConnection(connectionId));
          }}
          className="text-sm font-semibold text-danger hover:underline"
        >
          {viewerIsMember ? `Remove ${peerName}` : "Leave this support circle"}
        </button>
      </div>
    </details>
  );
}
