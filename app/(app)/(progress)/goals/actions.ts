"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { GoalStatus } from "@/lib/database.types";
import { requireUser } from "@/lib/supabase/server";
import { fieldErrorsOf, goalSchema, type ActionState } from "@/lib/validations";

function goalFromForm(formData: FormData) {
  return goalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    target_date: formData.get("target_date") ?? "",
    status: formData.get("status") ?? undefined,
  });
}

const completedAt = (status: GoalStatus) => (status === "completed" ? new Date().toISOString() : null);

export async function createGoal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = goalFromForm(formData);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const { error } = await supabase.from("goals").insert({
    ...parsed.data,
    target_date: parsed.data.target_date ?? null,
    completed_at: completedAt(parsed.data.status),
    user_id: user.id,
  });
  if (error) return { ok: false, message: "We couldn't save your goal. Please try again." };

  revalidatePath("/goals");
  return { ok: true, message: "Goal added. You've got this!" };
}

export async function updateGoal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const id = z.uuid().safeParse(formData.get("id"));
  const parsed = goalFromForm(formData);
  if (!id.success) return { ok: false, message: "Goal not found." };
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const { error } = await supabase
    .from("goals")
    .update({ ...parsed.data, target_date: parsed.data.target_date ?? null, completed_at: completedAt(parsed.data.status) })
    .eq("id", id.data)
    .eq("user_id", user.id);
  if (error) return { ok: false, message: "We couldn't save your goal. Please try again." };

  revalidatePath("/goals");
  return { ok: true, message: "Goal updated." };
}

export async function setGoalStatus(id: string, status: GoalStatus) {
  const { supabase, user } = await requireUser();
  if (!z.uuid().safeParse(id).success || !["not_started", "in_progress", "completed"].includes(status)) return;
  await supabase.from("goals").update({ status, completed_at: completedAt(status) }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function deleteGoal(id: string) {
  const { supabase, user } = await requireUser();
  if (!z.uuid().safeParse(id).success) return;
  await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/goals");
}
