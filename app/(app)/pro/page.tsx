import type { Metadata } from "next";
import Link from "next/link";
import { ConsultationStatusLabel } from "@/components/care/consultation-status";
import { ProfessionalForm } from "@/components/care/professional-form";
import { formatUgx } from "@/lib/care/constants";
import { getProfile } from "@/lib/data";
import type { Professional, ProfessionalStatus } from "@/lib/database.types";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "For professionals" };

const STATUS: Record<ProfessionalStatus, { title: string; body: string }> = {
  pending: { title: "Your application is being reviewed", body: "We check every registration before a professional can be matched with patients. We'll notify you when it's done." },
  verified: { title: "You're verified", body: "Patients can be matched with you while you're accepting new patients." },
  rejected: { title: "We couldn't verify your application", body: "Please check your registration details below and save them to ask for another review." },
  suspended: { title: "Your profile is suspended", body: "You won't appear in matches. Please contact us if you think this is a mistake." },
};

export default async function ProPage() {
  const { supabase, user } = await requireUser();
  const [{ data }, profile, { data: bookings }] = await Promise.all([
    supabase.from("professionals").select("*").eq("user_id", user.id).maybeSingle(),
    getProfile(supabase, user.id),
    supabase.from("consultations").select("*").eq("professional_id", user.id).in("status", ["paid", "completed", "refunded"]).order("created_at", { ascending: false }).limit(50),
  ]);
  const pro = data as Professional | null;
  const status = pro ? STATUS[pro.status] : null;
  const earnings = (bookings ?? [])
    .filter((b) => b.status !== "refunded")
    .reduce((sum, b) => sum + b.fee_ugx - b.platform_fee_ugx, 0);

  return (
    <div className="space-y-16">
      <header className="max-w-2xl">
        <p className="eyebrow">For professionals</p>
        <h1 className="display-lg mt-3">{pro ? `Welcome, ${pro.full_name.split(" ")[0]}.` : "Help people recover, from anywhere."}</h1>
        {!pro && (
          <p className="mt-4 text-lg leading-relaxed text-body">
            Licensed counsellors, psychologists, psychiatrists, psychiatric nurses and social workers can apply to be matched with people
            looking for addiction support. You set your own fee and meet patients by chat, voice or video.
          </p>
        )}
      </header>

      {pro && status && (
        <section role="status" className={`max-w-2xl rounded-lg p-6 ${pro.status === "verified" ? "bg-primary-soft" : "card"}`}>
          <h2 className="heading-md">{status.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-body">{status.body}</p>
          {pro.review_note && <p className="mt-3 text-sm"><span className="font-semibold">Note from our team:</span> {pro.review_note}</p>}
        </section>
      )}

      {pro && (
        <section aria-labelledby="bookings-h" className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="bookings-h" className="heading-lg">Your patients</h2>
            <p className="caption">Earned after platform fees: <span className="font-semibold text-fg">{formatUgx(earnings)}</span></p>
          </div>
          {bookings && bookings.length > 0 ? (
            <ul className="divide-y divide-border border-y border-border">
              {bookings.map((b) => (
                <li key={b.id}>
                  <Link href={`/pro/consultations/${b.id}`} className="flex items-center justify-between gap-4 py-5 hover:bg-surface-2">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{b.patient_name}</span>
                      <span className="caption">
                        Paid {b.paid_at ? new Date(b.paid_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"} ·{" "}
                        {formatUgx(b.fee_ugx - b.platform_fee_ugx)} to you
                      </span>
                    </span>
                    <ConsultationStatusLabel status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="caption">No patients yet. Paid bookings appear here, and you&apos;ll get a notification for each one.</p>
          )}
        </section>
      )}

      <section aria-labelledby="profile-h" className="max-w-3xl space-y-8">
        <h2 id="profile-h" className="heading-lg">{pro ? "Your profile" : "Apply"}</h2>
        <ProfessionalForm existing={pro} defaultName={profile.display_name ?? ""} />
      </section>
    </div>
  );
}
