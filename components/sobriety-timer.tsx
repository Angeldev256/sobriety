"use client";

import { useEffect, useState } from "react";
import { soberDuration } from "@/lib/recovery/time";

const pad = (n: number) => String(n).padStart(2, "0");

/** Large light-weight day count with a live h/m/s line. Server renders the first value. */
export function SobrietyTimer({ start, serverNow }: { start: string; serverNow: number }) {
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync to the real clock after hydration
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const d = soberDuration(new Date(start), new Date(now));

  return (
    <div>
      <p className="sr-only">
        {d.days} days, {d.hours} hours and {d.minutes} minutes
      </p>
      <div aria-hidden className="flex items-baseline gap-4">
        <span className="text-[5.5rem] leading-[0.9] font-light tracking-[-0.03em] tabular-nums sm:text-[8.5rem]">{d.days}</span>
        <span className="text-xl font-light text-inverse-muted sm:text-2xl">{d.days === 1 ? "day" : "days"}</span>
      </div>
      <p aria-hidden className="mt-5 flex gap-6 text-sm text-inverse-muted tabular-nums">
        <span><span className="text-inverse-fg">{pad(d.hours)}</span> hours</span>
        <span><span className="text-inverse-fg">{pad(d.minutes)}</span> minutes</span>
        <span><span className="text-inverse-fg">{pad(d.seconds)}</span> seconds</span>
      </p>
    </div>
  );
}
