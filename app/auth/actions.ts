"use server";

import { redirect } from "next/navigation";
import { env, isSupabaseConfigured, NOT_CONFIGURED_MESSAGE } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { emailOnlySchema, fieldErrorsOf, newPasswordSchema, signInSchema, signUpSchema, type ActionState } from "@/lib/validations";

// Supabase Auth rate-limits sign-in, sign-up and email sends per IP and per address, and
// returns a 429 we translate below. Error messages never reveal whether an email is registered.

type AuthState = (NonNullable<ActionState> & { email?: string; needsConfirmation?: boolean }) | null;

const NETWORK_MESSAGE = "We couldn't reach the sign-in service. Check your internet connection and try again.";

/** Runs a Supabase auth call, turning a missing setup or a dropped connection into a friendly message. */
async function guarded<T>(fn: () => Promise<T>): Promise<T | { failed: string }> {
  if (!isSupabaseConfigured()) return { failed: NOT_CONFIGURED_MESSAGE };
  try {
    return await fn();
  } catch {
    return { failed: NETWORK_MESSAGE };
  }
}
const isFailure = (r: unknown): r is { failed: string } => typeof r === "object" && r !== null && "failed" in r;

function friendly(message: string, status?: number) {
  if (status === 429 || /rate limit/i.test(message)) return "Too many attempts. Please wait a minute and try again.";
  if (/invalid login credentials/i.test(message)) return "That email and password don't match. Please try again.";
  if (/email not confirmed/i.test(message)) return "Please confirm your email first — check your inbox for the link.";
  if (/not authori[sz]ed|error sending confirmation|sending.*email/i.test(message)) {
    return "We couldn't send the confirmation email to this address. The app's email sending isn't fully set up yet — please try again later.";
  }
  if (/user already registered/i.test(message)) return "An account with this email already exists. Try signing in instead.";
  if (/password/i.test(message) && /weak|pwned|leaked/i.test(message)) return "That password has appeared in a data breach. Please choose a different one.";
  return "Something went wrong. Please try again.";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const result = await guarded(async () => (await createClient()).auth.signInWithPassword(parsed.data));
  if (isFailure(result)) return { ok: false, email: parsed.data.email, message: result.failed };
  const { error } = result;
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
  const result = await guarded(async () =>
    (await createClient()).auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.display_name },
        emailRedirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    }),
  );
  if (isFailure(result)) return { ok: false, message: result.failed };
  const { data, error } = result;
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
  const result = await guarded(async () =>
    (await createClient()).auth.resend({
      type: "signup",
      email: parsed.data.email,
      options: { emailRedirectTo: `${env.siteUrl}/auth/callback?next=/dashboard` },
    }),
  );
  if (isFailure(result)) return { ok: false, message: result.failed };
  const { error } = result;
  if (error) return { ok: false, message: friendly(error.message, error.status) };
  return { ok: true, message: "We've sent a new confirmation link." };
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailOnlySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const result = await guarded(async () =>
    (await createClient()).auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${env.siteUrl}/auth/callback?next=/reset-password`,
    }),
  );
  if (isFailure(result)) return { ok: false, message: result.failed };
  const { error } = result;
  if (error?.status === 429) return { ok: false, message: friendly(error.message, 429) };

  // Same answer whether or not the account exists.
  return { ok: true, message: "If an account exists for that email, a reset link is on its way. It expires in one hour." };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = newPasswordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  if (!isSupabaseConfigured()) return { ok: false, message: NOT_CONFIGURED_MESSAGE };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, message: "Your reset link has expired. Please request a new one." };

  const result = await guarded(() => supabase.auth.updateUser({ password: parsed.data.password }));
  if (isFailure(result)) return { ok: false, message: result.failed };
  const { error } = result;
  if (error) return { ok: false, message: friendly(error.message, error.status) };
  redirect("/dashboard?password=updated");
}
