import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookForm } from "@/components/care/book-form";
import { CrisisPanel } from "@/components/care/crisis-panel";
import { formatUgx, modeLabel, professionLabel } from "@/lib/care/constants";
import { needsFromAssessment } from "@/lib/care/intake-ai";
import { rankProfessionals } from "@/lib/care/matching";
import { getProfile } from "@/lib/data";
import { env } from "@/lib/env";
import { initials } from "@/lib/support";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your matches" };

export default async function MatchesPage({ params }: PageProps<"/care/intake/[id]/matches">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase, user } = await requireUser();
  const [{ data: intake }, profile, { data: pros }, { data: settings }] = await Promise.all([
    supabase.from("care_intakes").select("id, status, assessment, crisis").eq("id", id).eq("user_id", user.id).maybeSingle(),
    getProfile(supabase, user.id),
    supabase.rpc("list_professionals"),
    supabase.from("app_settings").select("platform_fee_percent").maybeSingle(),
  ]);
  if (!intake) notFound();
  const needs = needsFromAssessment(intake.assessment);
  if (!needs) redirect(`/care/intake/${id}`);

  const matches = rankProfessionals(needs, pros ?? []);
  const pct = Number(settings?.platform_fee_percent ?? 0);

  return (
    <div className="space-y-14">
      <header className="max-w-2xl space-y-3">
        <Link href={`/care/intake/${id}`} className="text-sm text-muted hover:text-fg">← Back to the conversation</Link>
        <p className="eyebrow">Your matches</p>
        <h1 className="display-lg">People who can help with what you shared.</h1>
      </header>

      {intake.crisis && <CrisisPanel country={profile.country} />}

      <section aria-labelledby="needs-h" className="card max-w-3xl p-6 sm:p-8">
        <h2 id="needs-h" className="heading-md">What we understood</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {needs.concerns.map((c) => (
            <li key={c} className="rounded-full bg-surface px-3 py-1 text-sm">{c}</li>
          ))}
        </ul>
        <p className="mt-5 text-sm leading-relaxed text-body">{needs.summary}</p>
        <p className="caption mt-4">
          Not quite right? <Link href={`/care/intake/${id}`} className="link">Tell the assistant more</Link> and match again.
        </p>
      </section>

      {matches.length === 0 ? (
        <section className="max-w-2xl space-y-4">
          <h2 className="heading-lg">No professionals are available right now.</h2>
          <p className="leading-relaxed text-body">
            We&apos;re still adding verified professionals. In the meantime, the free helplines and Butabika Hospital&apos;s alcohol and drug unit can
            help. Check back soon.
          </p>
          <Link href="/help" className="btn btn-secondary">See help lines</Link>
        </section>
      ) : (
        <ol className="grid gap-6 lg:grid-cols-3">
          {matches.map((m, i) => {
            const p = m.professional;
            return (
              <li key={p.user_id} className={`flex flex-col rounded-lg border p-6 ${i === 0 ? "border-2 border-primary" : "border-border"}`}>
                {i === 0 && <p className="eyebrow mb-4 text-primary">Best match</p>}
                <div className="flex items-center gap-4">
                  <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-2 font-light">
                    {initials(p.full_name)}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-light">{p.full_name}</h2>
                    <p className="caption">{professionLabel(p.profession)}{p.institution ? ` · ${p.institution}` : ""}</p>
                  </div>
                </div>
                <p className="caption mt-3">Verified with {p.licence_body}</p>

                {m.reasons.length > 0 && (
                  <ul className="mt-5 space-y-1.5 text-sm">
                    {m.reasons.map((r) => (
                      <li key={r} className="flex gap-2"><span aria-hidden className="text-primary">✓</span>{r}</li>
                    ))}
                  </ul>
                )}
                {m.warnings.length > 0 && (
                  <ul className="mt-3 space-y-1.5 text-sm text-muted">
                    {m.warnings.map((w) => <li key={w}>· {w}</li>)}
                  </ul>
                )}

                <p className="mt-5 line-clamp-5 text-sm leading-relaxed text-body">{p.bio}</p>
                <p className="caption mt-4">{p.languages.join(", ")} · {p.session_modes.map(modeLabel).join(", ")}</p>

                <div className="mt-auto pt-6">
                  <p className="text-2xl font-light">{formatUgx(p.fee_ugx)}<span className="caption"> per session</span></p>
                  <BookForm
                    professionalId={p.user_id}
                    professionalName={p.full_name}
                    intakeId={id}
                    paymentsEnabled={env.paymentsEnabled}
                    primary={i === 0}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <p className="caption max-w-2xl">
        Fees are set by each professional and include a {pct}% platform fee that keeps Sobriety Tracker running. Professionals are
        checked against their registration before they appear here. Matches are suggestions; you&apos;re free to choose anyone.
      </p>
    </div>
  );
}
