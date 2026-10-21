"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteAccount, updateProfile, updateReminders } from "@/app/(app)/settings/actions";
import { FieldError, FormMessage } from "@/components/form-message";
import type { Profile } from "@/lib/database.types";
import { CURRENCIES } from "@/lib/constants";
import { HELPLINES } from "@/lib/helplines";

function applyTheme(theme: string) {
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // storage unavailable (private mode) — theme still applies for this page view
  }
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  const [zones, setZones] = useState<string[]>([profile.timezone]);
  const [theme, setTheme] = useState(profile.theme);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the zone list only exists in the browser
    setZones(Array.from(new Set([profile.timezone, ...Intl.supportedValuesOf("timeZone")])));
  }, [profile.timezone]);

  return (
    <form action={action} className="space-y-8" noValidate>
      <div>
        <label htmlFor="display_name" className="label">Display name</label>
        <input id="display_name" name="display_name" defaultValue={profile.display_name ?? ""} maxLength={60} className="input" required />
        <FieldError state={state} name="display_name" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="timezone" className="label">Time zone</label>
          <select id="timezone" name="timezone" defaultValue={profile.timezone} className="input">
            {zones.map((z) => (
              <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
            ))}
          </select>
          <FieldError state={state} name="timezone" />
        </div>
        <div>
          <label htmlFor="country" className="label">Country (for help lines)</label>
          <select id="country" name="country" defaultValue={profile.country} className="input">
            {HELPLINES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="currency" className="label">Currency (for money saved)</label>
          <select id="currency" name="currency" defaultValue={profile.currency} className="input">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <fieldset>
        <legend className="label">Theme</legend>
        <div className="flex gap-2">
          {(["system", "light", "dark"] as const).map((t) => (
            <label key={t} className={`chip capitalize has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--ring)] ${theme === t ? "chip-on" : ""}`}>
              <input
                type="radio"
                name="theme"
                value={t}
                checked={theme === t}
                onChange={() => {
                  setTheme(t);
                  applyTheme(t);
                }}
                className="sr-only"
              />
              {t}
            </label>
          ))}
        </div>
      </fieldset>
      <FormMessage state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

/** An accessible on/off switch backed by a real checkbox, so it submits with the form. */
function Switch({ name, label, description, defaultChecked }: { name: string; label: string; description?: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6 py-4">
      <span>
        <span className="block font-medium">{label}</span>
        {description && <span className="caption mt-0.5 block">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
        <span
          aria-hidden
          className="h-7 w-12 rounded-full bg-surface-3 transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ring)]"
        />
        <span aria-hidden className="absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export type NotificationPrefs = {
  enabled: boolean;
  time: string;
  emailEnabled: boolean;
  milestoneAlerts: boolean;
  encouragement: boolean;
};

export function NotificationForm({ prefs, emailAvailable }: { prefs: NotificationPrefs; emailAvailable: boolean }) {
  const [state, action, pending] = useActionState(updateReminders, null);
  return (
    <form action={action} className="space-y-6" noValidate>
      <div className="divide-y divide-border border-y border-border">
        <Switch name="enabled" label="Daily check-in reminder" description="Only sent if you haven't checked in yet that day." defaultChecked={prefs.enabled} />
        <div className="flex items-center justify-between gap-6 py-4">
          <label htmlFor="reminder_time" className="font-medium">Reminder time</label>
          <div className="w-36">
            <input id="reminder_time" type="time" name="reminder_time" defaultValue={prefs.time} className="input" required />
          </div>
        </div>
        <Switch name="milestone_alerts" label="Milestone alerts" description="A note when you reach 1, 7, 30, 90 days and beyond." defaultChecked={prefs.milestoneAlerts} />
        <Switch name="encouragement" label="Occasional encouragement" description="A supportive message now and then. Never more than once a week." defaultChecked={prefs.encouragement} />
        {emailAvailable ? (
          <Switch name="email_enabled" label="Also send by email" description="Reminders and milestones to your inbox, worded discreetly." defaultChecked={prefs.emailEnabled} />
        ) : (
          prefs.emailEnabled && <input type="hidden" name="email_enabled" value="on" />
        )}
      </div>
      <FieldError state={state} name="reminder_time" />
      <FormMessage state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, null);
  return (
    <form
      action={action}
      className="space-y-6"
      onSubmit={(e) => {
        if (!confirm("Delete your account and all your data permanently?")) e.preventDefault();
      }}
    >
      <div className="max-w-xs">
        <label htmlFor="confirm" className="label">Type DELETE to confirm</label>
        <input id="confirm" name="confirm" autoComplete="off" className="input" aria-describedby="confirm-error" />
        <FieldError state={state} name="confirm" />
      </div>
      <FormMessage state={state} />
      <button type="submit" className="btn btn-danger" disabled={pending}>
        {pending ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}
