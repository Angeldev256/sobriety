import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RelapseForm } from "@/components/relapse-form";
import { addictionName } from "@/lib/constants";
import { getProfile } from "@/lib/data";
import { helplinesFor } from "@/lib/helplines";
import { soberDays } from "@/lib/recovery/time";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "It's okay — let's regroup" };

export default async function RelapsePage({ params }: PageProps<"/relapse/[id]">) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [{ data: addiction }, profile] = await Promise.all([
    supabase.from("addictions").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    getProfile(supabase, user.id),
  ]);
  if (!addiction) notFound();

  const days = soberDays(new Date(addiction.start_date));
  const country = helplinesFor(profile.country);

  return (
    <div className="grid gap-16 lg:grid-cols-[1fr_20rem] lg:gap-20">
      <div className="max-w-2xl">
        <p className="eyebrow">It&apos;s okay</p>
        <h1 className="display-lg mt-3">You&apos;re still here, and that matters.</h1>
        <p className="mt-5 text-lg leading-relaxed text-body">
          Slips are a common part of recovery, not a failure. The {days} {days === 1 ? "day" : "days"} you put in are real, and
          everything you learned is still yours. Let&apos;s take the next step together.
        </p>
        <div className="mt-12 border-t border-border pt-12">
          <RelapseForm addictionId={addiction.id} addictionLabel={addictionName(addiction)} days={days} />
        </div>
      </div>

      <aside aria-labelledby="support-heading" className="lg:pt-2">
        <div className="panel-inverse p-8">
          <h2 id="support-heading" className="text-xl font-light">You don&apos;t have to do this alone.</h2>
          <p className="mt-3 text-sm text-inverse-muted">Talking to someone right now can really help.</p>
          <ul className="mt-6 space-y-5">
            {country.lines.slice(0, 2).map((l) => (
              <li key={l.name}>
                <p className="text-sm font-semibold">{l.name}</p>
                {l.phone && (
                  <a className="mt-1 inline-block text-sm text-[#53b1ff] hover:underline" href={`tel:${l.phone.replace(/[^\d+]/g, "")}`}>
                    {l.phone}
                  </a>
                )}
              </li>
            ))}
          </ul>
          <Link href="/help" className="btn btn-on-inverse btn-sm mt-8">More help</Link>
        </div>
      </aside>
    </div>
  );
}
