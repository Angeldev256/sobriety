"use client";

import { useState, useTransition } from "react";
import { deleteGoal, setGoalStatus } from "@/app/(app)/goals/actions";
import { GoalForm } from "@/components/goals/goal-form";
import type { Goal } from "@/lib/database.types";
import { GOAL_STATUSES } from "@/lib/constants";

export function GoalItem({ goal }: { goal: Goal }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const done = goal.status === "completed";
  const statusLabel = GOAL_STATUSES.find((s) => s.value === goal.status)?.label;

  if (editing) {
    return (
      <li className="border-b border-border py-8">
        <GoalForm goal={goal} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className={`group flex gap-5 border-b border-border py-6 ${pending ? "opacity-50" : ""}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark "${goal.title}" as not done` : `Mark "${goal.title}" as done`}
        onClick={() => startTransition(() => setGoalStatus(goal.id, done ? "in_progress" : "completed"))}
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
          done ? "border-primary bg-primary text-white" : "border-ash hover:border-fg"
        }`}
      >
        {done && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="m2.5 6.5 2.25 2.25L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <h3 className={`text-lg ${done ? "text-muted line-through decoration-1" : ""}`}>{goal.title}</h3>
        {goal.description && <p className="mt-1 leading-relaxed text-body">{goal.description}</p>}
        <p className="caption mt-2">
          {statusLabel}
          {goal.target_date &&
            ` · Target ${new Date(`${goal.target_date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
        </p>
      </div>

      <div className="flex shrink-0 items-start gap-4 text-sm font-semibold">
        {goal.status === "not_started" && (
          <button type="button" className="text-link hover:underline" onClick={() => startTransition(() => setGoalStatus(goal.id, "in_progress"))}>
            Start
          </button>
        )}
        <button type="button" className="text-link hover:underline" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button
          type="button"
          className="text-muted hover:text-danger"
          onClick={() => {
            if (confirm(`Delete the goal "${goal.title}"? This can't be undone.`)) startTransition(() => deleteGoal(goal.id));
          }}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
