import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CallButtons } from "@/components/support/call-buttons";
import { ChatThread } from "@/components/support/chat-thread";
import { ConnectionSettings } from "@/components/support/connection-settings";
import { addictionName } from "@/lib/constants";
import { soberDays } from "@/lib/recovery/time";
import { initials, peerOf, relationshipLabel } from "@/lib/support";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: PageProps<"/support/[id]">) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const { data: conn } = await supabase.from("support_connections").select("*").eq("id", id).maybeSingle();
  if (!conn || (conn.member_id !== user.id && conn.helper_id !== user.id) || conn.status === "pending" || conn.status === "declined") notFound();

  const peer = peerOf(conn, user.id);
  const active = conn.status === "active";

  const [{ data: msgs }, { data: calls }, progressRes] = await Promise.all([
    supabase.from("support_messages").select("*").eq("connection_id", id).order("created_at", { ascending: false }).limit(200),
    supabase.from("call_logs").select("id, caller_id, kind, status, duration_seconds, created_at").eq("connection_id", id).order("created_at", { ascending: false }).limit(50),
    !peer.viewerIsMember && conn.share_progress ? supabase.rpc("get_shared_progress", { conn: id }) : Promise.resolve({ data: null }),
    supabase.rpc("mark_support_read", { conn: id }),
  ]);
  const progress = progressRes.data;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-14rem)] max-w-3xl flex-col lg:min-h-[calc(100dvh-12rem)]">
      <header className="space-y-5 border-b border-border pb-6">
        <Link href="/support" className="text-sm text-muted hover:text-fg">← Support circle</Link>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface-2 text-lg font-light">
              {initials(peer.peerName)}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-light sm:text-3xl">{peer.peerName}</h1>
              <p className="caption">
                {peer.viewerIsMember ? relationshipLabel(peer.relationship) : `You're their ${relationshipLabel(peer.relationship).toLowerCase()}`}
                {peer.isPreferred && " · Preferred helper"}
                {!active && " · Ended"}
              </p>
            </div>
          </div>
          {active && <CallButtons connectionId={id} peerId={peer.peerId} peerName={peer.peerName} phone={peer.phone} size="sm" />}
        </div>
        {progress && progress.length > 0 && (
          <p className="rounded-lg bg-surface-2 px-4 py-3 text-sm">
            {peer.peerName} is sharing:{" "}
            {progress.map((p) => `${soberDays(new Date(p.start_date))} days ${addictionName(p).toLowerCase()}-free`).join(" · ")}
          </p>
        )}
        {active && (
          <ConnectionSettings
            connectionId={id}
            peerName={peer.peerName}
            viewerIsMember={peer.viewerIsMember}
            isPreferred={conn.is_preferred}
            shareProgress={conn.share_progress}
            phone={conn.phone}
          />
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col pt-4">
        <ChatThread
          connectionId={id}
          viewerId={user.id}
          peerName={peer.peerName}
          active={active}
          initialMessages={(msgs ?? []).reverse()}
          calls={calls ?? []}
        />
      </div>
    </div>
  );
}
