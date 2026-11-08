import "server-only";
import { formatUgx } from "@/lib/care/constants";
import { paymentMatches, type VerifiedTransaction } from "@/lib/care/payment-match";
import type { Consultation } from "@/lib/database.types";
import { notify } from "@/lib/notifications/notify";
import { PaymentError, verifyByReference, verifyTransaction } from "@/lib/payments/flutterwave";
import { createServiceClient } from "@/lib/supabase/server";

export type SettleResult = "paid" | "already_paid" | "pending" | "failed" | "not_found";

/** Verifies a payment with Flutterwave and, if it's good, opens the session room. Safe to call repeatedly. */
export async function settlePayment(lookup: { transactionId: string } | { txRef: string }): Promise<{ result: SettleResult; bookingId?: string }> {
  const db = createServiceClient();

  let tx: VerifiedTransaction;
  try {
    tx = "transactionId" in lookup ? await verifyTransaction(lookup.transactionId) : await verifyByReference(lookup.txRef);
  } catch (error) {
    // "No transaction was found" for a reference simply means it hasn't been paid yet.
    if (error instanceof PaymentError) return { result: "txRef" in lookup ? "pending" : "failed" };
    throw error;
  }

  const { data: booking } = await db.from("consultations").select("*").eq("tx_ref", tx.tx_ref).maybeSingle();
  if (!booking) return { result: "not_found" };
  if (booking.status === "paid" || booking.status === "completed") return { result: "already_paid", bookingId: booking.id };
  if (tx.status === "pending") return { result: "pending", bookingId: booking.id };
  if (!paymentMatches(tx, booking)) return { result: "failed", bookingId: booking.id };
  if (booking.status !== "awaiting_payment") {
    // Paid after cancelling: keep the record so an admin can refund or reopen it.
    console.error(`Payment ${tx.id} received for ${booking.status} booking ${booking.id}`);
    return { result: "failed", bookingId: booking.id };
  }

  const { data: room, error } = await db.rpc("activate_consultation", { booking: booking.id, provider: "flutterwave", provider_tx: String(tx.id) });
  if (error || !room) throw new Error(`Could not activate booking ${booking.id}: ${error?.message}`);

  await announcePaid(booking, room);
  return { result: "paid", bookingId: booking.id };
}

/** Tells both people the session room is open. */
export async function announcePaid(booking: Consultation, room: string) {
  const db = createServiceClient();
  await Promise.all([
    notify(db, booking.patient_id, {
      kind: "support",
      title: `Payment received — you can now reach ${booking.professional_name}`,
      body: `${formatUgx(booking.fee_ugx)} paid. Message them or start a call from your session room.`,
      url: `/support/${room}`,
      push: true,
    }),
    booking.professional_id
      ? notify(db, booking.professional_id, {
          kind: "support",
          title: `New paid session with ${booking.patient_name}`,
          body: booking.intake_summary ? "They shared their intake summary with you." : "Say hello when you're ready.",
          url: `/pro/consultations/${booking.id}`,
          push: true,
        })
      : Promise.resolve(),
  ]);
}
