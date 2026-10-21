"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { fieldErrorsOf, profileSchema, reminderSchema, type ActionState } from "@/lib/validations";

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = profileSchema.safeParse({
    display_name: formData.get("display_name"),
    timezone: formData.get("timezone"),
    country: formData.get("country"),
    theme: formData.get("theme"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { ok: false, message: "We couldn't save your profile. Please try again." };

  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function updateReminders(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = reminderSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    reminder_time: formData.get("reminder_time"),
    email_enabled: formData.get("email_enabled") === "on",
    milestone_alerts: formData.get("milestone_alerts") === "on",
    encouragement: formData.get("encouragement") === "on",
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const { error } = await supabase.from("reminder_settings").upsert({ ...parsed.data, user_id: user.id });
  if (error) return { ok: false, message: "We couldn't save your preferences. Please try again." };

  revalidatePath("/", "layout");
  return { ok: true, message: "Notification preferences saved." };
}

/** Called once from the browser to replace the default UTC with the device's real time zone. */
export async function setTimezoneIfDefault(timezone: string) {
  const { supabase, user } = await requireUser();
  const parsed = profileSchema.shape.timezone.safeParse(timezone);
  if (!parsed.success) return;
  await supabase.from("profiles").update({ timezone: parsed.data }).eq("id", user.id).eq("timezone", "UTC");
  revalidatePath("/", "layout");
}

/** Permanently deletes the account and (via ON DELETE CASCADE) every row the user owns. */
export async function deleteAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  if (formData.get("confirm") !== "DELETE") {
    return { ok: false, fieldErrors: { confirm: ["Type DELETE in capitals to confirm."] } };
  }
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { ok: false, message: "We couldn't delete your account. Please try again." };

  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
