import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { BreathingExercise } from "@/components/toolkit/breathing-exercise";
import { Grounding } from "@/components/toolkit/grounding";
import { UrgeTimer } from "@/components/toolkit/urge-timer";
import { addictionName } from "@/lib/constants";
import { getActiveAddictions } from "@/lib/data";
import { getViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Coping toolkit",
  description: "Free tools for hard moments: guided breathing, an urge timer and grounding. No account needed.",
};

const IDEAS = [
  "Go for a ten-minute walk",
  "Take a hot or cold shower",
  "Call or text someone you trust",
  "Eat something and drink water",
  "Put on a song you love",
  "Write down what you're feeling",
  "Leave the place you're in",
  "Do something with your hands",
];

function Tool({ id, index, title, children }: { id: string; index: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20 border-t border-border py-14 md:py-20">
      <p className="text-sm text-muted tabular-nums">{index}</p>
      <h2 id={`${id}-h`} className="display-lg mt-2">{title}</h2>
      <div className="mt-10">{children}</div>
    </section>
  );
}

export default async function ToolkitPage() {
  const viewer = await getViewer();
  const reasons = viewer
    ? (await getActiveAddictions(await createClient(), viewer.user.id)).filter((a) => a.reason?.trim())
    : [];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-10 pb-16 sm:px-6 md:pt-16">
      <header className="max-w-2xl">
        <p className="eyebrow">Coping toolkit · Free for everyone</p>
        <h1 className="display-xl mt-4">For the hard moments.</h1>
        <p className="mt-5 text-lg leading-relaxed text-body">
          Cravings and difficult feelings pass. These tools can help you ride them out — no account needed.
        </p>
      </header>

      <nav aria-label="Tools" className="sticky top-14 z-20 -mx-5 mt-10 overflow-x-auto bg-bg/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <ul className="flex gap-2 whitespace-nowrap">
          {[
            ["#urge", "Urge timer"],
            ["#breathe", "Breathing"],
            ["#ground", "Grounding"],
            ["#ideas", "Quick ideas"],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className="chip h-9">{label}</a>
            </li>
          ))}
        </ul>
      </nav>

      {reasons.length > 0 && (
        <section aria-labelledby="reasons-h" className="panel-inverse mt-8 p-8 sm:p-10">
          <h2 id="reasons-h" className="text-xs font-medium tracking-[0.08em] text-inverse-muted uppercase">Remember why you started</h2>
          <ul className="mt-5 space-y-5">
            {reasons.map((a) => (
              <li key={a.id}>
                <p className="text-2xl leading-snug font-light">{a.reason}</p>
                <p className="mt-1 text-sm text-inverse-muted">{addictionName(a)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Tool id="urge" index="01" title="Ride out an urge">
        <UrgeTimer signedIn={Boolean(viewer)} />
      </Tool>
      <Tool id="breathe" index="02" title="Breathe">
        <BreathingExercise />
      </Tool>
      <Tool id="ground" index="03" title="Ground yourself">
        <Grounding />
      </Tool>
      <Tool id="ideas" index="04" title="Ten minutes, something else">
        <ul className="grid gap-x-10 sm:grid-cols-2">
          {IDEAS.map((idea) => (
            <li key={idea} className="border-b border-border py-4 text-lg font-light">{idea}</li>
          ))}
        </ul>
      </Tool>

      <section className="rounded-lg bg-surface-2 p-8 sm:p-12">
        <h2 className="heading-xl">Still struggling? Talk to someone.</h2>
        <p className="mt-3 max-w-xl leading-relaxed text-body">Free, confidential help lines are available day and night. Reaching out is a sign of strength.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/help" className="btn btn-primary">Find a help line</Link>
          {!viewer && <Link href="/login?mode=signup&next=/dashboard" className="btn btn-secondary">Start tracking privately</Link>}
        </div>
      </section>
    </main>
  );
}
