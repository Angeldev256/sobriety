"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { CallKind } from "@/lib/database.types";
import { env } from "@/lib/env";
import { emailTemplates, sendEmail } from "@/lib/notifications/email";
import { sendPush } from "@/lib/notifications/push";
import { getProfile } from "@/lib/data";
import { normalizePhone, relationshipLabel } from "@/lib/support";
import { createServiceClient, requireUser } from "@/lib/supabase/server";
import { fieldErrorsOf, inviteHelperSchema, supportMessageSchema, type ActionState } from "@/lib/validations";

type InviteState = (NonNullable<ActionState> & { inviteLink?: string; helperName?: string }) | null;

/** Service client for reaching the *other* person (their devices, their inbox). Null when not configured. */
function serviceClient() {
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

/** Loads a connection the viewer belongs to, with the other person's id. */
async function loadOwnConnection(connectionId: string) {
  const { supabase, user } = await requireUser();
  if (!z.uuid().safeParse(connectionId).success) return null;
  const { data: conn } = await supabase.from("support_connections").select("*").eq("id", connectionId).maybeSingle();
  if (!conn || (conn.member_id !== user.id && conn.helper_id !== user.id)) return null;
  const viewerIsMember = conn.member_id === user.id;
  return {
    supabase,
    user,
    conn,
    viewerIsMember,
    peerId: viewerIsMember ? conn.helper_id : conn.member_id,
    viewerName: viewerIsMember ? conn.member_name : conn.helper_name,
  };
}

export async function inviteHelper(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const { supabase, user } = await requireUser();
  const parsed = inviteHelperSchema.safeParse({
    helper_name: formData.get("helper_name"),
    helper_email: formData.get("helper_email"),
    relationship: formData.get("relationship"),
    phone: formData.get("phone") ?? "",
    is_preferred: formData.get("is_preferred") === "on",
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const { phone: rawPhone, ...values } = parsed.data;
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && !phone) return { ok: false, fieldErrors: { phone: ["Please enter a valid phone number, e.g. 0772 123 456."] } };
  if (values.helper_email === user.email?.toLowerCase()) {
    return { ok: false, fieldErrors: { helper_email: ["That's your own email. Please enter your helper's email."] } };
  }

  const profile = await getProfile(supabase, user.id);
  const memberName = profile.display_name?.trim() || "A friend";

  // Only one preferred helper at a time.
  if (values.is_preferred) {
    await supabase.from("support_connections").update({ is_preferred: false }).eq("member_id", user.id).eq("is_preferred", true);
  }

  const { data: created, error } = await supabase
    .from("support_connections")
    .insert({ ...values, phone, member_id: user.id, member_name: memberName })
    .select("invite_token, helper_name, helper_email, relationship")
    .single();

  if (error || !created) {
    if (error?.code === "23505") return { ok: false, fieldErrors: { helper_email: ["You've already invited this person."] } };
    return { ok: false, message: "We couldn't create the invitation. Please try again." };
  }

  const inviteLink = `${env.siteUrl}/support/invite/${created.invite_token}`;
  const emailed = await sendEmail(created.helper_email, emailTemplates.supportInvite(memberName, relationshipLabel(created.relationship), inviteLink));

  revalidatePath("/support");
  return {
    ok: true,
    inviteLink,
    helperName: created.helper_name,
    message: emailed
      ? `Invitation emailed to ${created.helper_name}. You can also share the link below.`
      : `Invitation ready. Share the link below with ${created.helper_name} — by WhatsApp, SMS or email.`,
  };
}

const prefsSchema = z.object({
  connection_id: z.uuid(),
  is_preferred: z.boolean().optional(),
  share_progress: z.boolean().optional(),
  phone: z.string().max(30).optional(),
});

/** Member-only settings for one helper: preferred, progress sharing, phone. */
export async function updateConnectionPrefs(input: z.input<typeof prefsSchema>) {
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const ctx = await loadOwnConnection(parsed.data.connection_id);
  if (!ctx || !ctx.viewerIsMember) return { ok: false, message: "Not found." };

  const patch: { is_preferred?: boolean; share_progress?: boolean; phone?: string | null } = {};
  if (parsed.data.share_progress !== undefined) patch.share_progress = parsed.data.share_progress;
  if (parsed.data.phone !== undefined) {
    const phone = parsed.data.phone.trim() ? normalizePhone(parsed.data.phone) : null;
    if (parsed.data.phone.trim() && !phone) return { ok: false, message: "Please enter a valid phone number, e.g. 0772 123 456." };
    patch.phone = phone;
  }
  if (parsed.data.is_preferred !== undefined) {
    if (parsed.data.is_preferred) {
      await ctx.supabase.from("support_connections").update({ is_preferred: false }).eq("member_id", ctx.user.id).eq("is_preferred", true);
    }
    patch.is_preferred = parsed.data.is_preferred;
  }

  const { error } = await ctx.supabase.from("support_connections").update(patch).eq("id", ctx.conn.id);
  if (error) return { ok: false, message: "We couldn't save that. Please try again." };
  revalidatePath("/support", "layout");
  revalidatePath("/dashboard");
  return { ok: true, message: "Saved." };
}

export async function endConnection(connectionId: string) {
  const ctx = await loadOwnConnection(connectionId);
  if (!ctx) return;
  await ctx.supabase.rpc("end_support_connection", { conn: ctx.conn.id });
  revalidatePath("/support", "layout");
  revalidatePath("/dashboard");
  redirect("/support");
}

export async function cancelInvite(connectionId: string) {
  const { supabase, user } = await requireUser();
  if (!z.uuid().safeParse(connectionId).success) return;
  await supabase.from("support_connections").delete().eq("id", connectionId).eq("member_id", user.id).eq("status", "pending");
  revalidatePath("/support");
}

export async function acceptInvite(token: string) {
  const { supabase } = await requireUser();
  if (!z.uuid().safeParse(token).success) return { ok: false, message: "This invitation link isn't valid." };
  const { data, error } = await supabase.rpc("accept_support_invite", { token });
  if (error || !data) {
    const message = /different email/.test(error?.message ?? "")
      ? "This invitation was sent to a different email address. Sign in with that email to accept it."
      : /no longer open/.test(error?.message ?? "")
        ? "This invitation has already been used or cancelled."
        : "We couldn't accept this invitation. Please try again.";
    return { ok: false, message };
  }

  // Let the member know.
  const db = serviceClient();
  if (db) {
    const { data: conn } = await db.from("support_connections").select("member_id, helper_name").eq("id", data).maybeSingle();
    if (conn) {
      await db.from("notifications").insert({
        user_id: conn.member_id,
        kind: "support",
        title: `${conn.helper_name} joined your support circle`,
        body: "You can now message and call them from the Support page.",
        url: `/support/${data}`,
      });
      await sendPush(db, conn.member_id, { title: `${conn.helper_name} joined your circle`, body: "You can now message and call them.", url: `/support/${data}`, tag: "support" });
    }
  }

  revalidatePath("/support", "layout");
  redirect(`/support/${data}`);
}

export async function declineInvite(token: string) {
  const { supabase } = await requireUser();
  if (!z.uuid().safeParse(token).success) return;
  await supabase.rpc("decline_support_invite", { token });
  redirect("/support?declined=1");
}

export type SentMessage = { id: string; connection_id: string; sender_id: string; body: string; created_at: string; read_at: string | null };

export async function sendSupportMessage(connectionId: string, body: string): Promise<{ ok: true; message: SentMessage } | { ok: false; error: string }> {
  const parsed = supportMessageSchema.safeParse({ connection_id: connectionId, body });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message." };
  const ctx = await loadOwnConnection(parsed.data.connection_id);
  if (!ctx || ctx.conn.status !== "active") return { ok: false, error: "This conversation is no longer active." };

  const { data: msg, error } = await ctx.supabase
    .from("support_messages")
    .insert({ connection_id: ctx.conn.id, sender_id: ctx.user.id, body: parsed.data.body })
    .select("*")
    .single();
  if (error || !msg) return { ok: false, error: "Your message didn't send. Please try again." };

  // Push the other person — at most once per 10 minutes per conversation, and never the message text.
  const db = serviceClient();
  if (db && ctx.peerId) {
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await db
      .from("support_messages")
      .select("id", { count: "exact", head: true })
      .eq("connection_id", ctx.conn.id)
      .eq("sender_id", ctx.user.id)
      .gte("created_at", since)
      .neq("id", msg.id);
    if (!count) {
      await sendPush(db, ctx.peerId, { title: `New message from ${ctx.viewerName}`, body: "Open Sobriety Tracker to read it.", url: `/support/${ctx.conn.id}`, tag: `msg-${ctx.conn.id}` });
    }
  }
  return { ok: true, message: msg };
}

export async function markConversationRead(connectionId: string) {
  const { supabase } = await requireUser();
  if (!z.uuid().safeParse(connectionId).success) return;
  await supabase.rpc("mark_support_read", { conn: connectionId });
}

/** Wakes the other person's devices when a call starts (the app may be closed). */
export async function notifyIncomingCall(connectionId: string, kind: CallKind) {
  const ctx = await loadOwnConnection(connectionId);
  const db = serviceClient();
  if (!ctx || !ctx.peerId || !db || ctx.conn.status !== "active") return;
  await sendPush(db, ctx.peerId, {
    title: `${ctx.viewerName} is calling`,
    body: kind === "video" ? "Incoming video call — tap to answer." : "Incoming voice call — tap to answer.",
    url: `/support/${ctx.conn.id}`,
    tag: `call-${ctx.conn.id}`,
  });
}

const callLogSchema = z.object({
  connection_id: z.uuid(),
  kind: z.enum(["audio", "video"]),
  status: z.enum(["completed", "missed", "declined", "failed"]),
  duration_seconds: z.number().int().min(0).max(24 * 3600),
});

/** Recorded by the caller when a call ends. A missed call also leaves a note for the other person. */
export async function logCall(input: z.input<typeof callLogSchema>) {
  const parsed = callLogSchema.safeParse(input);
  if (!parsed.success) return;
  const ctx = await loadOwnConnection(parsed.data.connection_id);
  if (!ctx) return;
  await ctx.supabase.from("call_logs").insert({ ...parsed.data, caller_id: ctx.user.id });

  const db = serviceClient();
  if (parsed.data.status === "missed" && db && ctx.peerId) {
    const what = parsed.data.kind === "video" ? "video call" : "voice call";
    await db.from("notifications").insert({
      user_id: ctx.peerId,
      kind: "call",
      title: `Missed ${what} from ${ctx.viewerName}`,
      body: "Call them back when you can.",
      url: `/support/${ctx.conn.id}`,
    });
    await sendPush(db, ctx.peerId, { title: `Missed ${what}`, body: `${ctx.viewerName} tried to reach you.`, url: `/support/${ctx.conn.id}`, tag: `call-${ctx.conn.id}` });
  }
  revalidatePath(`/support/${ctx.conn.id}`);
}

/** Form wrapper so the invite page can show why an acceptance failed. */
export async function acceptInviteForm(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return acceptInvite(String(formData.get("token") ?? ""));
}
