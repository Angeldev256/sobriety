"use client";

import { useTransition } from "react";
import { cancelInvite } from "@/app/(app)/support/actions";
import { ShareInvite } from "@/components/support/share-invite";

export function PendingInvite({ id, name, relationship, link }: { id: string; name: string; relationship: string; link: string }) {
  const [pending, start] = useTransition();
  return (
    <li className={`border-b border-border py-5 ${pending ? "opacity-50" : ""}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-lg">{name}</p>
          <p className="caption">{relationship} · Invitation sent, waiting for them to accept</p>
        </div>
        <button
          type="button"
          className="text-sm font-semibold text-muted hover:text-danger"
          onClick={() => {
            if (confirm(`Cancel the invitation to ${name}?`)) start(() => cancelInvite(id));
          }}
        >
          Cancel invite
        </button>
      </div>
      <div className="mt-4">
        <ShareInvite link={link} helperName={name} compact />
      </div>
    </li>
  );
}
