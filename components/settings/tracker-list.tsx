"use client";

import { useActionState, useState, useTransition } from "react";
import { archiveAddiction, updateAddictionStart } from "@/app/(app)/dashboard/actions";
import { FieldError, FormMessage } from "@/components/form-message";
import { addictionName } from "@/lib/constants";
import type { Addiction } from "@/lib/database.types";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function TrackerRow({ a }: { a: Addiction }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateAddictionStart, null);
  const [local, setLocal] = useState(() => toLocalInput(a.start_date));
  const [archiving, startTransition] = useTransition();

  return (
    <li className="border-b border-border py-5 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg">{addictionName(a)}</p>
        <div className="flex gap-5 text-sm font-semibold">
          <button type="button" className="text-link hover:underline" aria-expanded={editing} onClick={() => setEditing((e) => !e)}>
            {editing ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            className="text-muted hover:text-fg"
            disabled={archiving}
            onClick={() => {
              if (confirm(`Stop tracking ${addictionName(a)}? Your history is kept.`)) startTransition(() => archiveAddiction(a.id));
            }}
          >
            Stop tracking
          </button>
        </div>
      </div>
      {editing && (
        <form action={action} className="mt-6 space-y-6" noValidate>
          <input type="hidden" name="id" value={a.id} />
          <input type="hidden" name="start_date" value={local ? new Date(local).toISOString() : ""} />
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor={`label-${a.id}`} className="label">Name</label>
              <input id={`label-${a.id}`} name="label" defaultValue={a.label ?? ""} maxLength={60} className="input" />
            </div>
            <div>
              <label htmlFor={`start-${a.id}`} className="label">Sobriety start</label>
              <input id={`start-${a.id}`} type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} className="input" />
              <FieldError state={state} name="start_date" />
            </div>
          </div>
          <div>
            <label htmlFor={`reason-${a.id}`} className="label">Your reason</label>
            <textarea id={`reason-${a.id}`} name="reason" rows={2} maxLength={300} defaultValue={a.reason ?? ""} className="input" />
          </div>
          <div className="max-w-xs">
            <label htmlFor={`cost-${a.id}`} className="label">Daily cost</label>
            <input
              id={`cost-${a.id}`}
              name="daily_cost"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              defaultValue={a.daily_cost ?? ""}
              className="input"
            />
            <FieldError state={state} name="daily_cost" />
          </div>
          <FormMessage state={state} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
      )}
    </li>
  );
}

export function TrackerList({ addictions }: { addictions: Addiction[] }) {
  if (addictions.length === 0) return <p className="text-body">You aren&apos;t tracking anything yet. Add a tracker from your overview.</p>;
  return (
    <ul>
      {addictions.map((a) => (
        <TrackerRow key={a.id} a={a} />
      ))}
    </ul>
  );
}
