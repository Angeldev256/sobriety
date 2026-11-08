import "server-only";
import type { VerifiedTransaction } from "@/lib/care/payment-match";
import { env } from "@/lib/env";

// Flutterwave Standard (v3): we create a hosted payment link, the person pays by MTN/Airtel Mobile
// Money or card on Flutterwave's page, and Flutterwave sends them back to redirect_url.
// Test mode uses the test secret key (FLWSECK_TEST-...) from the Flutterwave dashboard.
const API = "https://api.flutterwave.com/v3";

export class PaymentError extends Error {}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const key = env.flutterwaveSecretKey;
  if (!key) throw new PaymentError("Payments are not configured.");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json().catch(() => null)) as { status?: string; message?: string; data?: T } | null;
  if (!res.ok || body?.status !== "success" || !body.data) {
    throw new PaymentError(body?.message || `Flutterwave request failed (${res.status}).`);
  }
  return body.data;
}

export async function createPaymentLink(input: {
  txRef: string;
  amountUgx: number;
  email: string;
  name: string;
  description: string;
  redirectUrl: string;
}): Promise<string> {
  const data = await call<{ link: string }>("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: input.amountUgx,
      currency: "UGX",
      redirect_url: input.redirectUrl,
      payment_options: "mobilemoneyuganda,card",
      customer: { email: input.email, name: input.name },
      customizations: { title: "Sobriety Tracker", description: input.description },
    }),
  });
  return data.link;
}

/** Looks a transaction up by Flutterwave's id. */
export function verifyTransaction(transactionId: string) {
  if (!/^\d{1,20}$/.test(transactionId)) throw new PaymentError("Invalid transaction id.");
  return call<VerifiedTransaction>(`/transactions/${transactionId}/verify`);
}

/** Looks a transaction up by our own reference (for when the person closed the page before returning). */
export function verifyByReference(txRef: string) {
  return call<VerifiedTransaction>(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`);
}
