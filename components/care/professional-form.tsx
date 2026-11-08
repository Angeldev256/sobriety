"use client";

import { useState, useTransition } from "react";
import { saveProfessional } from "@/app/(app)/pro/actions";
import { FieldError, FormMessage } from "@/components/form-message";
import { LANGUAGES, LICENCE_BODIES, PROFESSIONS, SESSION_MODES, SPECIALTIES } from "@/lib/care/constants";
import type { Professional } from "@/lib/database.types";
import type { ActionState } from "@/lib/validations";

const chip =
  "chip has-[:checked]:border-fg has-[:checked]:bg-fg has-[:checked]:text-bg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--ring)]";

function Chips({ name, options, selected }: { name: string; options: { value: string; label: string }[]; selected: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o.value} className={chip}>
          <input type="checkbox" name={name} value={o.value} defaultChecked={selected.includes(o.value)} className="sr-only" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export function ProfessionalForm({ existing, defaultName }: { existing: Professional | null; defaultName: string }) {
  // Submitted by hand rather than with <form action>, which would clear this long form on a validation error.
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  const p = existing;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(async () => setState(await saveProfessional(null, data)));
      }}
      className="space-y-8"
      noValidate
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="full_name" className="label">Full name, as registered</label>
          <input id="full_name" name="full_name" className="input" maxLength={80} defaultValue={p?.full_name ?? defaultName} autoComplete="name" />
          <FieldError state={state} name="full_name" />
        </div>
        <div>
          <label htmlFor="profession" className="label">Profession</label>
          <select id="profession" name="profession" className="input" defaultValue={p?.profession ?? ""}>
            <option value="" disabled>Choose…</option>
            {PROFESSIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
          <FieldError state={state} name="profession" />
        </div>
        <div>
          <label htmlFor="licence_body" className="label">Registered with</label>
          <input id="licence_body" name="licence_body" className="input" list="licence-bodies" maxLength={120} defaultValue={p?.licence_body ?? ""} />
          <datalist id="licence-bodies">{LICENCE_BODIES.map((b) => <option key={b} value={b} />)}</datalist>
          <FieldError state={state} name="licence_body" />
        </div>
        <div>
          <label htmlFor="licence_number" className="label">Registration / licence number</label>
          <input id="licence_number" name="licence_number" className="input" maxLength={60} defaultValue={p?.licence_number ?? ""} />
          <FieldError state={state} name="licence_number" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="institution" className="label">Where you work <span className="font-normal text-muted">— optional</span></label>
          <input id="institution" name="institution" className="input" maxLength={120} placeholder="e.g. Butabika National Referral Hospital" defaultValue={p?.institution ?? ""} />
          <FieldError state={state} name="institution" />
        </div>
      </div>
      {p?.status === "verified" && (
        <p className="caption">Changing your profession or registration details sends your profile back for verification.</p>
      )}

      <div>
        <label htmlFor="bio" className="label">About you, for patients</label>
        <textarea id="bio" name="bio" rows={5} maxLength={1200} className="input" defaultValue={p?.bio ?? ""}
          placeholder="Your experience, how you work, and who you help most." />
        <FieldError state={state} name="bio" />
      </div>

      <fieldset>
        <legend className="label">Areas you work in</legend>
        <Chips name="specialties" options={SPECIALTIES} selected={p?.specialties ?? []} />
        <FieldError state={state} name="specialties" />
      </fieldset>

      <fieldset>
        <legend className="label">Languages you can hold a session in</legend>
        <Chips name="languages" options={LANGUAGES.map((l) => ({ value: l, label: l }))} selected={p?.languages ?? ["English"]} />
        <FieldError state={state} name="languages" />
      </fieldset>

      <fieldset>
        <legend className="label">Session types you offer</legend>
        <Chips name="session_modes" options={SESSION_MODES} selected={p?.session_modes ?? ["chat", "audio", "video"]} />
        <FieldError state={state} name="session_modes" />
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="fee_ugx" className="label">Your fee per session (UGX)</label>
          <input id="fee_ugx" name="fee_ugx" type="number" inputMode="numeric" min={5000} max={2000000} step={500} className="input" defaultValue={p?.fee_ugx ?? 50000} />
          <p className="caption mt-2">This is the price patients pay, including the platform fee.</p>
          <FieldError state={state} name="fee_ugx" />
        </div>
        <div>
          <label htmlFor="payout_phone" className="label">Mobile Money number for payouts <span className="font-normal text-muted">— optional</span></label>
          <input id="payout_phone" name="payout_phone" type="tel" inputMode="tel" className="input" placeholder="0772 123 456" defaultValue={p?.payout_phone ?? ""} />
          <p className="caption mt-2">Only visible to you and our admins.</p>
          <FieldError state={state} name="payout_phone" />
        </div>
      </div>

      <label className="flex gap-3 text-sm leading-relaxed">
        <input type="checkbox" name="accepting_patients" defaultChecked={p?.accepting_patients ?? true} className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
        <span>
          <span className="font-semibold">Accepting new patients</span>
          <span className="block text-muted">Turn this off to stop appearing in matches. Your current patients aren&apos;t affected.</span>
        </span>
      </label>

      <label className="flex gap-3 text-sm leading-relaxed">
        <input type="checkbox" name="agree" className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
        <span>
          I confirm these details are true, my registration is current, and I&apos;ll follow my professional body&apos;s code of conduct,
          including confidentiality, with patients I meet here.
        </span>
      </label>
      <FieldError state={state} name="agree" />

      <FormMessage state={state} />
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>
        {pending ? "Saving…" : p ? "Save profile" : "Submit application"}
      </button>
    </form>
  );
}
