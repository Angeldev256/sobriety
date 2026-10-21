import { redirect } from "next/navigation";
import { BottomNav } from "@/components/app-nav";
import { SiteHeader } from "@/components/site-header";
import { TimezoneSync } from "@/components/timezone-sync";
import { getViewer } from "@/lib/session";

/** Members area. The proxy already redirects guests; this is the authoritative check. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  return (
    <>
      <SiteHeader viewer={viewer} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-8 pb-16 sm:px-6 md:pt-14 md:pb-24">{children}</main>
      <BottomNav signedIn />
      <TimezoneSync saved={viewer.profile.timezone} theme={viewer.profile.theme} />
    </>
  );
}
