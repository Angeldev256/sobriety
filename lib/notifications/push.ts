import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

let configured = false;
function configure() {
  if (configured || !env.pushEnabled) return env.pushEnabled;
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey!, env.vapidPrivateKey!);
  configured = true;
  return true;
}

/**
 * Sends a push notification to every device the user has subscribed. Expired or revoked
 * subscriptions (404/410) are removed. Lock-screen text is kept generic on purpose.
 */
export async function sendPush(db: SupabaseClient<Database>, userId: string, payload: PushPayload): Promise<number> {
  if (!configure()) return 0;
  const { data: subs } = await db.from("push_subscriptions").select("*").eq("user_id", userId);
  let delivered = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 12 });
        delivered++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
      }
    }),
  );
  return delivered;
}
