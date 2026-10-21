import Link from "next/link";
import { MOODS } from "@/lib/constants";

type Day = { date: string; mood: number; craving_level: number; stayed_sober: boolean };

// One-hue scale: mood 1 → faint blue, mood 5 → full brand blue. Text flips to white once contrast allows.
const MOOD_CLASSES = [
  "",
  "bg-[rgba(0,112,209,0.12)] text-fg",
  "bg-[rgba(0,112,209,0.28)] text-fg",
  "bg-[rgba(0,112,209,0.48)] text-fg",
  "bg-[rgba(0,112,209,0.72)] text-white",
  "bg-primary text-white",
];
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function CheckInCalendar({
  month,
  today,
  view,
  checkIns,
  prevHref,
  nextHref,
}: {
  month: string;
  today: string;
  view: "mood" | "sober";
  checkIns: Day[];
  prevHref: string;
  nextHref: string | null;
}) {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const leading = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Monday-first
  const byDate = new Map(checkIns.map((c) => [c.date, c]));
  const title = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells: (string | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="heading-lg" aria-live="polite">{title}</p>
        <div className="flex gap-2">
          <Link href={prevHref} className="flex size-10 items-center justify-center rounded-full border border-ash hover:bg-surface-2" aria-label="Previous month">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M8.5 3 4.5 7l4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          {nextHref ? (
            <Link href={nextHref} className="flex size-10 items-center justify-center rounded-full border border-ash hover:bg-surface-2" aria-label="Next month">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="m5.5 3 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          ) : (
            <span aria-hidden className="flex size-10 items-center justify-center rounded-full border border-border text-border">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m5.5 3 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          )}
        </div>
      </div>

      <div role="grid" aria-label={`Check-ins for ${title}`} className="grid grid-cols-7 gap-1.5 text-center text-sm">
        {WEEKDAYS.map((d, i) => (
          <div key={i} role="columnheader" aria-label={WEEKDAY_NAMES[i]} className="pb-2 text-xs font-medium text-muted">{d}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />;
          const c = byDate.get(date);
          const day = Number(date.slice(8));
          const isToday = date === today;
          const future = date > today;
          let cls = "text-muted";
          let desc = future ? "" : "no check-in";
          if (c) {
            if (view === "mood") {
              cls = MOOD_CLASSES[c.mood];
              desc = `mood ${MOODS[c.mood - 1].label}, cravings ${c.craving_level} of 5`;
            } else {
              cls = c.stayed_sober ? "bg-primary text-white" : "border border-danger text-danger";
              desc = c.stayed_sober ? "stayed sober" : "not sober";
            }
          }
          return (
            <div
              key={date}
              role="gridcell"
              aria-label={`${date}${desc ? `: ${desc}` : ""}${isToday ? " (today)" : ""}`}
              className={`flex aspect-square items-center justify-center rounded-md tabular-nums ${future ? "opacity-30" : ""} ${cls} ${
                isToday ? "font-semibold ring-1 ring-fg ring-offset-2 ring-offset-bg" : ""
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted" aria-hidden>
        {view === "mood" ? (
          <>
            <span>Mood</span>
            <span className="flex items-center gap-1">
              {MOODS.map((md) => (
                <span key={md.value} className={`inline-block size-3.5 rounded-sm ${MOOD_CLASSES[md.value]}`} />
              ))}
            </span>
            <span>Very low → Great</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-2"><span className="inline-block size-3.5 rounded-sm bg-primary" /> Sober</span>
            <span className="flex items-center gap-2"><span className="inline-block size-3.5 rounded-sm border border-danger" /> Not sober</span>
          </>
        )}
      </div>
    </div>
  );
}
