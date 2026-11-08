import { helplinesFor } from "@/lib/helplines";

const tel = (n: string) => `tel:${n.replace(/\s/g, "")}`;

/** Free crisis lines. Shown whenever the intake suggests someone may be at risk — never behind a fee. */
export function CrisisPanel({ country }: { country: string }) {
  const help = helplinesFor(country);
  const lines = help.lines.filter((l) => l.phone);
  return (
    <section role="alert" aria-labelledby="crisis-h" className="rounded-lg border-2 border-danger bg-danger-soft p-6 sm:p-8">
      <h2 id="crisis-h" className="heading-lg">Please reach out for help now</h2>
      <p className="mt-3 leading-relaxed text-body">
        If you&apos;re thinking about harming yourself or someone else, or you feel physically unwell, you deserve help right away. These are free.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={tel(help.emergency.split(" ")[0])} className="btn btn-danger">Emergency: {help.emergency}</a>
        {lines.map((l) => (
          <a key={l.name} href={tel(l.phone!)} className="btn btn-secondary">
            {l.name}: {l.phone}
          </a>
        ))}
      </div>
      <p className="caption mt-5">
        You can also go to Butabika National Referral Hospital in Kampala, or the nearest health facility. You can come back and continue here afterwards.
      </p>
    </section>
  );
}
