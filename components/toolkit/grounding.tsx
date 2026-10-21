"use client";

import { useState } from "react";

const STEPS = [
  { n: 5, sense: "see", prompt: "Look around. Name five things you can see." },
  { n: 4, sense: "feel", prompt: "Notice four things you can feel — your feet on the floor, your clothes, the air." },
  { n: 3, sense: "hear", prompt: "Listen. Name three things you can hear." },
  { n: 2, sense: "smell", prompt: "Find two things you can smell, or two scents you like." },
  { n: 1, sense: "taste", prompt: "Notice one thing you can taste. Take a slow breath." },
];

/** The 5-4-3-2-1 grounding exercise, one sense at a time. */
export function Grounding() {
  const [i, setI] = useState(0);
  const finished = i >= STEPS.length;
  const s = STEPS[Math.min(i, STEPS.length - 1)];

  return (
    <div>
      <ol className="flex gap-2" aria-label="Progress">
        {STEPS.map((st, idx) => (
          <li
            key={st.n}
            aria-current={idx === i ? "step" : undefined}
            className={`h-1 flex-1 rounded-full ${idx < i || finished ? "bg-fg" : idx === i ? "bg-primary" : "bg-surface-3"}`}
          >
            <span className="sr-only">{st.n} things you can {st.sense}</span>
          </li>
        ))}
      </ol>

      <div className="mt-10 min-h-44" aria-live="polite">
        {finished ? (
          <>
            <p className="heading-xl">You&apos;re here, right now.</p>
            <p className="mt-3 max-w-lg leading-relaxed text-body">
              Grounding brings your attention back to the present, where you&apos;re safe. Come back to this whenever you need it.
            </p>
          </>
        ) : (
          <div className="flex items-start gap-6 sm:gap-8">
            <span className="text-[5rem] leading-[0.85] font-light tabular-nums">{s.n}</span>
            <div>
              <p className="eyebrow">Things you can {s.sense}</p>
              <p className="mt-3 max-w-lg text-xl leading-relaxed font-light">{s.prompt}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        {finished ? (
          <button type="button" className="btn btn-secondary" onClick={() => setI(0)}>Start again</button>
        ) : (
          <>
            <button type="button" className="btn btn-primary" onClick={() => setI((v) => v + 1)}>
              {i === STEPS.length - 1 ? "Finish" : "Next"}
            </button>
            {i > 0 && (
              <button type="button" className="btn btn-secondary" onClick={() => setI((v) => v - 1)}>Back</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
