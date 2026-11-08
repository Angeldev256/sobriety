"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MAX_INTAKE_TURNS, MAX_INTAKES_PER_DAY, formatUgx } from "@/lib/care/constants";
import { assessIntake, IntakeAiError, nextIntakeTurn } from "@/lib/care/intake-ai";
import { settlePayment } from "@/lib/care/payments";
import { looksLikeCrisis } from "@/lib/care/safety";
import { getProfile } from "@/lib/data";
import type { CareIntake, IntakeMessage } from "@/lib/database.types";
import { env } from "@/lib/env";
import { createPaymentLink, PaymentError } from "@/lib/payments/flutterwave";
import { requireUser } from "@/lib/supabase/server";
import { intakeMessageSchema } from "@/lib/validations";

const now = () => new Date().toISOString();

async function loadIntake(intakeId: string) {
  const { supabase, user } = await requireUser();
  if (!z.uuid().safeParse(intakeId).success) return null;
  const { data } = await supabase.from("care_intakes").select("*").eq("id", intakeId).eq("user_id", user.id).maybeSingle();
  return data ? { supabase, user, intake: data as CareIntake } : null;
}

export async function startIntake() {
  const { supabase, user } = await requireUser();
  if (!env.careAiEnabled) redirect("/care?ai=off");

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await supabase.from("care_intakes").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= MAX_INTAKES_PER_DAY) redirect("/care?limit=1");

  const profile = await getProfile(supabase, user.id);
  const first = profile.display_name?.split(" ")[0];
  const greeting: IntakeMessage = {
    role: "assistant",
    at: now(),
    content: `Hi${first ? ` ${first}` : ""}. I'm here to understand what you're going through, so we can connect you with the right professional. There are no wrong answers, and you can stop at any time. What would you like help with?`,
  };
  const { data, error } = await supabase.from("care_intakes").insert({ user_id: user.id, messages: [greeting] }).select("id").single();
  if (error || !data) redirect("/care?error=1");
  redirect(`/care/intake/${data.id}`);
}

export type IntakeReply =
  | { ok: true; messages: IntakeMessage[]; crisis: boolean; readyToMatch: boolean }
  | { ok: false; error: string };

export async function sendIntakeMessage(intakeId: string, text: string): Promise<IntakeReply> {
  const parsed = intakeMessageSchema.safeParse({ intake_id: intakeId, text });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message." };
  const ctx = await loadIntake(intakeId);
  if (!ctx) return { ok: false, error: "This conversation wasn't found." };

  const history = ctx.intake.messages;
  if (history.filter((m) => m.role === "user").length >= MAX_INTAKE_TURNS) {
    return { ok: false, error: "This conversation is full. Please see your matches, or start a new conversation." };
  }

  const withUser: IntakeMessage[] = [...history, { role: "user", content: parsed.data.text, at: now() }];
  let turn;
  try {
    turn = await nextIntakeTurn(withUser);
  } catch (error) {
    console.error("intake turn", error instanceof IntakeAiError ? error.message : error);
    return { ok: false, error: "The assistant couldn't reply just now. Please try sending that again." };
  }

  const messages: IntakeMessage[] = [...withUser, { role: "assistant", content: turn.reply, at: now() }];
  const crisis = ctx.intake.crisis || turn.crisis || looksLikeCrisis(parsed.data.text);
  const { error } = await ctx.supabase
    .from("care_intakes")
    .update({ messages, crisis, updated_at: now() })
    .eq("id", ctx.intake.id);
  if (error) return { ok: false, error: "We couldn't save your message. Please try again." };

  const userTurns = messages.filter((m) => m.role === "user").length;
  return { ok: true, messages, crisis, readyToMatch: turn.ready_to_match || userTurns >= 8 };
}

/** Assesses the conversation (again, if it has grown since) and shows the matches. */
export async function findMatches(intakeId: string): Promise<{ ok: false; error: string } | never> {
  const ctx = await loadIntake(intakeId);
  if (!ctx) return { ok: false, error: "This conversation wasn't found." };
  const { intake } = ctx;
  if (intake.messages.filter((m) => m.role === "user").length < 2) {
    return { ok: false, error: "Tell the assistant a little more first, so we can find the right person." };
  }

  const stored = intake.assessment as { message_count?: number } | null;
  if (!stored || stored.message_count !== intake.messages.length) {
    try {
      const assessment = await assessIntake(intake.messages);
      const { error } = await ctx.supabase
        .from("care_intakes")
        .update({
          status: "assessed",
          assessment: { ...assessment, message_count: intake.messages.length },
          crisis: intake.crisis || assessment.severity === "crisis",
          updated_at: now(),
        })
        .eq("id", intake.id);
      if (error) return { ok: false, error: "We couldn't save your assessment. Please try again." };
    } catch (error) {
      console.error("intake assessment", error);
      return { ok: false, error: "We couldn't finish matching just now. Please try again in a moment." };
    }
  }
  redirect(`/care/intake/${intake.id}/matches`);
}

/** Sends the person to Flutterwave to pay for a booking. */
async function goToPayment(bookingId: string): Promise<{ ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  const { data: booking } = await supabase.from("consultations").select("*").eq("id", bookingId).eq("patient_id", user.id).maybeSingle();
  if (!booking) return { ok: false, error: "This booking wasn't found." };
  if (booking.status !== "awaiting_payment") redirect(`/care/consultations/${booking.id}`);
  if (!env.paymentsEnabled) return { ok: false, error: "Online payment isn't available yet. Please try again later." };
  if (!user.email) return { ok: false, error: "Please add an email address to your account before paying." };

  let link: string;
  try {
    link = await createPaymentLink({
      txRef: booking.tx_ref,
      amountUgx: booking.fee_ugx,
      email: user.email,
      name: booking.patient_name,
      description: `Session with ${booking.professional_name} — ${formatUgx(booking.fee_ugx)}`,
      redirectUrl: `${env.siteUrl}/api/care/payment-callback`,
    });
  } catch (error) {
    console.error("create payment", error instanceof PaymentError ? error.message : error);
    return { ok: false, error: "We couldn't open the payment page. Please try again in a moment." };
  }
  redirect(link);
}

const bookSchema = z.object({
  professional_id: z.uuid(),
  intake_id: z.uuid().nullable(),
  share_summary: z.boolean(),
});

export async function bookConsultation(_prev: { ok: false; error: string } | null, formData: FormData) {
  const parsed = bookSchema.safeParse({
    professional_id: formData.get("professional_id"),
    intake_id: formData.get("intake_id") || null,
    share_summary: formData.get("share_summary") === "on",
  });
  if (!parsed.success) return { ok: false as const, error: "Something was missing from that booking. Please try again." };

  const { supabase } = await requireUser();
  const { data: bookingId, error } = await supabase.rpc("create_consultation", {
    pro: parsed.data.professional_id,
    intake: parsed.data.intake_id,
    share_summary: parsed.data.share_summary,
  });
  if (error || !bookingId) {
    const message = /unavailable/.test(error?.message ?? "")
      ? "This professional isn't taking new patients right now. Please choose someone else."
      : /yourself/.test(error?.message ?? "")
        ? "You can't book a session with yourself."
        : "We couldn't create the booking. Please try again.";
    return { ok: false as const, error: message };
  }
  revalidatePath("/care");
  return goToPayment(bookingId);
}

export async function payConsultation(_prev: { ok: false; error: string } | null, formData: FormData) {
  const id = String(formData.get("booking_id") ?? "");
  if (!z.uuid().safeParse(id).success) return { ok: false as const, error: "This booking wasn't found." };
  return goToPayment(id);
}

export async function cancelConsultation(bookingId: string) {
  const { supabase } = await requireUser();
  if (!z.uuid().safeParse(bookingId).success) return;
  await supabase.rpc("cancel_consultation", { booking: bookingId });
  revalidatePath("/care", "layout");
}

/** "I've paid": asks Flutterwave directly, for when the person closed the payment page early. */
export async function checkPayment(bookingId: string): Promise<{ message: string }> {
  const { supabase, user } = await requireUser();
  if (!z.uuid().safeParse(bookingId).success) return { message: "This booking wasn't found." };
  const { data: booking } = await supabase.from("consultations").select("tx_ref, status").eq("id", bookingId).eq("patient_id", user.id).maybeSingle();
  if (!booking) return { message: "This booking wasn't found." };
  if (booking.status !== "awaiting_payment") {
    revalidatePath(`/care/consultations/${bookingId}`);
    return { message: "This booking is already up to date." };
  }
  if (!env.paymentsEnabled) return { message: "Online payment isn't available yet." };

  try {
    const { result } = await settlePayment({ txRef: booking.tx_ref });
    revalidatePath(`/care/consultations/${bookingId}`);
    revalidatePath("/care");
    if (result === "paid" || result === "already_paid") return { message: "Payment confirmed. Your session room is open." };
    if (result === "pending") return { message: "We haven't received the payment yet. Mobile Money can take a few minutes — please check again shortly." };
    return { message: "That payment didn't go through. You can try paying again." };
  } catch (error) {
    console.error("check payment", error);
    return { message: "We couldn't check with the payment provider just now. Please try again in a moment." };
  }
}
