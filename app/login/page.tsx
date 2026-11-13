import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm, SignUpForm } from "@/components/auth/auth-forms";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  auth: "We couldn't sign you in. Please try again.",
  link: "That link has expired or was opened in a different browser. Please sign in, or request a new link.",
};

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "your overview",
  "/check-in": "check-ins",
  "/goals": "goals",
  "/support": "your support circle",
  "/milestones": "milestones",
  "/history": "your progress",
  "/notifications": "notifications",
  "/settings": "settings",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const rawNext = typeof params.next === "string" ? params.next : null;
  const next = safeNextPath(rawNext);
  const mode = params.mode === "signup" ? "signup" : "signin";
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  const nextPath = next.split("?")[0];
  const isInvite = Boolean(rawNext) && nextPath.startsWith("/support/invite/");
  const gatedFeature = rawNext && !isInvite ? Object.entries(PAGE_LABELS).find(([k]) => nextPath === k || nextPath.startsWith(`${k}/`))?.[1] : undefined;
  const tab = (m: string) => `/login?${new URLSearchParams({ mode: m, ...(rawNext ? { next } : {}) })}`;

  return (
    <AuthShell quote={mode === "signup" ? 1 : 0}>
      {!isSupabaseConfigured() && (
        <div role="alert" className="mb-8 rounded-lg border border-danger p-5">
          <p className="font-semibold text-danger">Sign-in isn&apos;t connected yet</p>
          <p className="caption mt-1">
            This copy of the app has no Supabase project configured, so accounts can&apos;t be created. Add the project URL and
            publishable key to <code>.env.local</code> (see the README), then restart the server.
          </p>
        </div>
      )}
      {isInvite && (
        <div className="mb-8 rounded-lg bg-surface-2 p-5">
          <p className="font-semibold">You&apos;ve been invited to a support circle</p>
          <p className="caption mt-1">
            Sign in, or create a free account with the email address the invitation was sent to. You&apos;ll come straight back to accept it.
          </p>
        </div>
      )}
      {gatedFeature && (
        <div className="mb-8 rounded-lg bg-surface-2 p-5">
          <p className="font-semibold">Sign in to start tracking</p>
          <p className="caption mt-1">
            To use {gatedFeature}, you&apos;ll need a free account so your progress is saved privately. Help lines and resources
            stay open to everyone.
          </p>
        </div>
      )}

      <h1 className="display-lg">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
      <p className="mt-3 text-body">
        {mode === "signup" ? "Free, private and yours. It takes under a minute." : "Sign in to continue your journey."}
      </p>

      <div role="tablist" aria-label="Sign in or create an account" className="mt-8 grid grid-cols-2 rounded-full bg-surface-2 p-1">
        {(["signin", "signup"] as const).map((m) => (
          <Link
            key={m}
            role="tab"
            aria-selected={mode === m}
            href={tab(m)}
            replace
            className={`flex h-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
              mode === m ? "bg-surface text-fg shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "text-muted hover:text-fg"
            }`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </Link>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-6 border-l-2 border-danger py-1 pl-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-8">{mode === "signup" ? <SignUpForm next={next} /> : <SignInForm next={next} />}</div>

      {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" && (
        <>
          <div className="my-8 flex items-center gap-4 text-xs text-muted" aria-hidden>
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <GoogleSignInButton next={next} />
        </>
      )}

      <p className="caption mt-10">
        Not ready to sign up? You can still use the <Link href="/help" className="link">help lines</Link> and{" "}
        <Link href="/resources" className="link">resources</Link> without an account.
      </p>
    </AuthShell>
  );
}
