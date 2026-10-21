"use server";

import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { emailOnlySchema, fieldErrorsOf, newPasswordSchema, signInSchema, signUpSchema, type ActionState } from "@/lib/validations";

// Supabase Auth rate-limits sign-in, sign-up and email sends per IP and per address, and
// returns a 429 we translate below. Error messages never reveal whether an email is registered.

type AuthState = (NonNullable<ActionState> & { email?: string; needsConfirmation?: boolean }) | null;

function friendly(message: string, status?: number) {
  if (status === 429 || /rate limit/i.test(message)) return "Too many attempts. Please wait a minute and try again.";
  if (/invalid login credentials/i.test(message)) return "That email and password don't match. Please try again.";
  if (/email not confirmed/i.test(message)) return "Please confirm your email first — check your inbox for the link.";
  if (/password/i.test(message) && /weak|pwned|leaked/i.test(message)) return "That password has appeared in a data breach. Please choose a different one.";
  return "Something went wrong. Please try again.";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      ok: false,
      email: parsed.data.email,
      needsConfirmation: /email not confirmed/i.test(error.message),
      message: friendly(error.message, error.status),
    };
  }
  redirect(safeNextPath(formData.get("next") as string | null));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    display_name: formData.get("display_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
    agree: formData.get("agree"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const next = safeNextPath(formData.get("next") as string | null);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.display_name },
      emailRedirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { ok: false, message: friendly(error.message, error.status) };

  // Email confirmation turned off in Supabase → we already have a session.
  if (data.session) redirect(`/auth/welcome?next=${encodeURIComponent(next)}`);

  return {
    ok: true,
    email: parsed.data.email,
    message: "Check your inbox. We sent you a link to confirm your email and finish creating your account.",
  };
}

export async function resendConfirmation(email: string): Promise<AuthState> {
  const parsed = emailOnlySchema.safeParse({ email });
  if (!parsed.success) return { ok: false, message: "Please enter a valid email address." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${env.siteUrl}/auth/callback?next=/dashboard` },
  });
  if (error) return { ok: false, message: friendly(error.message, error.status) };
  return { ok: true, message: "We've sent a new confirmation link." };
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailOnlySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.siteUrl}/auth/callback?next=/reset-password`,
  });
  if (error?.status === 429) return { ok: false, message: friendly(error.message, 429) };

  // Same answer whether or not the account exists.
  return { ok: true, message: "If an account exists for that email, a reset link is on its way. It expires in one hour." };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = newPasswordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, message: "Your reset link has expired. Please request a new one." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: friendly(error.message, error.status) };
  redirect("/dashboard?password=updated");
}
