import type { Metadata } from "next";
import Link from "next/link";
import { MarkAllRead } from "@/components/notifications/mark-all-read";
import type { NotificationKind } from "@/lib/database.types";
import { getProfile } from "@/lib/data";
import { safeTimeZone } from "@/lib/recovery/time";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notifications" };

const KIND_LABEL: Record<NotificationKind, string> = {
  welcome: "Welcome",
  reminder: "Reminder",
  milestone: "Milestone",
  encouragement: "Encouragement",
  system: "Update",
};

export default async function NotificationsPage() {
  const { supabase, user } = await requireUser();
  const [profile, { data }] = await Promise.all([
    getProfile(supabase, user.id),
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
  ]);
  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at).length;
  const tz = safeTimeZone(profile.timezone);
  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Notifications</p>
          <h1 className="display-lg mt-3">{unread > 0 ? `${unread} new` : "You're all caught up"}</h1>
        </div>
        <div className="flex items-center gap-5">
          {unread > 0 && <MarkAllRead />}
          <Link href="/settings#notifications" className="text-sm font-semibold text-link hover:underline">Preferences</Link>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="mt-12 border-t border-border pt-12">
          <p className="text-lg text-body">Reminders, milestones and encouragement will appear here.</p>
          <Link href="/settings#notifications" className="btn btn-secondary mt-8">Set up reminders</Link>
        </div>
      ) : (
        <ul className="mt-12 border-t border-border">
          {items.map((n) => {
            const content = (
              <>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="eyebrow">{KIND_LABEL[n.kind]}</p>
                  <time dateTime={n.created_at} className="shrink-0 text-xs text-muted tabular-nums">{when(n.created_at)}</time>
                </div>
                <p className={`mt-2 text-lg ${n.read_at ? "font-normal" : "font-semibold"}`}>{n.title}</p>
                <p className="mt-1 leading-relaxed text-body">{n.body}</p>
              </>
            );
            return (
              <li key={n.id} className="relative border-b border-border">
                {!n.read_at && <span aria-label="Unread" className="absolute top-8 -left-4 size-2 rounded-full bg-primary sm:-left-5" />}
                {n.url ? (
                  <Link href={n.url} className="block py-6 hover:bg-surface-2/60">{content}</Link>
                ) : (
                  <div className="py-6">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
