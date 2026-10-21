import type { CSSProperties, ReactNode } from "react";

/** Hairline circular progress. `tone="inverse"` for use on the black panel. */
export function ProgressRing({
  value,
  label,
  size = 168,
  tone = "default",
  children,
}: {
  value: number;
  label: string;
  size?: number;
  tone?: "default" | "inverse";
  children?: ReactNode;
}) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value));
  const track = tone === "inverse" ? "rgba(255,255,255,0.16)" : "var(--surface-3)";
  const bar = tone === "inverse" ? "#ffffff" : "var(--primary)";

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={bar}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - pct)}
          className="animate-ring"
          style={{ "--ring-len": len } as CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
