import { timingSafeEqual } from "node:crypto";
import { settlePayment } from "@/lib/care/payments";
import { env } from "@/lib/env";

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Flutterwave calls this after a charge completes, even if the person never returns to the app.
// The verif-hash header must equal the secret hash set in the Flutterwave dashboard. The body is
// only used to find the transaction id, which is then verified with Flutterwave's API.
export async function POST(request: Request) {
  const expected = env.flutterwaveWebhookHash;
  const received = request.headers.get("verif-hash") ?? "";
  if (!expected || !env.paymentsEnabled || !sameSecret(received, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { event?: string; data?: { id?: number | string; tx_ref?: string } } | null;
  const id = body?.data?.id != null ? String(body.data.id) : "";
  if (!/^\d{1,20}$/.test(id) || !String(body?.data?.tx_ref ?? "").startsWith("care-")) {
    // Not one of our consultation payments; acknowledge so Flutterwave doesn't retry.
    return Response.json({ ok: true, ignored: true });
  }

  try {
    const { result } = await settlePayment({ transactionId: id });
    return Response.json({ ok: true, result });
  } catch (error) {
    console.error("flutterwave webhook", error);
    // A 500 makes Flutterwave retry later.
    return new Response("Error", { status: 500 });
  }
}
