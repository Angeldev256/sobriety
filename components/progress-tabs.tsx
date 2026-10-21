"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/history", label: "Overview" },
  { href: "/milestones", label: "Milestones" },
  { href: "/goals", label: "Goals" },
];

/** Sub-navigation shared by the three Progress pages. */
export function ProgressTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Progress" className="-mx-5 mb-10 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <ul className="flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`relative block px-4 py-3 text-sm whitespace-nowrap transition-colors ${active ? "font-semibold text-fg" : "text-muted hover:text-fg"}`}
              >
                {t.label}
                {active && <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 bg-fg" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
