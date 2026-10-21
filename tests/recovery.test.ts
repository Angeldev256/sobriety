import { describe, expect, it } from "vitest";
import { localDateString, shiftDate, soberDuration } from "@/lib/recovery/time";
import { currentCheckInStreak, longestCheckInStreak, longestSoberStreakDays, totalSoberDays } from "@/lib/recovery/streaks";
import { achievementsToAward, milestoneSequence, nextMilestone } from "@/lib/recovery/milestones";

describe("soberDuration", () => {
  it("breaks elapsed time into days, hours, minutes, seconds", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-03T05:06:07Z");
    expect(soberDuration(start, now)).toEqual({
      totalSeconds: 2 * 86400 + 5 * 3600 + 6 * 60 + 7,
      days: 2,
      hours: 5,
      minutes: 6,
      seconds: 7,
    });
  });

  it("never goes negative for a future start date", () => {
    expect(soberDuration(new Date("2030-01-01Z"), new Date("2026-01-01Z")).totalSeconds).toBe(0);
  });
});

describe("dates and time zones", () => {
  it("uses the user's local calendar date", () => {
    const instant = new Date("2026-03-10T03:30:00Z");
    expect(localDateString(instant, "UTC")).toBe("2026-03-10");
    expect(localDateString(instant, "America/New_York")).toBe("2026-03-09");
    expect(localDateString(instant, "Asia/Tokyo")).toBe("2026-03-10");
  });

  it("falls back to UTC for an invalid zone", () => {
    expect(localDateString(new Date("2026-03-10T03:30:00Z"), "Not/AZone")).toBe("2026-03-10");
  });

  it("shifts across month and DST boundaries", () => {
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDate("2026-03-08", 1)).toBe("2026-03-09");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("check-in streaks", () => {
  const today = "2026-05-10";

  it("counts consecutive days ending today", () => {
    expect(currentCheckInStreak(["2026-05-08", "2026-05-09", "2026-05-10"], today)).toBe(3);
  });

  it("keeps the streak alive if only today is missing", () => {
    expect(currentCheckInStreak(["2026-05-08", "2026-05-09"], today)).toBe(2);
  });

  it("is zero after a missed day", () => {
    expect(currentCheckInStreak(["2026-05-07", "2026-05-08"], today)).toBe(0);
  });

  it("finds the longest run regardless of order or duplicates", () => {
    expect(longestCheckInStreak(["2026-05-03", "2026-05-01", "2026-05-02", "2026-05-02", "2026-05-06", "2026-05-07"])).toBe(3);
    expect(longestCheckInStreak([])).toBe(0);
  });
});

describe("sober streak totals", () => {
  it("longest streak is the larger of the stored best and the current one", () => {
    expect(longestSoberStreakDays(10 * 86400, 3 * 86400)).toBe(10);
    expect(longestSoberStreakDays(10 * 86400, 12 * 86400 + 5)).toBe(12);
  });

  it("total sober days only adds past periods that ended in a reset", () => {
    const relapses = [
      { counter_reset: true, streak_seconds: 5 * 86400 },
      { counter_reset: false, streak_seconds: 99 * 86400 },
      { counter_reset: true, streak_seconds: 2 * 86400 + 43200 },
    ];
    expect(totalSoberDays(3 * 86400 + 43200, relapses)).toBe(11);
  });
});

describe("milestones", () => {
  it("adds yearly milestones after one year", () => {
    expect(milestoneSequence(400)).toContain(730);
    expect(milestoneSequence(10)).not.toContain(730);
  });

  it("reports progress toward the next milestone", () => {
    expect(nextMilestone(0)).toEqual({ previous: 0, next: 1, daysToGo: 1, progress: 0 });
    expect(nextMilestone(10)).toEqual({ previous: 7, next: 14, daysToGo: 4, progress: 3 / 7 });
    expect(nextMilestone(365).next).toBe(730);
    expect(nextMilestone(800)).toMatchObject({ previous: 730, next: 1095 });
  });

  it("awards only new achievements, per addiction for sober badges", () => {
    const defs = [
      { id: "sober_1", kind: "sober_days" as const, threshold: 1 },
      { id: "sober_7", kind: "sober_days" as const, threshold: 7 },
      { id: "checkin_3", kind: "checkin_streak" as const, threshold: 3 },
      { id: "goal_1", kind: "goals_completed" as const, threshold: 1 },
    ];
    const result = achievementsToAward(
      defs,
      { soberDaysByAddiction: { a: 8, b: 2 }, checkInStreak: 3, goalsCompleted: 0 },
      [{ achievement_id: "sober_1", addiction_id: "a" }],
    );
    expect(result).toEqual([
      { achievement_id: "sober_1", addiction_id: "b" },
      { achievement_id: "sober_7", addiction_id: "a" },
      { achievement_id: "checkin_3", addiction_id: null },
    ]);
  });
});

import { formatMoney, moneySaved } from "@/lib/recovery/money";
import { pickLine, reminderNotification, REMINDER_LINES } from "@/lib/notifications/copy";

describe("money saved", () => {
  it("scales daily cost by elapsed time, rounding down", () => {
    expect(moneySaved(12.5, 10 * 86400)).toBe(125);
    expect(moneySaved(10, 1.5 * 86400)).toBe(15);
  });

  it("is zero without a cost or time", () => {
    expect(moneySaved(null, 86400)).toBe(0);
    expect(moneySaved(0, 86400)).toBe(0);
    expect(moneySaved(10, 0)).toBe(0);
  });

  it("formats in the user's currency", () => {
    expect(formatMoney(125, "USD")).toBe("$125");
    expect(formatMoney(1250, "GBP")).toBe("£1,250");
  });
});

describe("notification copy", () => {
  it("picks the same line for the same seed", () => {
    expect(pickLine(REMINDER_LINES, "user-1:2026-05-01")).toBe(pickLine(REMINDER_LINES, "user-1:2026-05-01"));
  });

  it("never mentions an addiction or sobriety on the lock screen", () => {
    for (const line of REMINDER_LINES) expect(line).not.toMatch(/alcohol|drink|drug|sober|gambl|relapse|addict/i);
    expect(reminderNotification("Sam", "x").title).toBe("Hi Sam");
  });
});
