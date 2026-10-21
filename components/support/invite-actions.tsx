"use client";

import { useActionState } from "react";
import { acceptInviteForm, declineInvite } from "@/app/(app)/support/actions";
import { FormMessage } from "@/components/form-message";

export function InviteActions({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInviteForm, null);
  return (
    <div className="mt-10 space-y-4">
      <div className="flex flex-wrap gap-3">
        <form action={action}>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Connecting…" : "Accept and connect"}
          </button>
        </form>
        <form action={declineInvite.bind(null, token)}>
          <button type="submit" className="btn btn-secondary" disabled={pending}>Decline</button>
        </form>
      </div>
      <FormMessage state={state} />
    </div>
  );
}
