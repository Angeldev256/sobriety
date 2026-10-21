import { SECONDS_PER_DAY, shiftDate } from "./time";

/**
 * Consecutive-day check-in streak ending today. If today has no check-in yet the
 * streak is still alive as long as yesterday has one (the user has until midnight).
 * `dates` are local yyyy-MM-dd strings, in any order, duplicates allowed.
 */
export function currentCheckInStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  let cursor = set.has(today) ? today : shiftDate(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive calendar days present in `dates`. */
export function longestCheckInStreak(dates: string[]): number {
  const sorted = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of sorted) {
    run = prev !== null && shiftDate(prev, 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
    prev = date;
  }
  return best;
}

export type RelapseLike = { counter_reset: boolean; streak_seconds: number };

/** Longest sober streak in days: the stored best completed streak vs. the one running now. */
export function longestSoberStreakDays(storedLongestSeconds: number, currentSeconds: number): number {
  return Math.floor(Math.max(storedLongestSeconds, currentSeconds) / SECONDS_PER_DAY);
}

/**
 * Total sober time across the user's whole history for one addiction: the current
 * period plus every earlier period that ended in a relapse where the counter was reset.
 * (Slips logged without resetting stay inside the current period.)
 */
export function totalSoberDays(currentSeconds: number, relapses: RelapseLike[]): number {
  const past = relapses.filter((r) => r.counter_reset).reduce((sum, r) => sum + Number(r.streak_seconds), 0);
  return Math.floor((past + currentSeconds) / SECONDS_PER_DAY);
}
