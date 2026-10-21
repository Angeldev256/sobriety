"use client";

import { useEffect, useState } from "react";

const PATTERNS = {
  box: { name: "Box breathing", steps: [["Breathe in", 4], ["Hold", 4], ["Breathe out", 4], ["Hold", 4]] },
  calm: { name: "4-7-8 calm", steps: [["Breathe in", 4], ["Hold", 7], ["Breathe out", 8]] },
} as const;
type PatternKey = keyof typeof PATTERNS;
type Phase = { step: number; left: number; rounds: number };

const start = (p: PatternKey): Phase => ({ step: 0, left: PATTERNS[p].steps[0][1], rounds: 0 });

/** Guided breathing: a circle that grows on the in-breath and settles on the out-breath. */
export function BreathingExercise() {
  const [pattern, setPattern] = useState<PatternKey>("box");
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>(() => start("box"));
  const steps = PATTERNS[pattern].steps;
  const [label, seconds] = steps[phase.step];

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setPhase((p) => {
        if (p.left > 1) return { ...p, left: p.left - 1 };
        const step = (p.step + 1) % steps.length;
        return { step, left: steps[step][1], rounds: step === 0 ? p.rounds + 1 : p.rounds };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, steps]);

  const reset = (p: PatternKey = pattern) => {
    setRunning(false);
    setPhase(start(p));
  };

  const started = phase.rounds > 0 || phase.step > 0 || phase.left !== steps[0][1];
  // In-breath and the hold after it are "full"; the out-breath and final hold are "empty".
  const scale = running && phase.step <= 1 ? 1 : 0.6;

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Breathing pattern">
          {(Object.keys(PATTERNS) as PatternKey[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={pattern === k}
              onClick={() => {
                setPattern(k);
                reset(k);
              }}
              className={`chip ${pattern === k ? "chip-on" : ""}`}
            >
              {PATTERNS[k].name}
            </button>
          ))}
        </div>
        <p className="mt-6 max-w-md leading-relaxed text-body">
          Slow breathing tells your body it&apos;s safe. Follow the circle for a few rounds — even one minute can take the edge off a craving.
        </p>
        <div className="mt-8 flex gap-3">
          <button type="button" className="btn btn-primary" onClick={() => setRunning((r) => !r)}>
            {running ? "Pause" : started ? "Resume" : "Start"}
          </button>
          {started && (
            <button type="button" className="btn btn-secondary" onClick={() => reset()}>
              Reset
            </button>
          )}
        </div>
        <p className="caption mt-4 tabular-nums" aria-live="polite">
          {phase.rounds > 0 ? `${phase.rounds} ${phase.rounds === 1 ? "round" : "rounds"} complete` : " "}
        </p>
      </div>

      <div className="relative mx-auto flex size-64 items-center justify-center sm:size-72">
        <span aria-hidden className="absolute inset-0 rounded-full border border-border" />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-primary/12 ease-in-out motion-safe:transition-transform dark:bg-primary/25"
          style={{ transform: `scale(${scale})`, transitionDuration: `${running ? seconds : 0.4}s` }}
        />
        <span className="relative text-center">
          <span className="block text-2xl font-light" aria-live="polite">{running ? label : "Ready"}</span>
          <span aria-hidden className="mt-1 block text-5xl font-light tabular-nums">{running ? phase.left : seconds}</span>
        </span>
      </div>
    </div>
  );
}
