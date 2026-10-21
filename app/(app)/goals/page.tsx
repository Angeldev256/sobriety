import type { Metadata } from "next";
import { GoalForm } from "@/components/goals/goal-form";
import { GoalItem } from "@/components/goals/goal-item";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Goals" };

export default async function GoalsPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("target_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const goals = data ?? [];
  const active = goals.filter((g) => g.status !== "completed");
  const done = goals.filter((g) => g.status === "completed");

  return (
    <div className="grid gap-16 lg:grid-cols-[1fr_22rem] lg:gap-20">
      <div className="space-y-14">
        <header>
          <p className="eyebrow">Goals</p>
          <h1 className="display-lg mt-3">Small steps, real change.</h1>
          <p className="mt-4 max-w-xl text-lg text-body">
            Think “go to one meeting this week” or “call my sister on Sunday”.
          </p>
        </header>

        <section aria-labelledby="active-goals">
          <div className="flex items-baseline justify-between border-b border-fg pb-3">
            <h2 id="active-goals" className="heading-md">In progress</h2>
            <span className="caption tabular-nums">{active.length}</span>
          </div>
          {active.length === 0 ? (
            <p className="py-10 text-body">No open goals. Add one whenever you&apos;re ready.</p>
          ) : (
            <ul>
              {active.map((g) => (
                <GoalItem key={g.id} goal={g} />
              ))}
            </ul>
          )}
        </section>

        {done.length > 0 && (
          <section aria-labelledby="done-goals">
            <div className="flex items-baseline justify-between border-b border-fg pb-3">
              <h2 id="done-goals" className="heading-md">Completed</h2>
              <span className="caption tabular-nums">{done.length}</span>
            </div>
            <ul>
              {done.map((g) => (
                <GoalItem key={g.id} goal={g} />
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside aria-labelledby="new-goal" className="lg:pt-2">
        <div className="card p-8 lg:sticky lg:top-24">
          <h2 id="new-goal" className="heading-lg">New goal</h2>
          <div className="mt-6">
            <GoalForm />
          </div>
        </div>
      </aside>
    </div>
  );
}
