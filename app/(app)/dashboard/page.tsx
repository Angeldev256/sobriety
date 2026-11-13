import type { Metadata } from "next";
import Link from "next/link";
import { AddictionForm } from "@/components/addiction-form";
import { AddTrackerDisclosure } from "@/components/add-tracker-disclosure";
import { Celebration } from "@/components/celebration";
import { MessageOfTheDay } from "@/components/message-of-the-day";
import { ProgressRing } from "@/components/progress-ring";
import { SobrietyTimer } from "@/components/sobriety-timer";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { addictionName } from "@/lib/constants";
import { getActiveAddictions, getCheckInDates, getProfile, messageOfTheDay, syncAchievements, todayFor } from "@/lib/data";
import { nextMilestone } from "@/lib/recovery/milestones";
import { currentCheckInStreak, longestSoberStreakDays } from "@/lib/recovery/streaks";
import { localTimeString, safeTimeZone, shiftDate, soberDuration } from "@/lib/recovery/time";
import { formatMoney, moneySaved } from "@/lib/recovery/money";
import { getViewer } from "@/lib/session";
import { peerOf, relationshipLabel } from "@/lib/support";
import { CallButtons } from "@/components/support/call-buttons";
import { Photo } from "@/components/photo";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Overview" };

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  const addictions = await getActiveAddictions(supabase, user.id);
  const firstName = profile.display_name?.split(" ")[0] ?? "friend";

  const viewer = await getViewer();
  const peers = (viewer?.connections ?? []).map((c) => peerOf(c, user.id));
  const preferred = peers.find((p) => p.isPreferred) ?? peers.find((p) => p.viewerIsMember);
  const supporting = peers.filter((p) => !p.viewerIsMember);

  if (addictions.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <Photo name="sunrise" sizes="(min-width: 640px) 576px, 100vw" priority className="mb-10 aspect-[16/8] w-full rounded-lg" />
        {supporting.length > 0 && (
          <Link href="/support" className="mb-10 flex items-center justify-between gap-4 rounded-lg bg-surface-2 p-6 hover:bg-surface-3">
            <span>
              <span className="block font-semibold">You&apos;re supporting {supporting.map((p) => p.peerName).join(", ")}</span>
              <span className="caption">Message or call them from your support circle.</span>
            </span>
            <span className="text-sm font-semibold text-link">Open</span>
          </Link>
        )}
        <p className="eyebrow">Welcome</p>
        <h1 className="display-lg mt-3">Let&apos;s begin, {firstName}.</h1>
        <p className="mt-4 text-lg leading-relaxed text-body">
          Starting is the bravest step. Tell us what you&apos;d like to track and when your sober time began — it can be right now.
        </p>
        <section className="mt-10 border-t border-border pt-10" aria-label="Start your tracker">
          <AddictionForm />
        </section>
      </div>
    );
  }

  const tz = safeTimeZone(profile.timezone);
  const today = todayFor(profile);
  const now = new Date();
  const [unseen, motd, dates, todaysRes, reminderRes, badgesRes] = await Promise.all([
    syncAchievements(supabase, user.id, profile, addictions),
    messageOfTheDay(supabase, user.id, today),
    getCheckInDates(supabase, user.id, shiftDate(today, -400)),
    supabase.from("check_ins").select("addiction_id").eq("user_id", user.id).eq("date", today),
    supabase.from("reminder_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_achievements").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const checkedIn = new Set((todaysRes.data ?? []).map((r) => r.addiction_id));
  const missing = addictions.filter((a) => !checkedIn.has(a.id));
  const streak = currentCheckInStreak(dates, today);
  const localTime = localTimeString(now, tz);
  const reminder = reminderRes.data;
  const pastReminderTime = reminder?.enabled && localTime >= reminder.reminder_time.slice(0, 5);
  const bestStreak = Math.max(
    ...addictions.map((a) => longestSoberStreakDays(a.longest_streak_seconds, soberDuration(new Date(a.start_date), now).totalSeconds)),
  );
  const dateLabel = now.toLocaleDateString("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric" });

  const saved = addictions.reduce((sum, a) => sum + moneySaved(a.daily_cost, soberDuration(new Date(a.start_date), now).totalSeconds), 0);
  const hasCost = addictions.some((a) => (a.daily_cost ?? 0) > 0);
  const stats: { label: string; value: string | number; unit: string }[] = [
    { label: "Check-in streak", value: streak, unit: streak === 1 ? "day" : "days" },
    { label: "Best sober streak", value: bestStreak, unit: bestStreak === 1 ? "day" : "days" },
    ...(hasCost ? [{ label: "Money saved", value: formatMoney(saved, profile.currency), unit: "" }] : []),
    { label: "Milestones earned", value: badgesRes.count ?? 0, unit: "" },
  ];
  const pushOff = !reminder?.push_enabled && !reminder?.email_enabled;

  return (
    <div className="space-y-12">
      <Celebration
        items={unseen.map((u) => ({ id: u.id, kind: u.achievement.kind, threshold: u.achievement.threshold, title: u.achievement.title, description: u.achievement.description }))}
      />

      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">{dateLabel}</p>
          <h1 className="display-lg mt-3">
            {greeting(Number(localTime.slice(0, 2)))}, {firstName}.
          </h1>
        </div>
        <InstallAppButton />
      </header>

      {params.password === "updated" && (
        <p role="status" className="border-l-2 border-primary py-1 pl-3 text-sm">Your password has been updated.</p>
      )}

      {missing.length > 0 && (
        <div role="status" className="flex flex-col gap-4 border-y border-border py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{pastReminderTime ? "It's past your reminder time." : "You haven't checked in today."}</p>
            <p className="caption mt-0.5">
              {addictions.length > 1 ? `Still to do: ${missing.map(addictionName).join(", ")}. ` : ""}It takes about a minute.
            </p>
          </div>
          <Link href={`/check-in?addiction=${missing[0].id}`} className="btn btn-primary btn-sm shrink-0">
            Check in
          </Link>
        </div>
      )}

      <div className="space-y-6">
        {addictions.map((a, i) => {
          const days = soberDuration(new Date(a.start_date), now).days;
          const m = nextMilestone(days);
          return (
            <section
              key={a.id}
              className="panel-inverse animate-rise grid gap-10 p-8 sm:p-12 md:grid-cols-[1fr_auto] md:items-center"
              style={{ animationDelay: `${i * 80}ms` }}
              aria-labelledby={`addiction-${a.id}`}
            >
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 id={`addiction-${a.id}`} className="text-xs font-medium tracking-[0.08em] text-inverse-muted uppercase">
                    {addictionName(a)}-free
                  </h2>
                  {checkedIn.has(a.id) && (
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-white">Checked in</span>
                  )}
                </div>
                <div className="mt-6">
                  <SobrietyTimer start={a.start_date} serverNow={now.getTime()} />
                </div>
                <p className="mt-6 text-sm text-inverse-muted">
                  Since {new Date(a.start_date).toLocaleString("en-US", { timeZone: tz, dateStyle: "long", timeStyle: "short" })}
                </p>
                {a.reason && (
                  <p className="mt-6 max-w-lg border-l border-white/30 pl-4 text-lg leading-snug font-light">
                    <span className="sr-only">Your reason: </span>
                    {a.reason}
                  </p>
                )}
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={`/check-in?addiction=${a.id}`} className="btn btn-primary">
                    {checkedIn.has(a.id) ? "Edit check-in" : "Check in"}
                  </Link>
                  <Link href={`/relapse/${a.id}`} className="btn btn-on-inverse">
                    I slipped
                  </Link>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 md:pr-4">
                <ProgressRing value={m.progress} tone="inverse" label={`Progress toward the ${m.next}-day milestone`}>
                  <span className="text-[2.75rem] leading-none font-light tabular-nums">{m.next}</span>
                  <span className="mt-1.5 text-xs text-inverse-muted">day milestone</span>
                </ProgressRing>
                <p className="text-sm text-inverse-muted">
                  {m.daysToGo} {m.daysToGo === 1 ? "day" : "days"} to go
                </p>
              </div>
            </section>
          );
        })}
      </div>

      <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border ${stats.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {stats.map((s, i) => (
          <div key={s.label} className={`bg-bg p-5 sm:p-6 ${stats.length === 3 && i === 2 ? "col-span-2 lg:col-span-1" : ""}`}>
            <dt className="caption">{s.label}</dt>
            <dd className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-light tabular-nums sm:text-4xl">{s.value}</span>
              {s.unit && <span className="text-sm text-muted">{s.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>

      {pushOff && (
        <div className="flex flex-col gap-4 rounded-lg bg-surface-2 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Want a gentle nudge each day?</p>
            <p className="caption mt-1">Turn on reminders by phone notification or email. Discreetly worded, and only if you haven&apos;t checked in.</p>
          </div>
          <Link href="/settings#notifications" className="btn btn-secondary btn-sm shrink-0">Set up reminders</Link>
        </div>
      )}

      {preferred ? (
        <section aria-labelledby="helper-h" className="flex flex-col gap-5 rounded-lg border border-border p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="helper-h" className="eyebrow">{preferred.isPreferred ? "Your preferred helper" : "Your support circle"}</h2>
            <p className="mt-2 text-xl font-light">
              {preferred.peerName} <span className="text-base text-muted">· {relationshipLabel(preferred.relationship)}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/support/${preferred.connectionId}`} className="btn btn-secondary btn-sm">Message</Link>
            <CallButtons connectionId={preferred.connectionId} peerId={preferred.peerId} peerName={preferred.peerName} phone={preferred.phone} size="sm" />
          </div>
        </section>
      ) : (
        <Link href="/support" className="group flex items-center justify-between gap-6 rounded-lg bg-surface-2 p-6 hover:bg-surface-3">
          <span>
            <span className="heading-lg block">Add someone you trust</span>
            <span className="caption mt-1 block">A counsellor, sponsor or family member you can message and call from the app.</span>
          </span>
          <span className="text-sm font-semibold text-link group-hover:underline">Set up</span>
        </Link>
      )}

      <Link href="/care" className="group flex items-center justify-between gap-6 rounded-lg border border-border p-6 hover:bg-surface-2">
        <span>
          <span className="heading-lg block">Having a hard moment?</span>
          <span className="caption mt-1 block">Talk it through with your recovery companion — right now, any time.</span>
        </span>
        <span className="text-sm font-semibold text-link group-hover:underline">Start talking</span>
      </Link>

      {motd && <MessageOfTheDay id={motd.id} body={motd.body} favorited={motd.favorited} />}

      <nav aria-label="More" className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:hidden">
        {[
          ["/goals", "Goals", "Small steps you're working on"],
          ["/milestones", "Milestones", "Badges you've earned"],
          ["/history", "Progress", "Calendar and trends"],
        ].map(([href, title, sub]) => (
          <Link key={href} href={href} className="bg-bg p-5 hover:bg-surface-2">
            <span className="block font-semibold">{title}</span>
            <span className="caption block">{sub}</span>
          </Link>
        ))}
      </nav>

      <AddTrackerDisclosure>
        <AddictionForm />
      </AddTrackerDisclosure>
    </div>
  );
}
