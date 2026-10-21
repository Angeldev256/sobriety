"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { AccountIcon, CheckInIcon, HelpIcon, HistoryIcon, HomeIcon, PlusIcon, ToolkitIcon } from "@/components/icons";

type Item = { href: string; label: string };
type Tab = Item & { Icon: ComponentType<{ className?: string }>; match?: string[]; emphasis?: boolean };

const MEMBER_TOP: Item[] = [
  { href: "/dashboard", label: "Today" },
  { href: "/check-in", label: "Check in" },
  { href: "/goals", label: "Goals" },
  { href: "/milestones", label: "Milestones" },
  { href: "/history", label: "Progress" },
  { href: "/toolkit", label: "Toolkit" },
];
const GUEST_TOP: Item[] = [
  { href: "/toolkit", label: "Coping toolkit" },
  { href: "/help", label: "Help lines" },
];

const MEMBER_TABS: Tab[] = [
  { href: "/dashboard", label: "Today", Icon: HomeIcon, match: ["/dashboard", "/goals", "/milestones", "/relapse"] },
  { href: "/check-in", label: "Check in", Icon: CheckInIcon },
  { href: "/toolkit", label: "Toolkit", Icon: ToolkitIcon },
  { href: "/history", label: "Progress", Icon: HistoryIcon },
  { href: "/settings", label: "Account", Icon: AccountIcon, match: ["/settings", "/notifications"] },
];
const GUEST_TABS: Tab[] = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/toolkit", label: "Toolkit", Icon: ToolkitIcon },
  { href: "/login?mode=signup&next=/dashboard", label: "Start", Icon: PlusIcon, match: ["/login"], emphasis: true },
  { href: "/help", label: "Help", Icon: HelpIcon },
  { href: "/login", label: "Sign in", Icon: AccountIcon, match: [] },
];

function isActive(pathname: string, href: string, match?: string[]) {
  const paths = match ?? [href.split("?")[0]];
  return paths.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`)));
}

export function TopNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const items = signedIn ? MEMBER_TOP : GUEST_TOP;
  return (
    <nav aria-label="Main" className="hidden h-full lg:block">
      <ul className="flex h-full items-stretch gap-7">
        {items.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <li key={l.href} className="flex">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center text-[0.9375rem] transition-colors ${active ? "font-medium text-white" : "text-white/60 hover:text-white"}`}
              >
                {l.label}
                {active && <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-white" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Mobile/tablet tab bar. Guests see "Start", which leads to account creation. */
export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const tabs = signedIn ? MEMBER_TABS : GUEST_TABS;
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ href, label, Icon, match, emphasis }) => {
          const active = isActive(pathname, href, match);
          return (
            <li key={label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[0.6875rem] ${
                  emphasis ? "font-semibold text-primary dark:text-link" : active ? "font-semibold text-fg" : "text-muted"
                }`}
              >
                <Icon />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
