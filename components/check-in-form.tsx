"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveCheckIn } from "@/app/(app)/check-in/actions";
import { FieldError, FormMessage } from "@/components/form-message";
import { CRAVINGS, MOODS, TRIGGERS } from "@/lib/constants";

type Initial = { mood: number; craving_level: number; triggers: string[]; note: string; stayed_sober: boolean } | null;

/** A 1–5 segmented scale: number above, word below. */
function Scale({
  name,
  legend,
  options,
  value,
  onChange,
  state,
}: {
  name: string;
  legend: string;
  options: readonly { value: number; label: string }[];
  value: number;
  onChange: (v: number) => void;
  state: Parameters<typeof FieldError>[0]["state"];
}) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="grid grid-cols-5 overflow-hidden rounded-lg border border-ash">
        {options.map((o, i) => {
          const on = value === o.value;
          return (
            <label
              key={o.value}
              className={`flex cursor-pointer flex-col items-center gap-1 py-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-[var(--ring)] ${
                i > 0 ? "border-l border-ash" : ""
              } ${on ? "bg-fg text-bg" : "hover:bg-surface-2"}`}
            >
              <input type="radio" name={name} value={o.value} checked={on} onChange={() => onChange(o.value)} className="sr-only" />
              <span className="text-2xl font-light tabular-nums">{o.value}</span>
              <span className={`text-[0.6875rem] sm:text-xs ${on ? "opacity-80" : "text-muted"}`}>{o.label}</span>
            </label>
          );
        })}
      </div>
      <FieldError state={state} name={name} />
    </fieldset>
  );
}

export function CheckInForm({ addictionId, addictionLabel, initial }: { addictionId: string; addictionLabel: string; initial: Initial }) {
  const [state, action, pending] = useActionState(saveCheckIn, null);
  const [mood, setMood] = useState(initial?.mood ?? 0);
  const [craving, setCraving] = useState(initial?.craving_level ?? 0);
  const [triggers, setTriggers] = useState<string[]>(initial?.triggers ?? []);
  const [sober, setSober] = useState<"yes" | "no" | "">(initial ? (initial.stayed_sober ? "yes" : "no") : "");

  if (state?.ok) {
    return (
      <div className="animate-rise" role="status">
        <p className="eyebrow">Saved</p>
        <p className="heading-xl mt-3 max-w-xl">{state.message}</p>
        {!state.stayedSober && (
          <p className="mt-5 max-w-xl leading-relaxed text-body">
            A hard day doesn&apos;t undo your progress. If you&apos;d like, you can{" "}
            <Link href={`/relapse/${addictionId}`} className="link">log a slip and choose what happens to your counter</Link>, or{" "}
            <Link href="/help" className="link">talk to someone now</Link>.
          </p>
        )}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/dashboard" className="btn btn-primary">Back to overview</Link>
          <Link href="/history" className="btn btn-secondary">See your progress</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-10" noValidate>
      <input type="hidden" name="addiction_id" value={addictionId} />

      <Scale name="mood" legend="How are you feeling today?" options={MOODS} value={mood} onChange={setMood} state={state} />
      <Scale name="craving_level" legend="How strong were your cravings?" options={CRAVINGS} value={craving} onChange={setCraving} state={state} />

      <fieldset>
        <legend className="label">
          Any triggers today? <span className="font-normal text-muted">— choose any</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {TRIGGERS.map((t) => {
            const on = triggers.includes(t);
            return (
              <label key={t} className={`chip has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--ring)] ${on ? "chip-on" : ""}`}>
                <input
                  type="checkbox"
                  name="triggers"
                  value={t}
                  checked={on}
                  onChange={() => setTriggers((prev) => (on ? prev.filter((x) => x !== t) : [...prev, t]))}
                  className="sr-only"
                />
                {t}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Did you stay {addictionLabel.toLowerCase()}-free today?</legend>
        <div className="grid max-w-md grid-cols-2 gap-3">
          {(["yes", "no"] as const).map((v) => (
            <label key={v} className={`chip h-12 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--ring)] ${sober === v ? "chip-on" : ""}`}>
              <input type="radio" name="stayed_sober" value={v} checked={sober === v} onChange={() => setSober(v)} className="sr-only" />
              {v === "yes" ? "Yes" : "Not today"}
            </label>
          ))}
        </div>
        {sober === "no" && <p className="caption mt-3">That&apos;s okay. Being honest here is part of healing.</p>}
        <FieldError state={state} name="stayed_sober" />
      </fieldset>

      <div>
        <label htmlFor="note" className="label">
          A few words about today <span className="font-normal text-muted">— optional, private</span>
        </label>
        <textarea id="note" name="note" rows={4} maxLength={1000} defaultValue={initial?.note} className="input" placeholder="What helped? What was hard?" />
        <FieldError state={state} name="note" />
      </div>

      <FormMessage state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : initial ? "Update check-in" : "Save check-in"}
      </button>
    </form>
  );
}
