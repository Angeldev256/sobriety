import Image from "next/image";
import Link from "next/link";
import { TopNav } from "@/components/app-nav";
import { BellIcon } from "@/components/icons";
import type { Viewer } from "@/lib/session";

/** Shared black header for guests and members. "Get help" is always one tap away. */
export function SiteHeader({ viewer }: { viewer: Viewer | null }) {
  const name = viewer?.profile.display_name ?? "Friend";

  return (
    <header className="sticky top-0 z-30 bg-black text-white">
      <div className="mx-auto flex h-14 max-w-6xl items-stretch justify-between gap-4 px-4 sm:px-6">
        <Link href={viewer ? "/dashboard" : "/"} className="flex shrink-0 items-center text-[1.0625rem] font-light tracking-tight">
          <span className="sm:hidden">Sobriety</span>
          <span className="hidden sm:inline">Sobriety Tracker</span>
        </Link>

        <TopNav signedIn={Boolean(viewer)} />

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/help"
            className="flex h-9 items-center rounded-full border border-white/35 px-3.5 text-[0.8125rem] font-semibold whitespace-nowrap hover:bg-white/10"
          >
            Get help
          </Link>

          {viewer ? (
            <>
              <Link
                href="/notifications"
                className="relative flex size-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
                aria-label={viewer.unread > 0 ? `Notifications, ${viewer.unread} unread` : "Notifications"}
              >
                <BellIcon size={20} />
                {viewer.unread > 0 && (
                  <span aria-hidden className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-4 font-bold">
                    {viewer.unread > 9 ? "9+" : viewer.unread}
                  </span>
                )}
              </Link>
              <Link href="/settings" className="flex items-center" aria-label="Account and settings">
                {viewer.profile.avatar_url ? (
                  <Image src={viewer.profile.avatar_url} alt="" width={30} height={30} className="rounded-full" />
                ) : (
                  <span aria-hidden className="flex size-[30px] items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden px-2 text-sm text-white/75 hover:text-white sm:block">
                Sign in
              </Link>
              <Link href="/login?mode=signup&next=/dashboard" className="btn btn-primary btn-sm hidden h-9 px-4 sm:inline-flex">
                Start tracking
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
