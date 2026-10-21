"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { addictionSchema, fieldErrorsOf, type ActionState } from "@/lib/validations";

export async function createAddiction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = addictionSchema.safeParse({
    type: formData.get("type"),
    label: formData.get("label"),
    start_date: formData.get("start_date"),
    reason: formData.get("reason"),
    daily_cost: formData.get("daily_cost") ?? "",
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const { error } = await supabase.from("addictions").insert({ ...parsed.data, user_id: user.id });
  if (error) return { ok: false, message: "We couldn't save that. Please try again." };

  revalidatePath("/", "layout");
  return { ok: true, message: "You're all set. Every moment counts." };
}

export async function updateAddictionStart(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = addictionSchema
    .pick({ start_date: true, label: true, reason: true, daily_cost: true })
    .extend({ id: z.uuid() })
    .safeParse({
      id: formData.get("id"),
      start_date: formData.get("start_date"),
      label: formData.get("label"),
      reason: formData.get("reason"),
      daily_cost: formData.get("daily_cost") ?? "",
    });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const { id, ...values } = parsed.data;
  const { error } = await supabase.from("addictions").update(values).eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, message: "We couldn't save that. Please try again." };

  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

/** Stops tracking without deleting any history. */
export async function archiveAddiction(id: string) {
  const { supabase, user } = await requireUser();
  if (!z.uuid().safeParse(id).success) return;
  await supabase.from("addictions").update({ is_active: false }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/", "layout");
}

export async function toggleFavoriteMessage(messageId: number, favorite: boolean) {
  const { supabase, user } = await requireUser();
  if (!Number.isInteger(messageId)) return;
  if (favorite) {
    await supabase.from("favorite_messages").upsert({ user_id: user.id, message_id: messageId }, { ignoreDuplicates: true });
  } else {
    await supabase.from("favorite_messages").delete().eq("user_id", user.id).eq("message_id", messageId);
  }
  revalidatePath("/dashboard");
}

export async function markAchievementsSeen(ids: string[]) {
  const { supabase, user } = await requireUser();
  const valid = ids.filter((id) => z.uuid().safeParse(id).success);
  if (valid.length === 0) return;
  // Seen in the app → no need to also send a milestone notification for it.
  await supabase.from("user_achievements").update({ seen: true, notified: true }).eq("user_id", user.id).in("id", valid);
}
