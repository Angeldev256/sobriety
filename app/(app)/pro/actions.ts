"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizePhone } from "@/lib/support";
import { requireUser } from "@/lib/supabase/server";
import { fieldErrorsOf, professionalSchema, type ActionState } from "@/lib/validations";

export async function saveProfessional(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = professionalSchema.safeParse({
    full_name: formData.get("full_name"),
    profession: formData.get("profession"),
    licence_body: formData.get("licence_body"),
    licence_number: formData.get("licence_number"),
    institution: formData.get("institution"),
    bio: formData.get("bio"),
    specialties: formData.getAll("specialties"),
    languages: formData.getAll("languages"),
    session_modes: formData.getAll("session_modes"),
    fee_ugx: formData.get("fee_ugx"),
    payout_phone: formData.get("payout_phone") ?? "",
    accepting_patients: formData.get("accepting_patients") === "on",
    agree: formData.get("agree"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  if (!user.email) return { ok: false, message: "Your account needs an email address before you can apply." };

  const { agree, payout_phone: rawPhone, ...values } = parsed.data;
  void agree; // required by the schema, not stored
  const payout_phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && !payout_phone) return { ok: false, fieldErrors: { payout_phone: ["Please enter a valid phone number, e.g. 0772 123 456."] } };

  const { data: existing } = await supabase.from("professionals").select("status").eq("user_id", user.id).maybeSingle();
  const row = { ...values, payout_phone, email: user.email.toLowerCase() };
  const { error } = existing
    ? await supabase.from("professionals").update(row).eq("user_id", user.id)
    : await supabase.from("professionals").insert({ ...row, user_id: user.id });
  if (error) return { ok: false, message: "We couldn't save your profile. Please check your details and try again." };

  revalidatePath("/pro", "layout");
  if (!existing) return { ok: true, message: "Application received. We'll check your registration and let you know." };
  return { ok: true, message: "Profile saved." };
}

export async function completeConsultation(bookingId: string) {
  const { supabase } = await requireUser();
  if (!z.uuid().safeParse(bookingId).success) return;
  await supabase.rpc("complete_consultation", { booking: bookingId });
  revalidatePath("/pro", "layout");
  revalidatePath("/support", "layout");
}
