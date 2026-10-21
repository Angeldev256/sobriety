"use client";

import { useState, type ReactNode } from "react";

export function AddTrackerDisclosure({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="border-t border-border pt-8">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>
          <span className="block font-semibold">Track something else</span>
          <span className="caption">Add another addiction with its own timer.</span>
        </span>
        <span aria-hidden className="text-2xl leading-none font-light text-muted">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="mt-8 max-w-xl">{children}</div>}
    </section>
  );
}
