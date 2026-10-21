import type { Metadata } from "next";
import Link from "next/link";
import { CheckInCalendar } from "@/components/history/check-in-calendar";
import { TrendChart } from "@/components/history/trend-chart";
import { addictionName } from "@/lib/constants";
import { getActiveAddictions, getProfile, todayFor } from "@/lib/data";
import { currentCheckInStreak, longestCheckInStreak, longestSoberStreakDays, totalSoberDays } from "@/lib/recovery/streaks";
import { safeTimeZone, shiftDate, soberDuration } from "@/lib/recovery/time";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Progress history" };

export default async function HistoryPage({ searchParams }: PageProps<"/history">) {
  const { supabase, user } = await requireUser();
  const [profile, addictions, params] = await Promise.all([getProfile(supabase, user.id), getActiveAddictions(supabase, user.id), searchParams]);

  if (addictions.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <h1 className="display-lg">Your history will appear here.</h1>
        <p className="mt-4 text-lg text-body">Start tracking and check in daily to watch your progress grow.</p>
        <Link href="/dashboard" className="btn btn-primary mt-10">Start tracking</Link>
      </div>
    );
  }

  const selected = addictions.find((a) => a.id === params.addiction) ?? addictions[0];
  const today = todayFor(profile);
  const month = typeof params.month === "string" && /^\d{4}-\d{2}$/.test(params.month) ? params.month : today.slice(0, 7);
  const view = params.view === "sober" ? "sober" : "mood";

  const [checkInsRes, relapsesRes] = await Promise.all([
    supabase
      .from("check_ins")
      .select("date, mood, craving_level, stayed_sober, triggers")
      .eq("user_id", user.id)
      .eq("addiction_id", selected.id)
      .gte("date", shiftDate(today, -730))
      .order("date"),
    supabase.from("relapses").select("*").eq("user_id", user.id).eq("addiction_id", selected.id).order("occurred_at", { ascending: false }),
  ]);
  const checkIns = checkInsRes.data ?? [];
  const relapses = relapsesRes.data ?? [];
  const dates = checkIns.map((c) => c.date);

  const current = soberDuration(new Date(selected.start_date));
  const stats = [
    { label: "Current streak", value: current.days, unit: "days" },
    { label: "Longest streak", value: longestSoberStreakDays(selected.longest_streak_seconds, current.totalSeconds), unit: "days" },
    { label: "Total sober days", value: totalSoberDays(current.totalSeconds, relapses), unit: "days" },
    { label: "Check-in streak", value: currentCheckInStreak(dates, today), unit: `best ${longestCheckInStreak(dates)}` },
  ];

  const last30 = checkIns.filter((c) => c.date > shiftDate(today, -30));
  const triggerCounts = new Map<string, number>();
  last30.forEach((c) => c.triggers.forEach((t) => triggerCounts.set(t, (triggerCounts.get(t) ?? 0) + 1)));
  const topTriggers = [...triggerCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const tz = safeTimeZone(profile.timezone);

  const qs = (over: Record<string, string>) => new URLSearchParams({ addiction: selected.id, month, view, ...over }).toString();

  return (
    <div className="space-y-16">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">History</p>
          <h1 className="display-lg mt-3">Look how far you&apos;ve come.</h1>
        </div>
      {addictions.length > 1 && (
        <nav aria-label="Choose tracker" className="flex flex-wrap gap-2">
          {addictions.map((a) => (
            <Link key={a.id} href={`/history?${qs({ addiction: a.id })}`} aria-current={a.id === selected.id ? "page" : undefined} className={`chip ${a.id === selected.id ? "chip-on" : ""}`}>
              {addictionName(a)}
            </Link>
          ))}
        </nav>
      )}
      </header>

      <dl className="grid grid-cols-2 border-y border-border md:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`py-7 ${i % 2 === 1 ? "border-l border-border pl-6" : ""} ${i >= 2 ? "border-t border-border md:border-t-0" : ""} ${
              i > 0 ? "md:border-l md:pl-8" : ""
            }`}
          >
            <dt className="caption">{s.label}</dt>
            <dd className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-light tabular-nums">{s.value}</span>
              <span className="text-sm text-muted">{s.unit}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-16 lg:grid-cols-2 lg:gap-12">
      <section aria-labelledby="cal-heading">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-fg pb-3">
          <h2 id="cal-heading" className="heading-md">Check-ins</h2>
          <div className="flex gap-1" role="group" aria-label="Color days by">
            <Link href={`/history?${qs({ view: "mood" })}`} aria-current={view === "mood" ? "true" : undefined} className={`chip h-8 px-3 text-xs ${view === "mood" ? "chip-on" : "border-transparent"}`}>
              Mood
            </Link>
            <Link href={`/history?${qs({ view: "sober" })}`} aria-current={view === "sober" ? "true" : undefined} className={`chip h-8 px-3 text-xs ${view === "sober" ? "chip-on" : "border-transparent"}`}>
              Sober
            </Link>
          </div>
        </div>
        <CheckInCalendar
          month={month}
          today={today}
          view={view}
          checkIns={checkIns}
          prevHref={`/history?${qs({ month: shiftMonth(month, -1) })}`}
          nextHref={month < today.slice(0, 7) ? `/history?${qs({ month: shiftMonth(month, 1) })}` : null}
        />
      </section>

      <section aria-labelledby="trend-heading">
        <div className="mb-8 border-b border-fg pb-3">
          <h2 id="trend-heading" className="heading-md">Mood and cravings · 30 days</h2>
        </div>
        {last30.length < 2 ? (
          <p className="py-16 text-body">Check in a few more days to see your trends here.</p>
        ) : (
          <TrendChart data={last30.map((c) => ({ date: c.date, mood: c.mood, craving: c.craving_level }))} />
        )}
        <p className="caption mt-6">Higher mood and lower cravings over time are signs of healing. Bumps are normal.</p>
      </section>
      </div>

      <div className="grid gap-16 lg:grid-cols-2 lg:gap-12">
        <section aria-labelledby="triggers-heading">
          <h2 id="triggers-heading" className="heading-md border-b border-fg pb-3">Common triggers · 30 days</h2>
          {topTriggers.length === 0 ? (
            <p className="py-6 text-body">No triggers logged recently.</p>
          ) : (
            <ul>
              {topTriggers.map(([t, n]) => (
                <li key={t} className="flex items-center gap-4 border-b border-border py-4">
                  <span className="w-36 shrink-0">{t}</span>
                  <span className="h-[3px] flex-1 rounded-full bg-surface-3">
                    <span className="block h-full rounded-full bg-fg" style={{ width: `${(n / topTriggers[0][1]) * 100}%` }} />
                  </span>
                  <span className="w-8 text-right text-sm text-muted tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="relapse-heading">
          <h2 id="relapse-heading" className="heading-md border-b border-fg pb-3">Slips and restarts</h2>
          {relapses.length === 0 ? (
            <p className="py-6 text-body">None logged. If one happens, it&apos;s part of the journey — not the end of it.</p>
          ) : (
            <ul>
              {relapses.map((r) => (
                <li key={r.id} className="border-b border-border py-4">
                  <p className="flex justify-between gap-4">
                    <span>{new Date(r.occurred_at).toLocaleDateString("en-US", { timeZone: tz, dateStyle: "medium" })}</span>
                    <span className="text-sm text-muted tabular-nums">after {Math.floor(r.streak_seconds / 86400)} days</span>
                  </p>
                  <p className="caption mt-1">{r.counter_reset ? "Counter restarted" : "Counter kept"}{r.note ? ` — ${r.note}` : ""}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
