import { type NextRequest, NextResponse } from "next/server";
import { settlePayment } from "@/lib/care/payments";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";

// Flutterwave sends the person back here: ?status=successful|cancelled|failed&tx_ref=...&transaction_id=...
// The query string is only a hint; settlePayment re-verifies with Flutterwave before anything is marked paid.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const status = params.get("status") ?? "";
  const txRef = params.get("tx_ref") ?? "";
  const transactionId = params.get("transaction_id") ?? "";
  const back = (bookingId: string | undefined, outcome: string) =>
    NextResponse.redirect(new URL(bookingId ? `/care/consultations/${bookingId}?payment=${outcome}` : "/care?payment=unknown", env.siteUrl));

  if (!env.paymentsEnabled || !/^care-[0-9a-f]{32}$/.test(txRef)) return back(undefined, "unknown");

  if (status === "cancelled" || !transactionId) {
    const { data } = await createServiceClient().from("consultations").select("id").eq("tx_ref", txRef).maybeSingle();
    if (status === "cancelled" || !data) return back(data?.id, "cancelled");
  }

  try {
    const { result, bookingId } = transactionId ? await settlePayment({ transactionId }) : await settlePayment({ txRef });
    return back(bookingId, result === "already_paid" ? "paid" : result);
  } catch (error) {
    console.error("payment callback", error);
    const { data } = await createServiceClient().from("consultations").select("id").eq("tx_ref", txRef).maybeSingle();
    return back(data?.id, "pending");
  }
}
