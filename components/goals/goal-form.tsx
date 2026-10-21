"use client";

import { useActionState, useEffect, useRef } from "react";
import { createGoal, updateGoal } from "@/app/(app)/goals/actions";
import { FieldError, FormMessage } from "@/components/form-message";
import type { Goal } from "@/lib/database.types";
import { GOAL_STATUSES } from "@/lib/constants";

export function GoalForm({ goal, onDone }: { goal?: Goal; onDone?: () => void }) {
  const [state, action, pending] = useActionState(goal ? updateGoal : createGoal, null);
  const formRef = useRef<HTMLFormElement>(null);
  const prefix = goal ? `goal-${goal.id}` : "new-goal";

  useEffect(() => {
    if (!state?.ok) return;
    if (!goal) formRef.current?.reset();
    onDone?.();
  }, [state, goal, onDone]);

  return (
    <form ref={formRef} action={action} className="space-y-6" noValidate>
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <div>
        <label htmlFor={`${prefix}-title`} className="label">Goal</label>
        <input id={`${prefix}-title`} name="title" required maxLength={120} defaultValue={goal?.title} className="input" placeholder="Attend a meeting this week" />
        <FieldError state={state} name="title" />
      </div>
      <div>
        <label htmlFor={`${prefix}-description`} className="label">
          Details <span className="font-normal text-muted">— optional</span>
        </label>
        <textarea id={`${prefix}-description`} name="description" rows={3} maxLength={1000} defaultValue={goal?.description ?? ""} className="input" />
        <FieldError state={state} name="description" />
      </div>
      <div className={`grid gap-6 ${goal ? "sm:grid-cols-2" : ""}`}>
        <div>
          <label htmlFor={`${prefix}-target`} className="label">
            Target date <span className="font-normal text-muted">— optional</span>
          </label>
          <input id={`${prefix}-target`} type="date" name="target_date" defaultValue={goal?.target_date ?? ""} className="input" />
          <FieldError state={state} name="target_date" />
        </div>
        <div>
          <label htmlFor={`${prefix}-status`} className="label">Status</label>
          <select id={`${prefix}-status`} name="status" defaultValue={goal?.status ?? "not_started"} className="input">
            {GOAL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={`btn btn-primary ${goal ? "" : "w-full"}`} disabled={pending}>
          {pending ? "Saving…" : goal ? "Save changes" : "Add goal"}
        </button>
        {goal && onDone && (
          <button type="button" className="btn btn-secondary" onClick={onDone}>Cancel</button>
        )}
      </div>
    </form>
  );
}
