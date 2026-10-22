import Link from "next/link";
import { Photo } from "@/components/photo";
import { SoberCalculator } from "@/components/sober-calculator";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { publicMessageOfTheDay } from "@/lib/data";
import { localDateString } from "@/lib/recovery/time";
import { getViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const OPEN_TOOLS = [
  { href: "/toolkit#urge", title: "Urge timer", body: "Ride out a craving, minute by minute." },
  { href: "/toolkit#breathe", title: "Guided breathing", body: "Slow your breath, calm your body." },
  { href: "/toolkit#ground", title: "Grounding", body: "Come back to the present in five steps." },
  { href: "/help", title: "Help lines", body: "Free, confidential support, day and night." },
];

const WHEN_READY = [
  { title: "A sober-time counter", body: "Every day, hour and minute — for one addiction or several, with money saved." },
  { title: "One-minute check-ins", body: "Mood, cravings and triggers, so patterns become visible over time." },
  { title: "Your support circle", body: "Invite a counsellor, sponsor or family member. Message them and talk by voice or video call — or on WhatsApp." },
  { title: "Gentle reminders", body: "By email or phone notification, at a time you choose. Discreet wording, always." },
  { title: "Milestones worth marking", body: "From day one to year one, each milestone is celebrated — and you'll get a note." },
  { title: "Money saved, in shillings", body: "See what you've kept in your pocket — school fees, rent, savings — every day you stay free." },
  { title: "Kindness after a slip", body: "Log it without shame. Your history and longest streak always stay with you." },
];

export default async function Home({ searchParams }: PageProps<"/">) {
  const [viewer, params, supabase] = await Promise.all([getViewer(), searchParams, createClient()]);
  const message = await publicMessageOfTheDay(supabase, localDateString(new Date(), "UTC"));
  const start = viewer ? { href: "/dashboard", label: "Open your dashboard" } : { href: "/login?mode=signup&next=/dashboard", label: "Start tracking — it's free" };

  return (
    <main className="flex-1">
      {params.deleted === "1" && (
        <p role="status" className="border-b border-border px-6 py-4 text-center text-sm">
          Your account and all of your data have been permanently deleted. We wish you well.
        </p>
      )}

      <section className="bg-black text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-14 pb-20 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pt-24 md:pb-28">
          <div>
          <p className="text-xs font-medium tracking-[0.08em] text-white/60 uppercase">Free · Private · Made for Uganda</p>
          <h1 className="display-xl mt-6 max-w-3xl">Recovery, one day at a time.</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
            Support for anyone recovering from alcohol, betting, drugs like mairungi, tobacco or anything else. Use the coping tools
            right now — and when you&apos;re ready, track your progress and stay close to the people supporting you.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href={start.href} className="btn btn-primary">{start.label}</Link>
            <Link href="/toolkit" className="btn btn-on-inverse">I need help with a craving</Link>
          </div>
          <div className="mt-4">
            <InstallAppButton tone="inverse" className="btn-sm" />
          </div>
          </div>
          <Photo name="sunrise" sizes="(min-width: 768px) 520px, 100vw" priority className="aspect-[4/3] w-full rounded-lg" />
        </div>
      </section>

      <section aria-labelledby="now-h" className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-24">
        <p className="eyebrow">No account needed</p>
        <h2 id="now-h" className="display-lg mt-3 max-w-2xl">Use it right now.</h2>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OPEN_TOOLS.map((t) => (
            <li key={t.title}>
              <Link href={t.href} className="card group flex h-full flex-col justify-between p-6 transition-colors hover:bg-surface-3">
                <span>
                  <span className="heading-lg block">{t.title}</span>
                  <span className="mt-2 block text-sm leading-relaxed text-body">{t.body}</span>
                </span>
                <span className="mt-8 text-sm font-semibold text-link group-hover:underline">Open</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {message && (
        <section aria-labelledby="reflection-h" className="border-y border-border">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-16 sm:px-6 md:grid-cols-[12rem_1fr] md:py-20">
            <h2 id="reflection-h" className="eyebrow pt-2">Today&apos;s reflection</h2>
            <blockquote className="heading-xl max-w-3xl text-balance">{message.body}</blockquote>
          </div>
        </section>
      )}

      <section aria-labelledby="calc-h" className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-24">
        <p className="eyebrow">Sober time calculator</p>
        <h2 id="calc-h" className="display-lg mt-3 mb-12 max-w-2xl">See how far you&apos;ve come.</h2>
        <SoberCalculator />
      </section>

      <section aria-labelledby="ready-h" className="bg-surface-2">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-24">
          <p className="eyebrow">With a free account</p>
          <h2 id="ready-h" className="display-lg mt-3 max-w-2xl">When you&apos;re ready to track.</h2>
          <ol className="mt-14 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {WHEN_READY.map((f, i) => (
              <li key={f.title} className="border-t border-fg pt-6">
                <span className="text-sm text-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="heading-lg mt-3">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-body">{f.body}</p>
              </li>
            ))}
          </ol>
          {!viewer && (
            <div className="mt-14 flex flex-col gap-3 sm:flex-row">
              <Link href="/login?mode=signup&next=/dashboard" className="btn btn-primary">Create free account</Link>
              <Link href="/login" className="btn btn-secondary">I already have an account</Link>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="circle-h" className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-6 md:grid-cols-2 md:py-24">
        <Photo name="friends" sizes="(min-width: 768px) 560px, 100vw" className="order-last aspect-[4/3] w-full rounded-lg md:order-first" />
        <div>
          <p className="eyebrow">Support circle</p>
          <h2 id="circle-h" className="display-lg mt-3">Someone in your corner.</h2>
          <p className="mt-5 text-lg leading-relaxed text-body">
            Recovery is easier together. Add the people who support you — a counsellor, a sponsor, a faith leader, family. When a
            craving hits, call them by video or voice in one tap, or send a message.
          </p>
          <Link href={viewer ? "/support" : start.href} className="btn btn-primary mt-8">{viewer ? "Open your support circle" : "Build your circle — free"}</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-6 md:grid-cols-2 md:py-24">
        <div>
        <h2 className="display-lg">Your privacy comes first.</h2>
        <div className="mt-6 space-y-4 text-lg leading-relaxed text-body">
          <p>Only you can see what you track. We never sell or share your data, and you can export or permanently delete it any time.</p>
          <p>Notifications are worded discreetly, so nothing personal shows on your lock screen.</p>
        </div>
        </div>
        <Photo name="handsComfort" sizes="(min-width: 768px) 560px, 100vw" className="aspect-[4/3] w-full rounded-lg" />
      </section>
    </main>
  );
}
