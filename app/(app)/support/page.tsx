import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/photo";
import { CallButtons } from "@/components/support/call-buttons";
import { InviteHelperForm } from "@/components/support/invite-helper-form";
import { PendingInvite } from "@/components/support/pending-invite";
import { addictionName } from "@/lib/constants";
import { env } from "@/lib/env";
import { soberDays } from "@/lib/recovery/time";
import { initials, relationshipLabel } from "@/lib/support";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Support circle" };

export default async function SupportPage({ searchParams }: PageProps<"/support">) {
  const { supabase, user } = await requireUser();
  const params = await searchParams;

  const [{ data: conns }, { data: unreadRows }] = await Promise.all([
    supabase
      .from("support_connections")
      .select("*")
      .in("status", ["pending", "active"])
      .or(`member_id.eq.${user.id},helper_id.eq.${user.id}`)
      .order("is_preferred", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase.from("support_messages").select("connection_id").is("read_at", null).neq("sender_id", user.id),
  ]);

  const all = conns ?? [];
  const unread = new Map<string, number>();
  (unreadRows ?? []).forEach((r) => unread.set(r.connection_id, (unread.get(r.connection_id) ?? 0) + 1));

  const myHelpers = all.filter((c) => c.member_id === user.id && c.status === "active");
  const pending = all.filter((c) => c.member_id === user.id && c.status === "pending");
  const supporting = all.filter((c) => c.helper_id === user.id && c.status === "active");
  const preferred = myHelpers.find((c) => c.is_preferred);
  const others = myHelpers.filter((c) => c !== preferred);

  const shared = new Map<string, { label: string | null; type: Parameters<typeof addictionName>[0]["type"]; start_date: string }[]>();
  await Promise.all(
    supporting
      .filter((c) => c.share_progress)
      .map(async (c) => {
        const { data } = await supabase.rpc("get_shared_progress", { conn: c.id });
        if (data?.length) shared.set(c.id, data);
      }),
  );

  return (
    <div className="space-y-16">
      <header className="grid gap-10 md:grid-cols-[1fr_20rem] md:items-end">
        <div>
          <p className="eyebrow">Support circle</p>
          <h1 className="display-lg mt-3">You don&apos;t have to do this alone.</h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-body">
            Invite a counsellor, sponsor, family member or friend you trust. You can message them and call them by voice or
            video, right here — or on WhatsApp.
          </p>
        </div>
        <Photo name="conversation" sizes="(min-width: 768px) 320px, 100vw" className="aspect-[16/10] w-full rounded-lg" />
      </header>

      {params.declined === "1" && (
        <p role="status" className="border-l-2 border-primary py-1 pl-3 text-sm">You declined the invitation. Nothing was shared.</p>
      )}

      <div className="grid gap-16 lg:grid-cols-[1fr_22rem] lg:gap-20">
        <div className="space-y-14">
          {preferred ? (
            <section aria-labelledby="preferred-h" className="panel-inverse p-8 sm:p-10">
              <h2 id="preferred-h" className="text-xs font-medium tracking-[0.08em] text-inverse-muted uppercase">Your preferred helper</h2>
              <div className="mt-6 flex items-center gap-5">
                <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl font-light">
                  {initials(preferred.helper_name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-3xl font-light">{preferred.helper_name}</p>
                  <p className="text-sm text-inverse-muted">{relationshipLabel(preferred.relationship)}</p>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                <Link href={`/support/${preferred.id}`} className="btn btn-on-inverse">
                  Message{unread.get(preferred.id) ? ` · ${unread.get(preferred.id)} new` : ""}
                </Link>
                <CallButtons connectionId={preferred.id} peerId={preferred.helper_id} peerName={preferred.helper_name} phone={preferred.phone} tone="inverse" />
              </div>
            </section>
          ) : (
            myHelpers.length === 0 &&
            pending.length === 0 && (
              <section className="rounded-lg bg-surface-2 p-8">
                <h2 className="heading-xl">Start your circle</h2>
                <p className="mt-3 max-w-lg leading-relaxed text-body">
                  Add one person you trust. When a craving hits or a day gets heavy, they&apos;ll be a tap away. They won&apos;t see your
                  check-ins or notes unless you choose to share your sober days.
                </p>
              </section>
            )
          )}

          {others.length > 0 && (
            <section aria-labelledby="helpers-h">
              <h2 id="helpers-h" className="heading-md border-b border-fg pb-3">Your helpers</h2>
              <ul>
                {others.map((c) => (
                  <li key={c.id} className="flex flex-col gap-4 border-b border-border py-5 sm:flex-row sm:items-center sm:justify-between">
                    <Link href={`/support/${c.id}`} className="group flex min-w-0 items-center gap-4">
                      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold">
                        {initials(c.helper_name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-lg group-hover:underline">{c.helper_name}</span>
                        <span className="caption block">
                          {relationshipLabel(c.relationship)}
                          {unread.get(c.id) ? ` · ${unread.get(c.id)} new message${unread.get(c.id) === 1 ? "" : "s"}` : ""}
                        </span>
                      </span>
                    </Link>
                    <CallButtons connectionId={c.id} peerId={c.helper_id} peerName={c.helper_name} phone={c.phone} size="sm" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {pending.length > 0 && (
            <section aria-labelledby="pending-h">
              <h2 id="pending-h" className="heading-md border-b border-fg pb-3">Waiting to accept</h2>
              <ul>
                {pending.map((c) => (
                  <PendingInvite
                    key={c.id}
                    id={c.id}
                    name={c.helper_name}
                    relationship={relationshipLabel(c.relationship)}
                    link={`${env.siteUrl}/support/invite/${c.invite_token}`}
                  />
                ))}
              </ul>
            </section>
          )}

          {supporting.length > 0 && (
            <section aria-labelledby="supporting-h">
              <h2 id="supporting-h" className="heading-md border-b border-fg pb-3">People you support</h2>
              <ul>
                {supporting.map((c) => {
                  const progress = shared.get(c.id);
                  return (
                    <li key={c.id} className="border-b border-border py-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <Link href={`/support/${c.id}`} className="group flex min-w-0 items-center gap-4">
                          <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold">
                            {initials(c.member_name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-lg group-hover:underline">{c.member_name}</span>
                            <span className="caption block">
                              You&apos;re their {relationshipLabel(c.relationship).toLowerCase()}
                              {unread.get(c.id) ? ` · ${unread.get(c.id)} new` : ""}
                            </span>
                          </span>
                        </Link>
                        <CallButtons connectionId={c.id} peerId={c.member_id} peerName={c.member_name} size="sm" />
                      </div>
                      {progress && (
                        <p className="caption mt-3">
                          Shared progress:{" "}
                          {progress.map((p) => `${soberDays(new Date(p.start_date))} days ${addictionName(p).toLowerCase()}-free`).join(" · ")}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="text-sm leading-relaxed text-muted">
            <h2 className="font-semibold text-fg">Privacy</h2>
            <p className="mt-2">
              Helpers can message and call you, but never see your check-ins, notes or relapses. You can choose to share your sober
              days with a helper, and remove anyone at any time. Calls are peer-to-peer and aren&apos;t recorded.
            </p>
          </section>
        </div>

        <aside aria-labelledby="invite-h">
          <div className="card p-8 lg:sticky lg:top-24">
            <h2 id="invite-h" className="heading-lg">Invite someone</h2>
            <p className="caption mt-2">They&apos;ll get a link to accept. It&apos;s free for them too.</p>
            <div className="mt-6">
              <InviteHelperForm hasPreferred={Boolean(preferred)} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
