"use client";

import { useActionState, useTransition } from "react";
import { markPaidManually, refundConsultation, reviewProfessional, setPlatformFee } from "@/app/(app)/admin/actions";
import { moderateResource } from "@/app/(site)/resources/actions";
import { FormMessage } from "@/components/form-message";

export function ReviewForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(reviewProfessional, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="user_id" value={userId} />
      <label htmlFor={`note-${userId}`} className="sr-only">Note to the professional</label>
      <input id={`note-${userId}`} name="note" maxLength={500} className="input h-10" placeholder="Note (required to reject or suspend)" />
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="decision" value="verified" className="btn btn-primary btn-sm" disabled={pending}>Verify</button>
        <button type="submit" name="decision" value="rejected" className="btn btn-secondary btn-sm" disabled={pending}>Reject</button>
        <button type="submit" name="decision" value="suspended" className="btn btn-secondary btn-sm" disabled={pending}>Suspend</button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function PlatformFeeForm({ current }: { current: number }) {
  const [state, action, pending] = useActionState(setPlatformFee, null);
  return (
    <form action={action} className="space-y-3">
      <label htmlFor="platform_fee_percent" className="label">Platform fee (% of each session fee)</label>
      <div className="flex gap-2">
        <input id="platform_fee_percent" name="platform_fee_percent" type="number" min={0} max={50} step={0.5} defaultValue={current} className="input w-32" />
        <button type="submit" className="btn btn-primary" disabled={pending}>Save</button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function MarkPaidForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(markPaidManually, null);
  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="booking_id" value={bookingId} />
      <label htmlFor={`ref-${bookingId}`} className="sr-only">Payment reference</label>
      <input id={`ref-${bookingId}`} name="reference" maxLength={100} className="input h-10 w-48" placeholder="Mobile Money ref" />
      <button type="submit" className="btn btn-secondary btn-sm" disabled={pending}>Mark paid</button>
      <div className="w-full"><FormMessage state={state} /></div>
    </form>
  );
}

export function RefundButton({ bookingId }: { bookingId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-text text-sm"
      disabled={pending}
      onClick={() => {
        if (confirm("Record this booking as refunded? Make the refund in the Flutterwave dashboard first. The session room will close.")) {
          start(() => refundConsultation(bookingId));
        }
      }}
    >
      Record refund
    </button>
  );
}

export function ResourceModeration({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "published" && (
        <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => start(() => moderateResource(id, "publish"))}>Publish</button>
      )}
      {status === "published" && (
        <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => start(() => moderateResource(id, "archive"))}>Archive</button>
      )}
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this resource and its file permanently?")) start(() => moderateResource(id, "delete"));
        }}
      >
        Delete
      </button>
    </div>
  );
}
