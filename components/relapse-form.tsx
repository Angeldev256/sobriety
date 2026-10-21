"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { logRelapse } from "@/app/(app)/relapse/[id]/actions";
import { FieldError, FormMessage } from "@/components/form-message";

export function RelapseForm({ addictionId, addictionLabel, days }: { addictionId: string; addictionLabel: string; days: number }) {
  const [state, action, pending] = useActionState(logRelapse, null);
  const [choice, setChoice] = useState<"reset" | "keep" | "">("");

  if (state?.ok) {
    return (
      <div className="animate-rise" role="status">
        <p className="eyebrow">Saved</p>
        <p className="heading-xl mt-3">{state.message}</p>
        <p className="mt-5 leading-relaxed text-body">Be gentle with yourself today. Drink some water, rest, and reach out to someone you trust.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/dashboard" className="btn btn-primary">Back to overview</Link>
          <Link href="/goals" className="btn btn-secondary">Set a small goal</Link>
        </div>
      </div>
    );
  }

  const options = [
    {
      value: "reset" as const,
      title: "Start a fresh counter",
      body: `Your ${days}-day streak stays in your history${days > 0 ? " and counts toward your longest streak" : ""}.`,
    },
    { value: "keep" as const, title: "Keep my counter going", body: "Log this for your own records without restarting your time." },
  ];

  return (
    <form action={action} className="space-y-10" noValidate>
      <input type="hidden" name="addiction_id" value={addictionId} />
      <fieldset>
        <legend className="label">What should happen to your {addictionLabel.toLowerCase()} counter?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((o) => {
            const on = choice === o.value;
            return (
              <label
                key={o.value}
                className={`flex cursor-pointer flex-col rounded-lg border p-6 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--ring)] ${
                  on ? "border-fg bg-fg text-bg" : "border-ash hover:bg-surface-2"
                }`}
              >
                <input type="radio" name="reset_counter" value={o.value} checked={on} onChange={() => setChoice(o.value)} className="sr-only" />
                <span className="font-semibold">{o.title}</span>
                <span className={`mt-2 text-sm leading-relaxed ${on ? "opacity-75" : "text-muted"}`}>{o.body}</span>
              </label>
            );
          })}
        </div>
        <FieldError state={state} name="reset_counter" />
      </fieldset>

      <div>
        <label htmlFor="relapse-note" className="label">
          What happened? <span className="font-normal text-muted">— optional, private</span>
        </label>
        <textarea
          id="relapse-note"
          name="note"
          rows={4}
          maxLength={1000}
          className="input"
          placeholder="Noticing what led up to it can help next time. Only you will see this."
        />
      </div>

      <FormMessage state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending || !choice}>
        {pending ? "Saving…" : "Save and move forward"}
      </button>
    </form>
  );
}
