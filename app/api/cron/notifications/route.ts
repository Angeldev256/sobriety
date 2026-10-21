import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { ReminderSetting } from "@/lib/database.types";
import { getActiveAddictions, getProfile, syncAchievements, todayFor } from "@/lib/data";
import { ENCOURAGEMENT_LINES, pickLine, reminderNotification } from "@/lib/notifications/copy";
import { emailTemplates } from "@/lib/notifications/email";
import { notify } from "@/lib/notifications/notify";
import { localTimeString, safeTimeZone } from "@/lib/recovery/time";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PAGE = 500;
const WEEK_MS = 7 * 86_400_000;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/**
 * Run every 15–60 minutes. For each member, according to their preferences:
 *  1. Milestone alerts — awards newly reached milestones and sends one note for the biggest.
 *  2. Daily reminder — once per local day, after their reminder time, only if they haven't checked in.
 *  3. Encouragement — at most once a week, around midday local time.
 * Every notification lands in the in-app inbox; push and email follow the user's channel choices.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();
  const now = new Date();
  const totals = { users: 0, milestones: 0, reminders: 0, encouragement: 0 };

  for (let from = 0; ; from += PAGE) {
    const { data: page, error } = await db.from("reminder_settings").select("*").order("user_id").range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: "Could not load settings", totals }, { status: 500 });
    if (!page?.length) break;

    for (const s of page) {
      totals.users++;
      try {
        const r = await processUser(db, s, now);
        totals.milestones += r.milestone;
        totals.reminders += r.reminder;
        totals.encouragement += r.encouragement;
      } catch {
        // One user's failure must not stop everyone else's notifications.
      }
    }
    if (page.length < PAGE) break;
  }

  return NextResponse.json(totals);
}

async function processUser(db: ReturnType<typeof createServiceClient>, s: ReminderSetting, now: Date) {
  const out = { milestone: 0, reminder: 0, encouragement: 0 };
  const hasChannel = s.push_enabled || s.email_enabled;
  const [profile, addictions] = await Promise.all([getProfile(db, s.user_id), getActiveAddictions(db, s.user_id)]);
  if (addictions.length === 0) return out;

  const tz = safeTimeZone(profile.timezone);
  const localDate = todayFor(profile, now);
  const localTime = localTimeString(now, tz);
  const name = profile.display_name?.split(" ")[0] ?? "there";
  let email: string | undefined;
  const getEmail = async () => (email ??= (await db.auth.admin.getUserById(s.user_id)).data.user?.email ?? undefined);

  // 1. Milestones ------------------------------------------------------------
  await syncAchievements(db, s.user_id, profile, addictions);
  const { data: pending } = await db
    .from("user_achievements")
    .select("id, achievement_id, earned_at")
    .eq("user_id", s.user_id)
    .eq("notified", false);
  if (pending?.length) {
    const recent = pending.filter((p) => now.getTime() - new Date(p.earned_at).getTime() < 3 * 86_400_000);
    if (s.milestone_alerts && recent.length) {
      const { data: defs } = await db.from("achievements").select("*").in("id", recent.map((r) => r.achievement_id));
      const top = (defs ?? []).sort((a, b) => b.sort_order - a.sort_order)[0];
      if (top) {
        const to = s.email_enabled ? await getEmail() : undefined;
        await notify(db, s.user_id, {
          kind: "milestone",
          title: `Milestone reached: ${top.title}`,
          body: top.description,
          url: "/milestones",
          push: s.push_enabled,
          email: to ? { to, content: emailTemplates.milestone(name, top.title, top.description) } : null,
        });
        out.milestone++;
      }
    }
    await db.from("user_achievements").update({ notified: true }).in("id", pending.map((p) => p.id));
  }

  // 2. Daily reminder --------------------------------------------------------
  if (s.enabled && hasChannel && s.last_sent_on !== localDate && localTime >= s.reminder_time.slice(0, 5)) {
    const { count } = await db.from("check_ins").select("id", { count: "exact", head: true }).eq("user_id", s.user_id).eq("date", localDate);
    if ((count ?? 0) < addictions.length) {
      const n = reminderNotification(name, `${s.user_id}:${localDate}`);
      const to = s.email_enabled ? await getEmail() : undefined;
      await notify(db, s.user_id, {
        kind: "reminder",
        title: n.title,
        body: n.body,
        url: "/check-in",
        push: s.push_enabled,
        email: to ? { to, content: emailTemplates.reminder(name, n.line) } : null,
      });
      out.reminder++;
    }
    await db.from("reminder_settings").update({ last_sent_on: localDate }).eq("user_id", s.user_id);
  }

  // 3. Weekly encouragement (push + inbox only) ------------------------------
  if (s.encouragement && s.push_enabled && localTime >= "12:00" && localTime < "14:00") {
    const { data: last } = await db
      .from("notifications")
      .select("created_at")
      .eq("user_id", s.user_id)
      .eq("kind", "encouragement")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!last || now.getTime() - new Date(last.created_at).getTime() > WEEK_MS - 3_600_000) {
      await notify(db, s.user_id, {
        kind: "encouragement",
        title: `Thinking of you, ${name}`,
        body: pickLine(ENCOURAGEMENT_LINES, `${s.user_id}:${localDate}`),
        url: "/toolkit",
        push: true,
      });
      out.encouragement++;
    }
  }

  return out;
}
