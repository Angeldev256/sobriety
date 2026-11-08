import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IntakeChat } from "@/components/care/intake-chat";
import { MAX_INTAKE_TURNS } from "@/lib/care/constants";
import { getProfile } from "@/lib/data";
import type { CareIntake } from "@/lib/database.types";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Care assistant" };

export default async function IntakePage({ params }: PageProps<"/care/intake/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase, user } = await requireUser();
  const [{ data }, profile] = await Promise.all([
    supabase.from("care_intakes").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    getProfile(supabase, user.id),
  ]);
  if (!data) notFound();
  const intake = data as CareIntake;
  const userTurns = intake.messages.filter((m) => m.role === "user").length;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-14rem)] max-w-3xl flex-col lg:min-h-[calc(100dvh-12rem)]">
      <header className="space-y-3 border-b border-border pb-6">
        <Link href="/care" className="text-sm text-muted hover:text-fg">← Professional care</Link>
        <h1 className="text-2xl font-light sm:text-3xl">Care assistant</h1>
        <p className="caption">
          An AI assistant, not a clinician. It helps us understand what you need so we can match you with the right professional.
        </p>
      </header>
      <IntakeChat
        intakeId={intake.id}
        initialMessages={intake.messages}
        initialCrisis={intake.crisis}
        initialReady={intake.status === "assessed" || userTurns >= 8}
        country={profile.country}
        maxTurns={MAX_INTAKE_TURNS}
      />
    </div>
  );
}
