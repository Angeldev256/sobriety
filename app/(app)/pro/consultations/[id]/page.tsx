import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompleteButton } from "@/components/care/complete-button";
import { ConsultationStatusLabel } from "@/components/care/consultation-status";
import { formatUgx } from "@/lib/care/constants";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Patient session" };

export default async function ProConsultationPage({ params }: PageProps<"/pro/consultations/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase, user } = await requireUser();
  const { data: c } = await supabase.from("consultations").select("*").eq("id", id).eq("professional_id", user.id).maybeSingle();
  // Unpaid bookings stay private to the patient.
  if (!c || c.status === "awaiting_payment" || c.status === "cancelled") notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header className="space-y-3">
        <Link href="/pro" className="text-sm text-muted hover:text-fg">← Your patients</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="display-lg">{c.patient_name}</h1>
          <ConsultationStatusLabel status={c.status} />
        </div>
        <p className="caption">
          {formatUgx(c.fee_ugx)} paid · {formatUgx(c.fee_ugx - c.platform_fee_ugx)} to you after the platform fee
        </p>
      </header>

      <section className="card p-6 sm:p-8">
        <h2 className="heading-md">Intake summary</h2>
        {c.intake_summary ? (
          <>
            <p className="mt-4 leading-relaxed whitespace-pre-wrap">{c.intake_summary}</p>
            <p className="caption mt-4">Written by the AI assistant from the patient&apos;s own words. Please confirm the details with them.</p>
          </>
        ) : (
          <p className="mt-3 text-sm text-body">The patient chose not to share their intake summary.</p>
        )}
      </section>

      {c.status === "paid" && (
        <div className="flex flex-wrap gap-3">
          {c.connection_id && <Link href={`/support/${c.connection_id}`} className="btn btn-primary">Open session room</Link>}
          <CompleteButton bookingId={c.id} patientName={c.patient_name} />
        </div>
      )}
      {c.status === "completed" && c.connection_id && (
        <Link href={`/support/${c.connection_id}`} className="btn btn-secondary">View conversation</Link>
      )}
    </div>
  );
}
