import type { Consultation } from "@/lib/database.types";

/** The fields of a Flutterwave transaction we rely on, after verifying it with their API. */
export type VerifiedTransaction = { id: number; tx_ref: string; status: string; amount: number; currency: string };

/**
 * A payment counts only when Flutterwave itself confirms it: successful, in UGX, for at least the
 * booked fee, and for this booking's own reference. Redirect query strings and webhook bodies are
 * only hints about which transaction to check.
 */
export function paymentMatches(tx: VerifiedTransaction, booking: Pick<Consultation, "tx_ref" | "fee_ugx">) {
  return tx.status === "successful" && tx.tx_ref === booking.tx_ref && tx.currency === "UGX" && tx.amount >= booking.fee_ugx;
}
