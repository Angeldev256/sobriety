"use client";

import { useActionState, useState, useTransition } from "react";
import { cancelConsultation, checkPayment, payConsultation } from "@/app/(app)/care/actions";

export function PaymentPanel({ bookingId, amount, paymentsEnabled }: { bookingId: string; amount: string; paymentsEnabled: boolean }) {
  const [state, pay, paying] = useActionState(payConsultation, null);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();
  const [cancelling, startCancel] = useTransition();

  return (
    <section className="card space-y-5 p-6 sm:p-8">
      <h2 className="heading-lg">Pay {amount} to open your session room</h2>
      <p className="text-sm leading-relaxed text-body">
        You&apos;ll be taken to Flutterwave&apos;s secure page to pay with MTN Mobile Money, Airtel Money or a card. Approve the prompt on your
        phone, and you&apos;ll come straight back here.
      </p>
      <form action={pay}>
        <input type="hidden" name="booking_id" value={bookingId} />
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={!paymentsEnabled || paying}>
          {paying ? "Opening payment…" : paymentsEnabled ? `Pay ${amount}` : "Payment opens soon"}
        </button>
      </form>
      {state && !state.ok && <p role="alert" className="text-sm text-danger">{state.error}</p>}

      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-5">
        <button
          type="button"
          className="btn-text text-sm"
          disabled={checking || !paymentsEnabled}
          onClick={() => startCheck(async () => setCheckMessage((await checkPayment(bookingId)).message))}
        >
          {checking ? "Checking…" : "I've already paid — check again"}
        </button>
        <button
          type="button"
          className="btn-text text-sm text-muted"
          disabled={cancelling}
          onClick={() => {
            if (confirm("Cancel this booking? You haven't been charged.")) startCancel(() => cancelConsultation(bookingId));
          }}
        >
          Cancel booking
        </button>
      </div>
      {checkMessage && <p role="status" className="text-sm">{checkMessage}</p>}
    </section>
  );
}
