"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

export async function markAllRead() {
  const { supabase, user } = await requireUser();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/", "layout");
}

export async function clearNotifications() {
  const { supabase, user } = await requireUser();
  await supabase.from("notifications").delete().eq("user_id", user.id);
  revalidatePath("/", "layout");
}

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Stores this device's push subscription and switches push on for the account. */
export async function savePushSubscription(sub: unknown, userAgent: string) {
  const { supabase, user } = await requireUser();
  const parsed = subscriptionSchema.safeParse(sub);
  if (!parsed.success) return { ok: false };
  const { endpoint, keys } = parsed.data;
  // An endpoint belongs to one browser; re-subscribing replaces any old owner of it.
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_agent: userAgent.slice(0, 200),
  });
  if (error) return { ok: false };
  await supabase.from("reminder_settings").update({ push_enabled: true }).eq("user_id", user.id);
  revalidatePath("/settings");
  return { ok: true };
}

export async function removePushSubscription(endpoint: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  const { count } = await supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if (!count) await supabase.from("reminder_settings").update({ push_enabled: false }).eq("user_id", user.id);
  revalidatePath("/settings");
}

/** Sends a test notification to this account's devices so users can confirm it works. */
export async function sendTestNotification() {
  const { supabase, user } = await requireUser();
  const { notify } = await import("@/lib/notifications/notify");
  const result = await notify(supabase, user.id, {
    kind: "system",
    title: "Notifications are on",
    body: "This is how reminders will look. We'll keep them gentle — and discreet.",
    url: "/notifications",
    push: true,
  });
  revalidatePath("/", "layout");
  return result;
}
