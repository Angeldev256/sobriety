"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { announcePaid } from "@/lib/care/payments";
import { notify } from "@/lib/notifications/notify";
import { createServiceClient, requireUser } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/validations";

async function requireAdmin() {
  const ctx = await requireUser();
  const { data } = await ctx.supabase.rpc("is_admin");
  if (!data) throw new Error("Admins only");
  return ctx;
}

function serviceClient() {
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

const reviewSchema = z.object({
  user_id: z.uuid(),
  decision: z.enum(["verified", "rejected", "suspended"]),
  note: z.string().trim().max(500),
});

export async function reviewProfessional(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = reviewSchema.safeParse({ user_id: formData.get("user_id"), decision: formData.get("decision"), note: formData.get("note") ?? "" });
  if (!parsed.success) return { ok: false, message: "Please choose a decision." };
  const { user_id, decision, note } = parsed.data;
  if (decision !== "verified" && !note) return { ok: false, message: "Please add a note explaining why, so they can fix it." };

  const { error } = await supabase.rpc("review_professional", { pro: user_id, decision, note });
  if (error) return { ok: false, message: "We couldn't save that decision." };

  const db = serviceClient();
  if (db) {
    const copy = {
      verified: { title: "You're verified", body: "Patients can now be matched with you." },
      rejected: { title: "We couldn't verify your application", body: "Please see the note on your professional page." },
      suspended: { title: "Your professional profile is suspended", body: "Please see the note on your professional page." },
    }[decision];
    await notify(db, user_id, { kind: "support", ...copy, url: "/pro", push: true });
  }
  revalidatePath("/admin");
  return { ok: true, message: "Saved." };
}

export async function setPlatformFee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = z.coerce.number().min(0).max(50).safeParse(formData.get("platform_fee_percent"));
  if (!parsed.success) return { ok: false, message: "Enter a percentage between 0 and 50." };
  const { error } = await supabase
    .from("app_settings")
    .update({ platform_fee_percent: Math.round(parsed.data * 100) / 100, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return { ok: false, message: "We couldn't save the fee." };
  revalidatePath("/admin");
  return { ok: true, message: "Saved. New bookings use this percentage; existing bookings keep theirs." };
}

/** For a payment received outside Flutterwave (e.g. direct Mobile Money). */
export async function markPaidManually(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("booking_id") ?? "");
  const reference = String(formData.get("reference") ?? "").trim().slice(0, 100);
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Booking not found." };
  if (!reference) return { ok: false, message: "Enter the payment reference (e.g. the Mobile Money transaction ID)." };

  const { data: room, error } = await supabase.rpc("admin_mark_consultation_paid", { booking: id, reference });
  if (error || !room) {
    return { ok: false, message: error?.code === "23505" ? "That payment reference is already used on another booking." : "We couldn't mark it paid." };
  }
  const { data: booking } = await supabase.from("consultations").select("*").eq("id", id).maybeSingle();
  if (booking && serviceClient()) await announcePaid(booking, room);
  revalidatePath("/admin");
  return { ok: true, message: "Marked paid. The session room is open." };
}

export async function refundConsultation(bookingId: string) {
  const { supabase } = await requireAdmin();
  if (!z.uuid().safeParse(bookingId).success) return;
  await supabase.rpc("admin_refund_consultation", { booking: bookingId });
  revalidatePath("/admin");
}
