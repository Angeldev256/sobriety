"use server";

import { revalidatePath } from "next/cache";
import { getProfile, todayFor } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";
import { checkInSchema, fieldErrorsOf, type ActionState } from "@/lib/validations";

type CheckInState = (NonNullable<ActionState> & { stayedSober?: boolean }) | null;

/**
 * Creates today's check-in or updates it if one exists. "Today" is always computed on the
 * server from the user's saved time zone, so the client can't backdate or duplicate entries.
 */
export async function saveCheckIn(_prev: CheckInState, formData: FormData): Promise<CheckInState> {
  const { supabase, user } = await requireUser();
  const parsed = checkInSchema.safeParse({
    addiction_id: formData.get("addiction_id"),
    mood: formData.get("mood"),
    craving_level: formData.get("craving_level"),
    triggers: formData.getAll("triggers"),
    note: formData.get("note"),
    stayed_sober: formData.get("stayed_sober"),
  });
  if (!parsed.success) return { ok: false, message: "Please fill in the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };

  const profile = await getProfile(supabase, user.id);
  const { error } = await supabase
    .from("check_ins")
    .upsert({ ...parsed.data, user_id: user.id, date: todayFor(profile) }, { onConflict: "user_id,addiction_id,date" });

  if (error) return { ok: false, message: "We couldn't save your check-in. Please try again." };

  revalidatePath("/", "layout");
  return {
    ok: true,
    stayedSober: parsed.data.stayed_sober,
    message: parsed.data.stayed_sober
      ? "Another day of showing up for yourself."
      : "Thank you for being honest — that takes real courage.",
  };
}
