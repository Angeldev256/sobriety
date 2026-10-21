"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProgressRing } from "@/components/progress-ring";

const NOTES = [
  "Notice the urge without acting on it. Where do you feel it in your body?",
  "Urges rise like a wave. You're riding it — not fighting it.",
  "Take a slow breath. In through the nose, out through the mouth.",
  "Drink some water. Change rooms if you can.",
  "It's already a little different than when you started.",
  "You've handled hard moments before. You can handle this one.",
  "Text or call someone, even just to say hi.",
  "Almost there. The peak has passed or is passing.",
];

/** "Urge surfing": most cravings peak and fade within 15–20 minutes. */
export function UrgeTimer({ signedIn }: { signedIn: boolean }) {
  const [minutes, setMinutes] = useState(10);
  const [left, setLeft] = useState<number | null>(null);
  const running = left !== null && left > 0;
  const done = left === 0;
  const total = minutes * 60;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((l) => (l === null ? null : Math.max(0, l - 1))), 1000);
    return () => clearInterval(id);
  }, [running]);

  const elapsed = left === null ? 0 : total - left;
  const note = NOTES[Math.min(NOTES.length - 1, Math.floor((elapsed / total) * NOTES.length))];
  const mm = String(Math.floor((left ?? total) / 60)).padStart(2, "0");
  const ss = String((left ?? total) % 60).padStart(2, "0");

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        {done ? (
          <div role="status">
            <p className="heading-xl">You rode it out.</p>
            <p className="mt-3 max-w-md leading-relaxed text-body">
              That urge came and went without taking control. That&apos;s real strength — and it gets easier each time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {signedIn ? (
                <Link href="/check-in" className="btn btn-primary">Log how you&apos;re feeling</Link>
              ) : (
                <Link href="/login?mode=signup&next=/check-in" className="btn btn-primary">Track your progress</Link>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setLeft(null)}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Timer length">
              {[5, 10, 15].map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={minutes === m}
                  disabled={running}
                  onClick={() => setMinutes(m)}
                  className={`chip ${minutes === m ? "chip-on" : ""}`}
                >
                  {m} minutes
                </button>
              ))}
            </div>
            <p className="mt-6 max-w-md text-lg leading-relaxed" aria-live="polite">
              {running ? note : "Cravings usually peak and fade within minutes. Start the timer and let it pass — you don't have to do anything else."}
            </p>
            <div className="mt-8 flex gap-3">
              {running ? (
                <button type="button" className="btn btn-secondary" onClick={() => setLeft(null)}>Stop</button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => setLeft(total)}>Start the timer</button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mx-auto">
        <ProgressRing value={left === null ? 0 : elapsed / total} size={224} label="Urge timer progress">
          <span aria-hidden className="text-5xl font-light tabular-nums">
            {mm}:{ss}
          </span>
          <span className="caption mt-1">{running ? "remaining" : done ? "complete" : "ready"}</span>
        </ProgressRing>
      </div>
    </div>
  );
}
