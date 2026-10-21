import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <AuthShell quote={2}>
      <h1 className="display-lg">Choose a new password</h1>
      {data.user ? (
        <>
          <p className="mt-3 mb-8 text-body">You&apos;re signed in as {data.user.email}.</p>
          <ResetPasswordForm />
        </>
      ) : (
        <>
          <p className="mt-3 text-body">This reset link has expired or was already used.</p>
          <Link href="/forgot-password" className="btn btn-primary mt-8">Request a new link</Link>
        </>
      )}
    </AuthShell>
  );
}
