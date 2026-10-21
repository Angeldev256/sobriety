import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NotificationKind } from "@/lib/database.types";
import { sendEmail, type EmailContent } from "./email";
import { sendPush } from "./push";

type DB = SupabaseClient<Database>;

export type NotifyInput = {
  kind: NotificationKind;
  title: string;
  body: string;
  url?: string;
  push?: boolean;
  email?: { to: string; content: EmailContent } | null;
};

/** Writes an inbox entry, then delivers by push and/or email as requested. */
export async function notify(db: DB, userId: string, n: NotifyInput) {
  await db.from("notifications").insert({ user_id: userId, kind: n.kind, title: n.title, body: n.body, url: n.url ?? null });
  const [pushed, emailed] = await Promise.all([
    n.push ? sendPush(db, userId, { title: n.title, body: n.body, url: n.url, tag: n.kind }) : Promise.resolve(0),
    n.email ? sendEmail(n.email.to, n.email.content) : Promise.resolve(false),
  ]);
  return { pushed, emailed };
}
