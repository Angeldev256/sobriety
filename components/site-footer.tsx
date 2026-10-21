import Link from "next/link";

/** The one blue band on every page. */
export function SiteFooter() {
  return (
    <footer className="mt-auto bg-primary pb-[calc(4.5rem+env(safe-area-inset-bottom))] text-primary-fg lg:pb-0">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="max-w-md">
          <p className="text-2xl font-light tracking-tight">Sobriety Tracker</p>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Free, private support for every day of recovery. Not medical advice and not a replacement for professional care.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Link href="/toolkit" className="text-white/85 hover:text-white">Coping toolkit</Link>
          <Link href="/help" className="text-white/85 hover:text-white">Help lines</Link>
          <Link href="/help" className="btn btn-sm border border-white/60 text-white hover:bg-white/10">Get help now</Link>
        </nav>
      </div>
    </footer>
  );
}
