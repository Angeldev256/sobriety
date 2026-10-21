"use client";

import { useActionState, useRef, useEffect } from "react";
import { inviteHelper } from "@/app/(app)/support/actions";
import { FieldError, FormMessage } from "@/components/form-message";
import { ShareInvite } from "@/components/support/share-invite";
import { RELATIONSHIPS } from "@/lib/support";

export function InviteHelperForm({ hasPreferred }: { hasPreferred: boolean }) {
  const [state, action, pending] = useActionState(inviteHelper, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-6">
      {state?.ok && state.inviteLink && (
        <div className="animate-rise space-y-4 rounded-lg bg-surface-2 p-5" role="status">
          <p className="text-sm leading-relaxed">{state.message}</p>
          <ShareInvite link={state.inviteLink} helperName={state.helperName ?? "your helper"} />
        </div>
      )}

      <form ref={formRef} action={action} className="space-y-5" noValidate>
        <div>
          <label htmlFor="helper_name" className="label">Their name</label>
          <input id="helper_name" name="helper_name" maxLength={60} className="input" placeholder="e.g. Counsellor Grace" autoComplete="off" />
          <FieldError state={state} name="helper_name" />
        </div>
        <div>
          <label htmlFor="helper_email" className="label">Their email</label>
          <input id="helper_email" name="helper_email" type="email" inputMode="email" className="input" autoComplete="off" />
          <p className="caption mt-2">They&apos;ll sign in with this email to accept.</p>
          <FieldError state={state} name="helper_email" />
        </div>
        <div>
          <label htmlFor="relationship" className="label">How do you know them?</label>
          <select id="relationship" name="relationship" defaultValue="counselor" className="input">
            {RELATIONSHIPS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <FieldError state={state} name="relationship" />
        </div>
        <div>
          <label htmlFor="phone" className="label">
            Their phone <span className="font-normal text-muted">— optional</span>
          </label>
          <input id="phone" name="phone" type="tel" inputMode="tel" className="input" placeholder="0772 123 456" autoComplete="off" />
          <p className="caption mt-2">Adds one-tap WhatsApp and phone call buttons.</p>
          <FieldError state={state} name="phone" />
        </div>
        <label className="flex gap-3 text-sm leading-relaxed">
          <input type="checkbox" name="is_preferred" defaultChecked={!hasPreferred} className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
          <span>
            <span className="font-semibold">Make this my preferred helper</span>
            <span className="block text-muted">They&apos;ll be one tap away from your overview and the help page.</span>
          </span>
        </label>
        <FormMessage state={state?.ok ? null : state} />
        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Creating invitation…" : "Send invitation"}
        </button>
      </form>
    </div>
  );
}
