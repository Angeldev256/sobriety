import Link from "next/link";
import type { ReactNode } from "react";
import { Photo } from "@/components/photo";

const QUOTES = [
  "Every day you show up counts.",
  "You don't have to see the whole road. Just the next step.",
  "Recovery is built one ordinary day at a time.",
];

/** Two-panel auth layout: a calm black panel on desktop, a single clean column on mobile. */
export function AuthShell({ children, quote = 0 }: { children: ReactNode; quote?: number }) {
  return (
    <main className="grid flex-1 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="hidden flex-col justify-between bg-black p-12 text-white md:flex">
        <Link href="/" className="text-lg font-light tracking-tight">Sobriety Tracker</Link>
        <div>
          <Photo name="newStart" sizes="448px" priority className="mb-10 aspect-[16/10] w-full max-w-md rounded-lg" />
          <p className="display-lg max-w-md">{QUOTES[quote % QUOTES.length]}</p>
          <ul className="mt-10 space-y-3 text-sm text-white/65">
            <li>Private by design — only you can see your data.</li>
            <li>Free forever. No ads, no paywalls.</li>
            <li>Gentle reminders, on your terms.</li>
          </ul>
        </div>
        <Link href="/help" className="text-sm text-white/65 hover:text-white">Need support right now? Find a help line</Link>
      </section>

      <section className="flex flex-col px-6 pt-8 pb-16 sm:px-12 md:justify-center md:py-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="text-lg font-light tracking-tight md:hidden">Sobriety Tracker</Link>
          <div className="mt-10 md:mt-0">{children}</div>
        </div>
      </section>
    </main>
  );
}
