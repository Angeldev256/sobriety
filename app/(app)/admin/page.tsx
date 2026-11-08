import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarkPaidForm, PlatformFeeForm, RefundButton, ResourceModeration, ReviewForm } from "@/components/care/admin-forms";
import { ConsultationStatusLabel } from "@/components/care/consultation-status";
import { categoryLabel, formatUgx, professionLabel, specialtyLabel } from "@/lib/care/constants";
import type { Professional } from "@/lib/database.types";
import { formatPhone } from "@/lib/support";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin" };

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminPage() {
  const { supabase } = await requireUser();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound();

  const [{ data: pros }, { data: settings }, { data: resources }, { data: bookings }] = await Promise.all([
    supabase.from("professionals").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("app_settings").select("platform_fee_percent").maybeSingle(),
    supabase.from("resources").select("*").neq("status", "archived").order("created_at", { ascending: false }).limit(100),
    supabase.from("consultations").select("*").neq("status", "cancelled").order("created_at", { ascending: false }).limit(100),
  ]);
  const all = (pros ?? []) as Professional[];
  const pending = all.filter((p) => p.status === "pending");
  const others = all.filter((p) => p.status !== "pending");
  const paid = (bookings ?? []).filter((b) => b.status === "paid" || b.status === "completed");
  const revenue = paid.reduce((s, b) => s + b.platform_fee_ugx, 0);

  return (
    <div className="space-y-16">
      <header>
        <p className="eyebrow">Admin</p>
        <h1 className="display-lg mt-3">Professional care</h1>
        <p className="caption mt-3">
          {paid.length} paid sessions in the last 100 bookings · {formatUgx(revenue)} in platform fees
        </p>
      </header>

      <section aria-labelledby="review-h" className="space-y-6">
        <h2 id="review-h" className="heading-lg">Applications to verify ({pending.length})</h2>
        <p className="caption max-w-2xl">
          Check each registration number with the council named before verifying, for example the Uganda Medical and Dental Practitioners
          Council or the Allied Health Professionals Council register.
        </p>
        {pending.length === 0 && <p className="caption">Nothing waiting.</p>}
        <ul className="grid gap-6 lg:grid-cols-2">
          {pending.map((p) => (
            <li key={p.user_id} className="card space-y-4 p-6">
              <div>
                <h3 className="text-xl font-light">{p.full_name}</h3>
                <p className="caption">{professionLabel(p.profession)} · {p.email} · applied {date(p.created_at)}</p>
              </div>
              <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted">Registered with</dt><dd>{p.licence_body}</dd>
                <dt className="text-muted">Number</dt><dd className="font-mono">{p.licence_number}</dd>
                <dt className="text-muted">Works at</dt><dd>{p.institution ?? "—"}</dd>
                <dt className="text-muted">Fee</dt><dd>{formatUgx(p.fee_ugx)}</dd>
                <dt className="text-muted">Payout</dt><dd>{p.payout_phone ? formatPhone(p.payout_phone) : "—"}</dd>
                <dt className="text-muted">Areas</dt><dd>{p.specialties.map(specialtyLabel).join(", ")}</dd>
              </dl>
              <p className="text-sm leading-relaxed text-body">{p.bio}</p>
              <ReviewForm userId={p.user_id} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="fee-h" className="max-w-md space-y-4">
        <h2 id="fee-h" className="heading-lg">Platform fee</h2>
        <PlatformFeeForm current={Number(settings?.platform_fee_percent ?? 10)} />
      </section>

      <section aria-labelledby="bookings-h" className="space-y-6">
        <h2 id="bookings-h" className="heading-lg">Recent bookings</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr><th className="py-3 font-medium">Date</th><th className="font-medium">Patient → professional</th><th className="font-medium">Fee</th><th className="font-medium">Platform</th><th className="font-medium">Status</th><th className="font-medium" /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(bookings ?? []).map((b) => (
                <tr key={b.id} className="align-top">
                  <td className="py-4 whitespace-nowrap">{date(b.created_at)}</td>
                  <td className="py-4">
                    {b.patient_name} → {b.professional_name}
                    <span className="block font-mono text-xs text-muted">{b.tx_ref}{b.provider_transaction_id ? ` · ${b.payment_provider} ${b.provider_transaction_id}` : ""}</span>
                  </td>
                  <td className="py-4 whitespace-nowrap">{formatUgx(b.fee_ugx)}</td>
                  <td className="py-4 whitespace-nowrap">{formatUgx(b.platform_fee_ugx)}</td>
                  <td className="py-4"><ConsultationStatusLabel status={b.status} /></td>
                  <td className="py-4">
                    {b.status === "awaiting_payment" && <MarkPaidForm bookingId={b.id} />}
                    {(b.status === "paid" || b.status === "completed") && <RefundButton bookingId={b.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="res-h" className="space-y-6">
        <h2 id="res-h" className="heading-lg">Resources</h2>
        {(resources ?? []).length === 0 && <p className="caption">No resources yet. Add them from the Resources page.</p>}
        <ul className="divide-y divide-border border-y border-border">
          {(resources ?? []).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="font-semibold">{r.title}</p>
                <p className="caption">
                  {r.institution} · {categoryLabel(r.category)} · {r.status}
                  {r.file_path && <> · <a href={`/resources/${r.id}/download`} className="link">file</a></>}
                  {r.source_url && <> · <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="link">source</a></>}
                </p>
              </div>
              <ResourceModeration id={r.id} status={r.status} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pros-h" className="space-y-6">
        <h2 id="pros-h" className="heading-lg">All professionals</h2>
        <ul className="divide-y divide-border border-y border-border">
          {others.map((p) => (
            <li key={p.user_id} className="grid gap-4 py-5 md:grid-cols-[1fr_24rem]">
              <div>
                <p className="font-semibold">{p.full_name} <span className="caption">· {p.status}{p.accepting_patients ? "" : " · not accepting"}</span></p>
                <p className="caption">{professionLabel(p.profession)} · {p.licence_body} {p.licence_number} · {formatUgx(p.fee_ugx)}</p>
                {p.review_note && <p className="caption">Note: {p.review_note}</p>}
              </div>
              <ReviewForm userId={p.user_id} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
