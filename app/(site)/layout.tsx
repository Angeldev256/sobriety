import { BottomNav } from "@/components/app-nav";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/session";

/** Public area: open to everyone, and aware of who is signed in. */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  return (
    <>
      <SiteHeader viewer={viewer} />
      <div className="flex flex-1 flex-col">{children}</div>
      <BottomNav signedIn={Boolean(viewer)} />
    </>
  );
}
