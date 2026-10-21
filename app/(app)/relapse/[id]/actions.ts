"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { fieldErrorsOf, relapseSchema, type ActionState } from "@/lib/validations";

/**
 * Logs a slip. History is always preserved; the user chooses whether the counter restarts.
 * If it restarts, the streak that just ended is kept as the longest streak if it was the best.
 */
export async function logRelapse(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = relapseSchema.safeParse({
    addiction_id: formData.get("addiction_id"),
    note: formData.get("note"),
    reset_counter: formData.get("reset_counter"),
  });
  if (!parsed.success) return { ok: false, message: "Please choose what should happen to your counter.", fieldErrors: fieldErrorsOf(parsed.error) };

  const { data: addiction } = await supabase
    .from("addictions")
    .select("*")
    .eq("id", parsed.data.addiction_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!addiction) return { ok: false, message: "We couldn't find that tracker." };

  const now = new Date();
  const streakSeconds = Math.max(0, Math.floor((now.getTime() - new Date(addiction.start_date).getTime()) / 1000));

  const { error } = await supabase.from("relapses").insert({
    user_id: user.id,
    addiction_id: addiction.id,
    occurred_at: now.toISOString(),
    note: parsed.data.note ?? null,
    counter_reset: parsed.data.reset_counter,
    previous_start_date: addiction.start_date,
    streak_seconds: streakSeconds,
  });
  if (error) return { ok: false, message: "We couldn't save that. Please try again." };

  if (parsed.data.reset_counter) {
    await supabase
      .from("addictions")
      .update({ start_date: now.toISOString(), longest_streak_seconds: Math.max(addiction.longest_streak_seconds, streakSeconds) })
      .eq("id", addiction.id)
      .eq("user_id", user.id);
  }

  revalidatePath("/", "layout");
  return {
    ok: true,
    message: parsed.data.reset_counter
      ? "Your new start begins right now. Your past days still count, and your longest streak is saved."
      : "Logged. Your counter keeps going — this moment is part of your story, not the end of it.",
  };
}
