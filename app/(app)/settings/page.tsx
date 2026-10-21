import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { PushToggle } from "@/components/notifications/push-toggle";
import { DeleteAccountForm, NotificationForm, ProfileForm } from "@/components/settings/settings-forms";
import { TrackerList } from "@/components/settings/tracker-list";
import { getActiveAddictions, getProfile } from "@/lib/data";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

/** Two-column settings row: title and description left, controls right. */
function Section({ id, title, description, children, danger }: { id: string; title: string; description?: ReactNode; children: ReactNode; danger?: boolean }) {
  return (
    <section aria-labelledby={id} className="grid gap-6 border-t border-border py-12 md:grid-cols-[16rem_1fr] md:gap-16">
      <div>
        <h2 id={id} className={`heading-md ${danger ? "text-danger" : ""}`}>{title}</h2>
        {description && <p className="caption mt-3">{description}</p>}
      </div>
      <div className="max-w-xl">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const [profile, addictions, { data: reminder }, { data: favIds }] = await Promise.all([
    getProfile(supabase, user.id),
    getActiveAddictions(supabase, user.id),
    supabase.from("reminder_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("favorite_messages").select("message_id").eq("user_id", user.id),
  ]);
  const provider = user.app_metadata?.provider;
  const { data: favorites } = favIds?.length
    ? await supabase.from("messages").select("*").in("id", favIds.map((f) => f.message_id))
    : { data: [] };

  return (
    <div>
      <header className="pb-12">
        <p className="eyebrow">Settings</p>
        <h1 className="display-lg mt-3">Your account</h1>
        <nav aria-label="Account" className="mt-8 flex flex-wrap gap-2 lg:hidden">
          <Link href="/goals" className="chip">Goals</Link>
          <Link href="/milestones" className="chip">Milestones</Link>
          <Link href="/notifications" className="chip">Notifications</Link>
          <Link href="#notifications" className="chip">Reminders</Link>
        </nav>
      </header>

      <Section
        id="profile-heading"
        title="Profile"
        description={
          <>
            Signed in {provider === "google" ? "with Google " : ""}as {user.email}.
            {provider !== "google" && (
              <>
                {" "}
                <Link href="/forgot-password" className="link">Change password</Link>
              </>
            )}
          </>
        }
      >
        <ProfileForm profile={profile} />
      </Section>

      <Section id="notifications" title="Notifications" description="Gentle, discreet reminders. Nothing personal ever shows on your lock screen.">
        <div className="space-y-8">
          <PushToggle vapidKey={env.pushEnabled ? env.vapidPublicKey! : null} />
          <NotificationForm
            emailAvailable={env.emailEnabled}
            prefs={{
              enabled: reminder?.enabled ?? true,
              time: (reminder?.reminder_time ?? "20:00").slice(0, 5),
              emailEnabled: reminder?.email_enabled ?? false,
              milestoneAlerts: reminder?.milestone_alerts ?? true,
              encouragement: reminder?.encouragement ?? true,
            }}
          />
        </div>
      </Section>

      <Section id="trackers-heading" title="Trackers" description="Rename a tracker, update your reason or daily cost, correct its start date, or stop tracking it. History is always kept.">
        <TrackerList addictions={addictions} />
      </Section>

      {favorites && favorites.length > 0 && (
        <Section id="fav-heading" title="Saved reflections">
          <ul className="space-y-6">
            {favorites.map((f) => (
              <li key={f.id} className="border-l-2 border-primary pl-5 text-lg font-light leading-relaxed">{f.body}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="export-heading" title="Your data" description="Your data belongs to you. Download a copy at any time.">
        <div className="flex flex-wrap gap-3">
          <a href="/api/export?format=csv" className="btn btn-secondary" download>Check-ins · CSV</a>
          <a href="/api/export?format=json" className="btn btn-secondary" download>Everything · JSON</a>
        </div>
      </Section>

      <Section id="signout-heading" title="Sign out" description="Signing out on a shared device keeps your recovery private.">
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn btn-secondary">Sign out</button>
        </form>
      </Section>

      <Section
        id="delete-heading"
        title="Delete account"
        danger
        description="Permanently deletes your account and every check-in, goal, milestone and note. This can't be undone."
      >
        <DeleteAccountForm />
      </Section>
    </div>
  );
}
