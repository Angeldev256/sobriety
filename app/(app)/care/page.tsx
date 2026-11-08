import type { Metadata } from "next";
import Link from "next/link";
import { CrisisPanel } from "@/components/care/crisis-panel";
import { ConsultationStatusLabel } from "@/components/care/consultation-status";
import { startIntake } from "@/app/(app)/care/actions";
import { formatUgx } from "@/lib/care/constants";
import { getProfile } from "@/lib/data";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Professional care" };

export default async function CarePage({ searchParams }: PageProps<"/care">) {
  const { supabase, user } = await requireUser();
  const params = await searchParams;

  const [profile, { data: intakes }, { data: bookings }, { data: pro }] = await Promise.all([
    getProfile(supabase, user.id),
    supabase.from("care_intakes").select("id, status, crisis, created_at, updated_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("consultations").select("*").eq("patient_id", user.id).neq("status", "cancelled").order("created_at", { ascending: false }).limit(20),
    supabase.from("professionals").select("status").eq("user_id", user.id).maybeSingle(),
  ]);
  const latest = intakes?.[0];
  const anyCrisis = intakes?.some((i) => i.crisis);

  return (
    <div className="space-y-16">
      <header className="max-w-2xl">
        <p className="eyebrow">Professional care</p>
        <h1 className="display-lg mt-3">Talk to someone trained to help.</h1>
        <p className="mt-4 text-lg leading-relaxed text-body">
          Start with a short, private conversation with our assistant. It will understand what you need and match you with a verified
          counsellor, psychologist or psychiatrist in Uganda. You pay only when you book a session.
        </p>
      </header>

      {params.limit === "1" && (
        <p role="alert" className="border-l-2 border-danger py-1 pl-3 text-sm text-danger">
          You&apos;ve started several conversations today. Please continue one of them, or try again tomorrow.
        </p>
      )}
      {params.ai === "off" && (
        <p role="alert" className="border-l-2 border-danger py-1 pl-3 text-sm text-danger">
          The assistant isn&apos;t available right now. Please try again later, or browse resources below.
        </p>
      )}
      {anyCrisis && <CrisisPanel country={profile.country} />}

      <div className="grid gap-16 lg:grid-cols-[1fr_22rem] lg:gap-20">
        <div className="space-y-14">
          <section aria-labelledby="start-h" className="panel-inverse p-8 sm:p-10">
            <h2 id="start-h" className="heading-xl">{latest ? "Continue where you left off" : "Find the right professional"}</h2>
            <p className="mt-3 max-w-lg leading-relaxed text-inverse-muted">
              About 5 minutes. You&apos;ll be asked what you&apos;re going through, how it affects you, and what kind of help you&apos;d like.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {latest && (
                <Link href={latest.status === "assessed" ? `/care/intake/${latest.id}/matches` : `/care/intake/${latest.id}`} className="btn btn-primary">
                  {latest.status === "assessed" ? "See my matches" : "Continue conversation"}
                </Link>
              )}
              <form action={startIntake}>
                <button type="submit" className={`btn ${latest ? "btn-on-inverse" : "btn-primary"}`} disabled={!env.careAiEnabled}>
                  {latest ? "Start a new conversation" : "Start the conversation"}
                </button>
              </form>
            </div>
          </section>

          <section aria-labelledby="sessions-h">
            <h2 id="sessions-h" className="heading-lg">Your sessions</h2>
            {bookings && bookings.length > 0 ? (
              <ul className="mt-6 divide-y divide-border border-y border-border">
                {bookings.map((b) => (
                  <li key={b.id}>
                    <Link href={`/care/consultations/${b.id}`} className="flex items-center justify-between gap-4 py-5 hover:bg-surface-2">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{b.professional_name}</span>
                        <span className="caption">
                          {formatUgx(b.fee_ugx)} · {new Date(b.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </span>
                      <ConsultationStatusLabel status={b.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="caption mt-4">No sessions yet. Once you book and pay, your session room appears here and in your Support circle.</p>
            )}
          </section>
        </div>

        <aside className="space-y-10">
          <section className="card p-6">
            <h2 className="heading-md">How it works</h2>
            <ol className="mt-5 space-y-4 text-sm leading-relaxed text-body">
              <li><span className="font-semibold text-fg">1. Talk.</span> Tell the assistant what&apos;s going on. It isn&apos;t a doctor and won&apos;t diagnose you.</li>
              <li><span className="font-semibold text-fg">2. Get matched.</span> We suggest up to three verified professionals and explain why.</li>
              <li><span className="font-semibold text-fg">3. Book and pay.</span> Each professional sets their fee. Pay by MTN or Airtel Mobile Money, or card.</li>
              <li><span className="font-semibold text-fg">4. Meet.</span> Chat, voice or video call in your private session room.</li>
            </ol>
          </section>
          <section className="card p-6">
            <h2 className="heading-md">Your privacy</h2>
            <p className="mt-3 text-sm leading-relaxed text-body">
              Your conversation with the assistant is processed by our AI provider, Anthropic, to reply and to find your match. The
              professional sees only a short summary, and only if you choose to share it when booking.
            </p>
          </section>
          <section className="card p-6">
            <h2 className="heading-md">Resources</h2>
            <p className="mt-3 text-sm leading-relaxed text-body">Guides and fact sheets from Butabika Hospital and other trusted institutions.</p>
            <Link href="/resources" className="btn btn-secondary btn-sm mt-5">Browse resources</Link>
          </section>
          <p className="caption">
            Are you a licensed mental health professional?{" "}
            <Link href="/pro" className="link">{pro ? "Go to your professional page" : "Apply to join"}</Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
