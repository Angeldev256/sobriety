import { redirect } from "next/navigation";
import { BottomNav } from "@/components/app-nav";
import { CallProvider, type CallPeer } from "@/components/calls/call-provider";
import { SiteHeader } from "@/components/site-header";
import { TimezoneSync } from "@/components/timezone-sync";
import { getViewer } from "@/lib/session";
import { peerOf } from "@/lib/support";

/** Members area. The proxy already redirects guests; this is the authoritative check. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const peers: CallPeer[] = viewer.connections
    .map((c) => peerOf(c, viewer.user.id))
    .filter((p): p is typeof p & { peerId: string } => Boolean(p.peerId))
    .map((p) => ({ connectionId: p.connectionId, peerId: p.peerId, peerName: p.peerName }));
  const name = viewer.profile.display_name?.split(" ")[0] || "Your contact";

  return (
    <CallProvider me={{ id: viewer.user.id, name }} peers={peers}>
      <SiteHeader viewer={viewer} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-8 pb-16 sm:px-6 md:pt-14 md:pb-24">{children}</main>
      <BottomNav signedIn />
      <TimezoneSync saved={viewer.profile.timezone} theme={viewer.profile.theme} />
    </CallProvider>
  );
}
