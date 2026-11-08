"use client";

import { useActionState } from "react";
import { bookConsultation } from "@/app/(app)/care/actions";

type Props = { professionalId: string; professionalName: string; intakeId: string | null; paymentsEnabled: boolean; primary?: boolean };

export function BookForm({ professionalId, professionalName, intakeId, paymentsEnabled, primary }: Props) {
  const [state, action, pending] = useActionState(bookConsultation, null);
  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="professional_id" value={professionalId} />
      {intakeId && <input type="hidden" name="intake_id" value={intakeId} />}
      {intakeId && (
        <label className="flex gap-3 text-sm leading-relaxed">
          <input type="checkbox" name="share_summary" defaultChecked className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
          <span>Share my intake summary with {professionalName.split(" ")[0]} so I don&apos;t have to repeat myself</span>
        </label>
      )}
      {state && !state.ok && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button type="submit" className={`btn w-full ${primary ? "btn-primary" : "btn-secondary"}`} disabled={pending || !paymentsEnabled}>
        {pending ? "Opening payment…" : paymentsEnabled ? "Book and pay" : "Booking opens soon"}
      </button>
    </form>
  );
}
