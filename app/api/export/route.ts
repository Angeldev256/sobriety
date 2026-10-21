import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : Array.isArray(v) ? v.join("; ") : String(v);
  // Quote everything and neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

function toCsv(rows: Record<string, unknown>[], columns: string[]) {
  return [columns.join(","), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(","))].join("\r\n");
}

/** Downloads everything the signed-in user owns. RLS limits every query to their rows. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const uid = auth.user.id;

  const [profile, addictions, checkIns, goals, relapses, achievements, favorites, reminders] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
    supabase.from("addictions").select("*").eq("user_id", uid),
    supabase.from("check_ins").select("*").eq("user_id", uid).order("date"),
    supabase.from("goals").select("*").eq("user_id", uid),
    supabase.from("relapses").select("*").eq("user_id", uid),
    supabase.from("user_achievements").select("*").eq("user_id", uid),
    supabase.from("favorite_messages").select("*").eq("user_id", uid),
    supabase.from("reminder_settings").select("*").eq("user_id", uid).maybeSingle(),
  ]);

  const stamp = new Date().toISOString().slice(0, 10);
  const headers = { "Cache-Control": "no-store" };

  if (request.nextUrl.searchParams.get("format") === "csv") {
    const names = new Map((addictions.data ?? []).map((a) => [a.id, a.label || a.type]));
    const rows = (checkIns.data ?? []).map((c) => ({ ...c, tracker: names.get(c.addiction_id) }));
    const csv = toCsv(rows, ["date", "tracker", "mood", "craving_level", "stayed_sober", "triggers", "note", "created_at", "updated_at"]);
    return new NextResponse(`﻿${csv}`, {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="recovery-check-ins-${stamp}.csv"` },
    });
  }

  const body = {
    exported_at: new Date().toISOString(),
    account: { email: auth.user.email },
    profile: profile.data,
    reminder_settings: reminders.data,
    addictions: addictions.data,
    check_ins: checkIns.data,
    goals: goals.data,
    relapses: relapses.data,
    achievements: achievements.data,
    favorite_messages: favorites.data,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: { ...headers, "Content-Type": "application/json", "Content-Disposition": `attachment; filename="recovery-data-${stamp}.json"` },
  });
}
