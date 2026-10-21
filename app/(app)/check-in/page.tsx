import type { Metadata } from "next";
import Link from "next/link";
import { CheckInForm } from "@/components/check-in-form";
import { addictionName } from "@/lib/constants";
import { getActiveAddictions, getProfile, todayFor } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Daily check-in" };

export default async function CheckInPage({ searchParams }: PageProps<"/check-in">) {
  const { supabase, user } = await requireUser();
  const [profile, addictions, params] = await Promise.all([getProfile(supabase, user.id), getActiveAddictions(supabase, user.id), searchParams]);

  if (addictions.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <h1 className="display-lg">Nothing to check in for yet.</h1>
        <p className="mt-4 text-lg text-body">Start tracking first, then come back for your daily check-in.</p>
        <Link href="/dashboard" className="btn btn-primary mt-10">Start tracking</Link>
      </div>
    );
  }

  const requested = typeof params.addiction === "string" ? params.addiction : null;
  const selected = addictions.find((a) => a.id === requested) ?? addictions[0];
  const today = todayFor(profile);

  const { data: existing } = await supabase
    .from("check_ins")
    .select("*")
    .eq("user_id", user.id)
    .eq("addiction_id", selected.id)
    .eq("date", today)
    .maybeSingle();

  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="mx-auto max-w-2xl">
      <p className="eyebrow">{dateLabel}</p>
      <h1 className="display-lg mt-3">{existing ? "Edit today's check-in" : "Daily check-in"}</h1>
      <p className="mt-4 text-lg text-body">Be honest and gentle with yourself. There are no wrong answers.</p>

      {addictions.length > 1 && (
        <nav aria-label="Choose tracker" className="mt-8 flex flex-wrap gap-2">
          {addictions.map((a) => (
            <Link
              key={a.id}
              href={`/check-in?addiction=${a.id}`}
              aria-current={a.id === selected.id ? "page" : undefined}
              className={`chip ${a.id === selected.id ? "chip-on" : ""}`}
            >
              {addictionName(a)}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-12 border-t border-border pt-12">
        <CheckInForm
          key={`${selected.id}-${existing?.updated_at ?? "new"}`}
          addictionId={selected.id}
          addictionLabel={addictionName(selected)}
          initial={existing ? { mood: existing.mood, craving_level: existing.craving_level, triggers: existing.triggers, note: existing.note ?? "", stayed_sober: existing.stayed_sober } : null}
        />
      </div>
    </div>
  );
}
