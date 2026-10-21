"use client";

import { useActionState, useEffect, useState } from "react";
import { createAddiction } from "@/app/(app)/dashboard/actions";
import { FieldError, FormMessage } from "@/components/form-message";
import { ADDICTION_TYPES } from "@/lib/constants";

function nowLocalInput() {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** Start tracking an addiction. The local date/time is converted to an absolute instant in the browser. */
export function AddictionForm({ onDone }: { onDone?: () => void }) {
  const [state, action, pending] = useActionState(createAddiction, null);
  const [type, setType] = useState("alcohol");
  // Filled after mount: the server doesn't know the browser's time zone.
  const [local, setLocal] = useState("");
  const iso = local ? new Date(local).toISOString() : "";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needs the browser clock/time zone
    setLocal(nowLocalInput());
  }, []);

  useEffect(() => {
    if (state?.ok) onDone?.();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-8" noValidate>
      <fieldset>
        <legend className="label">What are you recovering from?</legend>
        <div className="flex flex-wrap gap-2">
          {ADDICTION_TYPES.map((t) => (
            <label key={t.value} className={`chip ${type === t.value ? "chip-on" : ""}`}>
              <input type="radio" name="type" value={t.value} checked={type === t.value} onChange={() => setType(t.value)} className="sr-only" />
              {t.label}
            </label>
          ))}
        </div>
        <FieldError state={state} name="type" />
      </fieldset>

      <div>
        <label htmlFor="label" className="label">
          Name <span className="font-normal text-muted">— optional</span>
        </label>
        <input id="label" name="label" className="input" maxLength={60} placeholder={type === "other" ? "e.g. Social media" : "e.g. Wine"} />
        <FieldError state={state} name="label" />
      </div>

      <div>
        <label htmlFor="start_local" className="label">When did your sobriety start?</label>
        <input
          id="start_local"
          type="datetime-local"
          className="input"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          aria-describedby="start-help start_date-error"
          required
        />
        <p id="start-help" className="caption mt-2">Your best guess is perfect. You can change it later.</p>
        <input type="hidden" name="start_date" value={iso} />
        <FieldError state={state} name="start_date" />
      </div>

      <div>
        <label htmlFor="reason" className="label">
          Why does this matter to you? <span className="font-normal text-muted">— optional, private</span>
        </label>
        <textarea id="reason" name="reason" rows={2} maxLength={300} className="input" placeholder="e.g. To be present for my kids" />
        <p className="caption mt-2">We&apos;ll show this back to you on hard days.</p>
        <FieldError state={state} name="reason" />
      </div>

      <div className="max-w-xs">
        <label htmlFor="daily_cost" className="label">
          Roughly what did it cost per day? <span className="font-normal text-muted">— optional</span>
        </label>
        <input id="daily_cost" name="daily_cost" type="number" inputMode="decimal" min={0} step="0.01" className="input" placeholder="0.00" />
        <p className="caption mt-2">Used to show how much you&apos;ve saved.</p>
        <FieldError state={state} name="daily_cost" />
      </div>

      <FormMessage state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Start tracking"}
      </button>
    </form>
  );
}
