import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConsultationStatusLabel } from "@/components/care/consultation-status";
import { PaymentPanel } from "@/components/care/payment-panel";
import { formatUgx } from "@/lib/care/constants";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your session" };

const NOTICES: Record<string, { text: string; ok: boolean }> = {
  paid: { text: "Payment received. Your session room is open.", ok: true },
  pending: { text: "Your payment is still being confirmed. Mobile Money can take a few minutes.", ok: true },
  cancelled: { text: "Payment was cancelled. You haven't been charged.", ok: false },
  failed: { text: "That payment didn't go through. You haven't been charged — please try again.", ok: false },
  not_found: { text: "We couldn't find that payment. If money left your account, please contact us.", ok: false },
};

export default async function ConsultationPage({ params, searchParams }: PageProps<"/care/consultations/[id]">) {
  const { id } = await params;
  const { payment } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase, user } = await requireUser();
  const { data: c } = await supabase.from("consultations").select("*").eq("id", id).eq("patient_id", user.id).maybeSingle();
  if (!c) notFound();
  const notice = typeof payment === "string" ? NOTICES[payment] : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header className="space-y-3">
        <Link href="/care" className="text-sm text-muted hover:text-fg">← Professional care</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="display-lg">{c.professional_name}</h1>
          <ConsultationStatusLabel status={c.status} />
        </div>
        <p className="caption">
          Booked {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </header>

      {notice && (
        <p role={notice.ok ? "status" : "alert"} className={`border-l-2 py-1 pl-3 text-sm ${notice.ok ? "border-primary" : "border-danger text-danger"}`}>
          {notice.text}
        </p>
      )}

      <dl className="divide-y divide-border border-y border-border text-sm">
        <div className="flex justify-between py-4"><dt className="text-muted">Session fee</dt><dd className="font-semibold">{formatUgx(c.fee_ugx)}</dd></div>
        <div className="flex justify-between py-4"><dt className="text-muted">Payment reference</dt><dd className="font-mono text-xs">{c.tx_ref}</dd></div>
        {c.paid_at && (
          <div className="flex justify-between py-4">
            <dt className="text-muted">Paid</dt>
            <dd>{new Date(c.paid_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</dd>
          </div>
        )}
        <div className="flex justify-between gap-6 py-4">
          <dt className="text-muted">Intake summary</dt>
          <dd className="text-right">{c.intake_summary ? "Shared with your professional" : "Not shared"}</dd>
        </div>
      </dl>

      {c.status === "awaiting_payment" && <PaymentPanel bookingId={c.id} amount={formatUgx(c.fee_ugx)} paymentsEnabled={env.paymentsEnabled} />}

      {c.status === "paid" && c.connection_id && (
        <section className="panel-inverse p-8">
          <h2 className="heading-lg">Your session room is open</h2>
          <p className="mt-3 leading-relaxed text-inverse-muted">
            Message {c.professional_name.split(" ")[0]} to agree a time, then talk by chat, voice or video call. They&apos;ll be notified of new messages.
          </p>
          <Link href={`/support/${c.connection_id}`} className="btn btn-primary mt-6">Open session room</Link>
        </section>
      )}

      {c.status === "completed" && (
        <section className="card p-6">
          <h2 className="heading-md">Session completed</h2>
          <p className="mt-3 text-sm leading-relaxed text-body">
            Your professional marked this session complete. You can book another session any time from{" "}
            <Link href="/care" className="link">Professional care</Link>.
          </p>
          {c.connection_id && <Link href={`/support/${c.connection_id}`} className="btn btn-secondary btn-sm mt-5">View conversation</Link>}
        </section>
      )}

      {c.status === "refunded" && <p className="text-sm text-body">This booking was refunded. The money goes back to the account you paid from.</p>}
    </div>
  );
}
