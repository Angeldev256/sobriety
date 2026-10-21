"use client";

import Link from "next/link";
import { useState } from "react";
import { nextMilestone } from "@/lib/recovery/milestones";
import { soberDuration } from "@/lib/recovery/time";

/** Guest-friendly calculator: see your sober time without an account, then choose to save it. */
export function SoberCalculator() {
  const [date, setDate] = useState("");
  const d = date ? soberDuration(new Date(`${date}T00:00:00`)) : null;
  const m = d ? nextMilestone(d.days) : null;
  const weeks = d ? Math.floor(d.days / 7) : 0;

  return (
    <div className="grid gap-10 md:grid-cols-2 md:items-end">
      <div>
        <label htmlFor="calc-date" className="label">When did your sober time start?</label>
        <input
          id="calc-date"
          type="date"
          className="input max-w-xs"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <p className="caption mt-3">Nothing is saved unless you create an account.</p>
      </div>

      <div aria-live="polite">
        {d && m ? (
          <div className="animate-rise">
            <p className="flex items-baseline gap-3">
              <span className="text-7xl leading-none font-light tracking-tight tabular-nums">{d.days}</span>
              <span className="text-xl font-light text-muted">{d.days === 1 ? "day" : "days"}</span>
            </p>
            <p className="mt-3 text-body">
              {weeks > 0 ? `That's ${weeks} ${weeks === 1 ? "week" : "weeks"}. ` : ""}
              {m.daysToGo} {m.daysToGo === 1 ? "day" : "days"} until your {m.next}-day milestone.
            </p>
            <Link href="/login?mode=signup&next=/dashboard" className="btn btn-primary mt-6">
              Save this and track privately
            </Link>
          </div>
        ) : (
          <p className="text-lg font-light text-muted">Your sober time will appear here.</p>
        )}
      </div>
    </div>
  );
}
