export const SOBER_MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365] as const;

/** Milestone day counts up to and past `days`: the fixed list, then every full year after one year. */
export function milestoneSequence(days: number): number[] {
  const list: number[] = [...SOBER_MILESTONES];
  for (let year = 2; year * 365 <= days + 365; year++) list.push(year * 365);
  return list;
}

export type MilestoneProgress = {
  previous: number; // last milestone reached (0 if none)
  next: number; // next milestone to reach
  daysToGo: number;
  progress: number; // 0..1 between previous and next
};

export function nextMilestone(days: number): MilestoneProgress {
  const seq = milestoneSequence(days);
  const next = seq.find((m) => m > days)!;
  const previous = [...seq].reverse().find((m) => m <= days) ?? 0;
  return {
    previous,
    next,
    daysToGo: next - days,
    progress: (days - previous) / (next - previous),
  };
}

export type AchievementDef = { id: string; kind: "sober_days" | "checkin_streak" | "goals_completed"; threshold: number };
export type EarnedKey = { achievement_id: string; addiction_id: string | null };
export type AwardInput = {
  soberDaysByAddiction: Record<string, number>;
  checkInStreak: number;
  goalsCompleted: number;
};

/** Achievements the user now qualifies for that they have not been awarded yet. */
export function achievementsToAward(defs: AchievementDef[], input: AwardInput, earned: EarnedKey[]): EarnedKey[] {
  const have = new Set(earned.map((e) => `${e.achievement_id}|${e.addiction_id ?? ""}`));
  const out: EarnedKey[] = [];
  const add = (achievement_id: string, addiction_id: string | null) => {
    if (!have.has(`${achievement_id}|${addiction_id ?? ""}`)) out.push({ achievement_id, addiction_id });
  };

  for (const def of defs) {
    if (def.kind === "sober_days") {
      for (const [addictionId, days] of Object.entries(input.soberDaysByAddiction)) {
        if (days >= def.threshold) add(def.id, addictionId);
      }
    } else if (def.kind === "checkin_streak" && input.checkInStreak >= def.threshold) {
      add(def.id, null);
    } else if (def.kind === "goals_completed" && input.goalsCompleted >= def.threshold) {
      add(def.id, null);
    }
  }
  return out;
}
