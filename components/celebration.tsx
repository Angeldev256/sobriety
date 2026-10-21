"use client";

import { useEffect, useRef, useState } from "react";
import { markAchievementsSeen } from "@/app/(app)/dashboard/actions";
import { ProgressRing } from "@/components/progress-ring";
import type { AchievementKind } from "@/lib/database.types";

type Item = { id: string; kind: AchievementKind; threshold: number; title: string; description: string };

const UNIT: Record<AchievementKind, (n: number) => string> = {
  sober_days: (n) => (n === 1 ? "day" : "days"),
  checkin_streak: () => "check-ins",
  goals_completed: (n) => (n === 1 ? "goal" : "goals"),
};

/** Quiet, typographic celebration: a ring draws closed around the milestone number. */
export function Celebration({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(items.length > 0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const marked = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog || dialog.open) return;
    dialog.showModal();
    if (!marked.current) {
      marked.current = true;
      void markAchievementsSeen(items.map((i) => i.id));
    }
  }, [open, items]);

  if (!open || items.length === 0) return null;
  const [top, ...rest] = items;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="celebrate-title"
      onClose={() => setOpen(false)}
      className="m-auto w-[min(92vw,28rem)] rounded-lg bg-inverse p-0 text-inverse-fg backdrop:bg-black/70 dark:border dark:border-inverse-border"
    >
      <div className="flex flex-col items-center px-8 pt-12 pb-8 text-center">
        <ProgressRing value={1} tone="inverse" size={184} label="Milestone reached">
          <span className="text-6xl leading-none font-light tabular-nums">{top.threshold}</span>
          <span className="mt-2 text-xs tracking-[0.08em] text-inverse-muted uppercase">{UNIT[top.kind](top.threshold)}</span>
        </ProgressRing>
        <p className="mt-8 text-xs font-medium tracking-[0.08em] text-inverse-muted uppercase">Milestone reached</p>
        <h2 id="celebrate-title" className="animate-rise mt-2 text-3xl font-light">
          {top.title}
        </h2>
        <p className="animate-rise mt-3 text-inverse-muted [animation-delay:120ms]">{top.description}</p>
        {rest.length > 0 && <p className="mt-5 text-sm text-inverse-muted">Also earned: {rest.map((r) => r.title).join(", ")}</p>}
        <form method="dialog" className="mt-10 w-full">
          <button className="btn btn-primary w-full" autoFocus>
            Continue
          </button>
        </form>
      </div>
    </dialog>
  );
}
