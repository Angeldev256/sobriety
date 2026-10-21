import type { Metadata } from "next";
import Link from "next/link";
import { HELPLINES, helplinesFor } from "@/lib/helplines";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Get help now" };

const COPING = [
  "Breathe slowly: in for four, hold for four, out for six. Repeat five times.",
  "Delay for fifteen minutes. Set a timer — most cravings peak and fade.",
  "Change your surroundings: step outside, walk, or take a shower.",
  "Call or text someone you trust and tell them how you feel.",
  "Drink a glass of water and eat something.",
  "Remind yourself why you started. Read your goals.",
];

const tel = (s: string) => `tel:${s.replace(/[^\d+]/g, "")}`;

export default async function HelpPage({ searchParams }: PageProps<"/help">) {
  const params = await searchParams;
  let code = typeof params.country === "string" ? params.country : null;
  if (!code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: profile } = await supabase.from("profiles").select("country").eq("id", data.user.id).maybeSingle();
      code = profile?.country ?? null;
    }
  }
  const country = helplinesFor(code ?? "US");

  return (
    <main className="flex-1">

      <div className="mx-auto max-w-3xl space-y-16 px-6 py-14 md:py-20">
        <div>
          <h1 className="display-lg">Get help now</h1>
          <p className="mt-4 text-lg text-body">You deserve support. Reaching out is a sign of strength.</p>
        </div>

        <div role="alert" className="border-l-2 border-danger pl-5">
          <p className="text-lg font-semibold">If you or someone else is in immediate danger, call {country.emergency}.</p>
          <p className="mt-2 text-body">
            Signs of overdose or alcohol poisoning — unresponsive, slow or no breathing, blue lips, seizures — are a medical emergency.
          </p>
        </div>

        <section aria-labelledby="lines-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="lines-heading" className="heading-xl">Support lines</h2>
            <nav aria-label="Choose country" className="flex flex-wrap gap-2">
              {HELPLINES.map((c) => (
                <Link
                  key={c.code}
                  href={`/help?country=${c.code}`}
                  aria-current={c.code === country.code ? "page" : undefined}
                  className={`chip h-9 px-3.5 text-xs ${c.code === country.code ? "chip-on" : ""}`}
                >
                  {c.name}
                </Link>
              ))}
            </nav>
          </div>

          <ul className="mt-8 border-t border-border">
            {country.lines.map((l) => (
              <li key={l.name} className="flex flex-col gap-4 border-b border-border py-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold">{l.name}</h3>
                  <p className="caption mt-1">{l.description}</p>
                  {l.text && <p className="mt-2 text-sm">{/^\d+$/.test(l.text) ? `Text ${l.text}` : l.text}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {l.phone && <a href={tel(l.phone)} className="btn btn-primary btn-sm">Call {l.phone}</a>}
                  {l.url && (
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                      Website<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {country.code !== "OTHER" && (
            <p className="caption mt-6">
              Outside {country.name}? <Link href="/help?country=OTHER" className="link">Find a helpline in your country</Link>.
            </p>
          )}
        </section>

        <section aria-labelledby="coping-heading">
          <h2 id="coping-heading" className="heading-xl">Riding out a craving</h2>
          <ol className="mt-8 space-y-5">
            {COPING.map((c, i) => (
              <li key={c} className="grid grid-cols-[2.5rem_1fr] text-lg leading-relaxed">
                <span className="text-sm leading-[1.9] text-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                {c}
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="disclaimer-heading" className="border-t border-border pt-8 text-sm leading-relaxed text-muted">
          <h2 id="disclaimer-heading" className="font-semibold text-fg">Disclaimer</h2>
          <p className="mt-2">
            Sobriety Tracker is a free self-help tool. It does not provide medical advice, diagnosis or treatment, and is not a substitute
            for professional care. Stopping some substances suddenly (such as alcohol or benzodiazepines) can be dangerous —
            please talk to a doctor. Help line details can change; check the official website if a number doesn&apos;t work.
          </p>
        </section>
      </div>
    </main>
  );
}
