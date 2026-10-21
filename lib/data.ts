import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Achievement, Addiction, Database, Profile } from "@/lib/database.types";
import { achievementsToAward, type AchievementDef } from "@/lib/recovery/milestones";
import { currentCheckInStreak } from "@/lib/recovery/streaks";
import { localDateString, safeTimeZone, shiftDate, soberDays } from "@/lib/recovery/time";

type DB = SupabaseClient<Database>;

// Every query below is also filtered by user_id explicitly. RLS already guarantees ownership;
// the explicit filter is defence in depth and keeps query plans on the user indexes.

export async function getProfile(supabase: DB, userId: string): Promise<Profile> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  // The sign-up trigger always creates a profile; fall back to safe defaults just in case.
  return (
    data ?? {
      id: userId,
      display_name: null,
      avatar_url: null,
      timezone: "Africa/Kampala",
      country: "UG",
      theme: "system",
      currency: "UGX",
      welcome_email_sent: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  );
}

export async function getActiveAddictions(supabase: DB, userId: string): Promise<Addiction[]> {
  const { data } = await supabase
    .from("addictions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export function todayFor(profile: Pick<Profile, "timezone">, now = new Date()): string {
  return localDateString(now, safeTimeZone(profile.timezone));
}

export async function getCheckInDates(supabase: DB, userId: string, sinceDate?: string): Promise<string[]> {
  let q = supabase.from("check_ins").select("date").eq("user_id", userId);
  if (sinceDate) q = q.gte("date", sinceDate);
  const { data } = await q;
  return (data ?? []).map((r) => r.date);
}

/**
 * Awards any achievements the user now qualifies for and returns the ones they have
 * not seen yet (for the celebration animation). Safe to call on every dashboard load.
 */
export async function syncAchievements(supabase: DB, userId: string, profile: Profile, addictions: Addiction[]) {
  const today = todayFor(profile);
  const [defsRes, earnedRes, dates, goalsRes] = await Promise.all([
    supabase.from("achievements").select("*").order("sort_order"),
    supabase.from("user_achievements").select("achievement_id, addiction_id").eq("user_id", userId),
    getCheckInDates(supabase, userId, shiftDate(today, -400)),
    supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"),
  ]);

  const defs = (defsRes.data ?? []) as Achievement[];
  const toAward = achievementsToAward(
    defs as AchievementDef[],
    {
      soberDaysByAddiction: Object.fromEntries(addictions.map((a) => [a.id, soberDays(new Date(a.start_date))])),
      checkInStreak: currentCheckInStreak(dates, today),
      goalsCompleted: goalsRes.count ?? 0,
    },
    earnedRes.data ?? [],
  );

  if (toAward.length > 0) {
    await supabase
      .from("user_achievements")
      .upsert(
        toAward.map((a) => ({ ...a, user_id: userId })),
        { onConflict: "user_id,achievement_id,addiction_id", ignoreDuplicates: true },
      );
  }

  const { data: unseen } = await supabase
    .from("user_achievements")
    .select("id, achievement_id, addiction_id")
    .eq("user_id", userId)
    .eq("seen", false);

  const byId = new Map(defs.map((d) => [d.id, d]));
  return (unseen ?? [])
    .map((u) => ({ ...u, achievement: byId.get(u.achievement_id)! }))
    .filter((u) => u.achievement)
    .sort((a, b) => b.achievement.sort_order - a.achievement.sort_order);
}

/** Same message all day for a given user, a different one each day. */
export async function messageOfTheDay(supabase: DB, userId: string, today: string) {
  const { count } = await supabase.from("messages").select("id", { count: "exact", head: true });
  if (!count) return null;
  let hash = 0;
  for (const ch of `${today}:${userId}`) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const { data } = await supabase
    .from("messages")
    .select("*")
    .order("id")
    .range(hash % count, hash % count)
    .maybeSingle();
  if (!data) return null;
  const { data: fav } = await supabase
    .from("favorite_messages")
    .select("message_id")
    .eq("user_id", userId)
    .eq("message_id", data.id)
    .maybeSingle();
  return { ...data, favorited: Boolean(fav) };
}

/** Message of the day for guests: same for everyone on a given day. */
export async function publicMessageOfTheDay(supabase: DB, today: string) {
  const { count } = await supabase.from("messages").select("id", { count: "exact", head: true });
  if (!count) return null;
  let hash = 0;
  for (const ch of today) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const { data } = await supabase.from("messages").select("*").order("id").range(hash % count, hash % count).maybeSingle();
  return data;
}
