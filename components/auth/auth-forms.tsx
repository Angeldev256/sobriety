"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { requestPasswordReset, resendConfirmation, signIn, signUp, updatePassword } from "@/app/auth/actions";
import { PasswordInput } from "@/components/auth/password-input";
import { FieldError, FormMessage } from "@/components/form-message";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  const [resent, setResent] = useState<string | null>(null);
  const [resending, startResend] = useTransition();

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="signin-email" className="label">Email</label>
        <input id="signin-email" name="email" type="email" autoComplete="email" inputMode="email" required className="input" defaultValue={state?.email} />
        <FieldError state={state} name="email" />
      </div>
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <label htmlFor="signin-password" className="text-sm font-semibold">Password</label>
          <Link href="/forgot-password" className="text-sm text-link hover:underline">Forgot password?</Link>
        </div>
        <PasswordInput id="signin-password" name="password" autoComplete="current-password" />
        <FieldError state={state} name="password" />
      </div>
      <FormMessage state={state} />
      {state?.needsConfirmation && state.email && (
        <button
          type="button"
          className="btn btn-text text-sm"
          disabled={resending}
          onClick={() => startResend(async () => setResent((await resendConfirmation(state.email!))?.message ?? null))}
        >
          {resent ?? "Resend confirmation email"}
        </button>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUp, null);

  if (state?.ok) {
    return (
      <div role="status" className="animate-rise">
        <p className="eyebrow">Almost there</p>
        <h2 className="heading-xl mt-3">Check your email</h2>
        <p className="mt-4 leading-relaxed text-body">
          We sent a confirmation link to <strong className="text-fg">{state.email}</strong>. Open it on this device to finish creating your
          account.
        </p>
        <p className="caption mt-6">Can&apos;t find it? Check your spam folder, or wait a minute and try signing in to resend it.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="signup-name" className="label">What should we call you?</label>
        <input id="signup-name" name="display_name" autoComplete="given-name" maxLength={60} required className="input" />
        <p className="caption mt-2">A first name or nickname is perfect.</p>
        <FieldError state={state} name="display_name" />
      </div>
      <div>
        <label htmlFor="signup-email" className="label">Email</label>
        <input id="signup-email" name="email" type="email" autoComplete="email" inputMode="email" required className="input" />
        <FieldError state={state} name="email" />
      </div>
      <div>
        <label htmlFor="signup-password" className="label">Password</label>
        <PasswordInput id="signup-password" name="password" autoComplete="new-password" describedBy="password-help" />
        <p id="password-help" className="caption mt-2">At least 8 characters, with a letter and a number.</p>
        <FieldError state={state} name="password" />
      </div>
      <div>
        <label htmlFor="signup-confirm" className="label">Confirm password</label>
        <PasswordInput id="signup-confirm" name="confirm" autoComplete="new-password" />
        <FieldError state={state} name="confirm" />
      </div>
      <div>
        <label className="flex gap-3 text-sm leading-relaxed text-body">
          <input type="checkbox" name="agree" className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
          <span>
            I understand Sobriety Tracker is a self-help tool, not medical care. In an emergency I&apos;ll contact local services or a{" "}
            <Link href="/help" className="link">help line</Link>.
          </span>
        </label>
        <FieldError state={state} name="agree" />
      </div>
      <FormMessage state={state} />
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Creating your account…" : "Create free account"}
      </button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  if (state?.ok) {
    return (
      <p role="status" className="border-l-2 border-primary py-1 pl-4 leading-relaxed">
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="space-y-6" noValidate>
      <div>
        <label htmlFor="forgot-email" className="label">Email</label>
        <input id="forgot-email" name="email" type="email" autoComplete="email" inputMode="email" required className="input" />
        <FieldError state={state} name="email" />
      </div>
      <FormMessage state={state} />
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null);
  return (
    <form action={action} className="space-y-6" noValidate>
      <div>
        <label htmlFor="new-password" className="label">New password</label>
        <PasswordInput id="new-password" name="password" autoComplete="new-password" describedBy="new-password-help" />
        <p id="new-password-help" className="caption mt-2">At least 8 characters, with a letter and a number.</p>
        <FieldError state={state} name="password" />
      </div>
      <div>
        <label htmlFor="new-confirm" className="label">Confirm new password</label>
        <PasswordInput id="new-confirm" name="confirm" autoComplete="new-password" />
        <FieldError state={state} name="confirm" />
      </div>
      <FormMessage state={state} />
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
