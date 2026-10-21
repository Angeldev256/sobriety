import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SupportCircle } from "@/components/illustrations";
import { InviteActions } from "@/components/support/invite-actions";
import { relationshipLabel } from "@/lib/support";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Support invitation" };

export default async function InvitePage({ params }: PageProps<"/support/invite/[token]">) {
  const { token } = await params;
  const { supabase, user } = await requireUser();
  const valid = /^[0-9a-f-]{36}$/.test(token);
  const { data } = valid ? await supabase.rpc("get_support_invite", { token }) : { data: null };
  const invite = data?.[0];

  let body: ReactNode;
  if (!invite) {
    body = (
      <>
        <h1 className="display-lg">This invitation link isn&apos;t valid.</h1>
        <p className="mt-4 text-lg text-body">Ask the person who invited you to send it again.</p>
      </>
    );
  } else if (invite.is_self) {
    body = (
      <>
        <h1 className="display-lg">This is your own invitation.</h1>
        <p className="mt-4 text-lg text-body">Send this link to {invite.helper_name} so they can accept it.</p>
        <Link href="/support" className="btn btn-secondary mt-8">Back to your support circle</Link>
      </>
    );
  } else if (invite.status !== "pending") {
    body = (
      <>
        <h1 className="display-lg">This invitation is no longer open.</h1>
        <p className="mt-4 text-lg text-body">It may have been accepted, declined or cancelled already.</p>
        <Link href="/support" className="btn btn-secondary mt-8">Go to your support circle</Link>
      </>
    );
  } else if (!invite.email_matches) {
    body = (
      <>
        <h1 className="display-lg">This invitation was sent to a different email.</h1>
        <p className="mt-4 text-lg leading-relaxed text-body">
          You&apos;re signed in as <strong className="text-fg">{user.email}</strong>. Sign out, then sign in or create an account with the
          email address the invitation was sent to.
        </p>
        <form action="/auth/signout" method="post" className="mt-8">
          <button type="submit" className="btn btn-primary">Sign out</button>
        </form>
      </>
    );
  } else {
    body = (
      <>
        <p className="eyebrow">Support invitation</p>
        <h1 className="display-lg mt-3">{invite.member_name} would like your support.</h1>
        <p className="mt-5 text-lg leading-relaxed text-body">
          They&apos;ve asked you to be their {relationshipLabel(invite.relationship).toLowerCase()} on Sobriety Tracker. If you accept,
          you&apos;ll be able to message each other and talk by voice or video call.
        </p>
        <ul className="mt-6 space-y-2 text-body">
          <li>You won&apos;t see their check-ins, notes or relapses.</li>
          <li>They may choose to share how many sober days they have.</li>
          <li>Either of you can end the connection at any time.</li>
        </ul>
        <InviteActions token={token} />
      </>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-[1fr_18rem] md:items-center">
      <div>{body}</div>
      <SupportCircle className="hidden aspect-square w-full rounded-lg md:block" />
    </div>
  );
}
