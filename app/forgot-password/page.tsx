import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell quote={2}>
      <h1 className="display-lg">Reset your password</h1>
      <p className="mt-3 mb-8 text-body">Enter the email you signed up with and we&apos;ll send you a link to choose a new password.</p>
      <ForgotPasswordForm />
      <p className="caption mt-10">
        Remembered it? <Link href="/login" className="link">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
