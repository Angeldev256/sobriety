"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { date: string; mood: number; craving: number };

const short = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function TrendChart({ data }: { data: Point[] }) {
  return (
    <figure>
      <div className="mb-6 flex gap-6 text-sm" aria-hidden>
        <span className="flex items-center gap-2"><span className="inline-block h-0.5 w-5 bg-primary" /> Mood</span>
        <span className="flex items-center gap-2"><span className="inline-block h-0 w-5 border-t-2 border-dashed border-fg" /> Cravings</span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -28 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={short} stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} minTickGap={32} dy={8} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              labelFormatter={(d) => short(String(d))}
              cursor={{ stroke: "var(--ash)" }}
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--fg)", fontSize: 13 }}
            />
            <Line type="monotone" dataKey="mood" name="Mood" stroke="var(--primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="craving" name="Cravings" stroke="var(--fg)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        Mood and craving levels by day, from 1 (low) to 5 (high).{" "}
        {data.map((p) => `${short(p.date)}: mood ${p.mood}, cravings ${p.craving}.`).join(" ")}
      </figcaption>
    </figure>
  );
}
