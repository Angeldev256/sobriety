import type { Metadata } from "next";
import { ProgressRing } from "@/components/progress-ring";
import { addictionName } from "@/lib/constants";
import type { Achievement } from "@/lib/database.types";
import { getActiveAddictions, getProfile, syncAchievements } from "@/lib/data";
import { nextMilestone } from "@/lib/recovery/milestones";
import { safeTimeZone, soberDays } from "@/lib/recovery/time";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Milestones" };

const GROUPS: { kind: Achievement["kind"]; heading: string; unit: (n: number) => string }[] = [
  { kind: "sober_days", heading: "Sober time", unit: (n) => (n === 1 ? "day" : "days") },
  { kind: "checkin_streak", heading: "Check-in streaks", unit: () => "days in a row" },
  { kind: "goals_completed", heading: "Goals", unit: (n) => (n === 1 ? "goal" : "goals") },
];

export default async function MilestonesPage() {
  const { supabase, user } = await requireUser();
  const [profile, addictions] = await Promise.all([getProfile(supabase, user.id), getActiveAddictions(supabase, user.id)]);
  await syncAchievements(supabase, user.id, profile, addictions);

  const [defsRes, earnedRes] = await Promise.all([
    supabase.from("achievements").select("*").order("sort_order"),
    supabase.from("user_achievements").select("*").eq("user_id", user.id),
  ]);
  const defs = defsRes.data ?? [];
  const earned = earnedRes.data ?? [];
  const tz = safeTimeZone(profile.timezone);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-20">
      <header>
        <p className="eyebrow">Milestones</p>
        <h1 className="display-lg mt-3">
          {earned.length} earned. <span className="text-muted">Each one is real effort.</span>
        </h1>
      </header>

      {addictions.length > 0 && (
        <section aria-labelledby="next-heading">
          <h2 id="next-heading" className="sr-only">Next milestones</h2>
          <ul className="grid gap-6 md:grid-cols-2">
            {addictions.map((a) => {
              const days = soberDays(new Date(a.start_date));
              const m = nextMilestone(days);
              return (
                <li key={a.id} className="card flex items-center gap-8 p-8">
                  <ProgressRing value={m.progress} size={112} label={`${addictionName(a)}: progress toward ${m.next} days`}>
                    <span className="text-2xl font-light tabular-nums">{Math.round(m.progress * 100)}%</span>
                  </ProgressRing>
                  <div>
                    <p className="eyebrow">{addictionName(a)}</p>
                    <p className="heading-xl mt-2">Next: {m.next} days</p>
                    <p className="caption mt-1">
                      {days} {days === 1 ? "day" : "days"} so far · {m.daysToGo} to go
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {GROUPS.map(({ kind, heading, unit }) => (
        <section key={kind} aria-labelledby={`kind-${kind}`}>
          <h2 id={`kind-${kind}`} className="heading-md border-b border-fg pb-3">{heading}</h2>
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {defs
              .filter((d) => d.kind === kind)
              .map((d) => {
                const mine = earned.filter((e) => e.achievement_id === d.id);
                const got = mine.length > 0;
                const forWhat =
                  kind === "sober_days" && got
                    ? mine
                        .map((e) => addictions.find((a) => a.id === e.addiction_id))
                        .filter((a) => a !== undefined)
                        .map(addictionName)
                        .join(", ")
                    : null;
                return (
                  <li
                    key={d.id}
                    className={`flex aspect-[4/5] flex-col justify-between rounded-lg p-5 ${got ? "panel-inverse" : "border border-dashed border-ash text-muted"}`}
                  >
                    <div>
                      <span className="block text-5xl leading-none font-light tabular-nums">{d.threshold}</span>
                      <span className={`mt-2 block text-xs ${got ? "text-inverse-muted" : ""}`}>{unit(d.threshold)}</span>
                    </div>
                    <div>
                      <h3 className={`text-sm font-semibold ${got ? "" : "text-fg/70"}`}>{d.title}</h3>
                      <p className={`mt-1 text-xs ${got ? "text-inverse-muted" : ""}`}>
                        {got ? (
                          <>
                            {fmt(mine[0].earned_at)}
                            {forWhat ? ` · ${forWhat}` : ""}
                          </>
                        ) : (
                          "Not yet earned"
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
