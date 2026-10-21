"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { markConversationRead, sendSupportMessage, type SentMessage } from "@/app/(app)/support/actions";
import { createClient } from "@/lib/supabase/client";

type CallItem = { id: string; caller_id: string; kind: "audio" | "video"; status: string; duration_seconds: number; created_at: string };
type Item = ({ type: "message" } & SentMessage & { pending?: boolean; failed?: boolean }) | ({ type: "call" } & CallItem);

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
};

function callText(c: CallItem, viewerId: string, peerName: string) {
  const what = c.kind === "video" ? "Video call" : "Voice call";
  const mine = c.caller_id === viewerId;
  if (c.status === "completed") return `${what} · ${Math.floor(c.duration_seconds / 60)}:${String(c.duration_seconds % 60).padStart(2, "0")}`;
  if (c.status === "missed") return mine ? `${what} · no answer` : `Missed ${what.toLowerCase()} from ${peerName}`;
  if (c.status === "declined") return mine ? `${what} · declined` : `${what} · you declined`;
  return `${what} · couldn't connect`;
}

export function ChatThread({
  connectionId,
  viewerId,
  peerName,
  active,
  initialMessages,
  calls,
}: {
  connectionId: string;
  viewerId: string;
  peerName: string;
  active: boolean;
  initialMessages: SentMessage[];
  calls: CallItem[];
}) {
  const [messages, setMessages] = useState<(SentMessage & { pending?: boolean; failed?: boolean })[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startSend] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live updates on the private support:<id> channel (fed by a database trigger).
  useEffect(() => {
    const supabase = createClient();
    let ch: RealtimeChannel | null = null;
    let cancelled = false;
    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      ch = supabase.channel(`support:${connectionId}`, { config: { private: true } });
      ch.on("broadcast", { event: "message" }, ({ payload }) => {
        const m = payload as SentMessage;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, { ...m, read_at: null }]));
        if (m.sender_id !== viewerId) {
          if (readTimer.current) clearTimeout(readTimer.current);
          readTimer.current = setTimeout(() => void markConversationRead(connectionId).catch(() => {}), 800);
        }
      });
      ch.subscribe();
    })().catch(() => {});
    return () => {
      cancelled = true;
      if (readTimer.current) clearTimeout(readTimer.current);
      if (ch) void supabase.removeChannel(ch);
    };
  }, [connectionId, viewerId]);

  const items = useMemo<Item[]>(
    () =>
      [...messages.map((m) => ({ type: "message" as const, ...m })), ...calls.map((c) => ({ type: "call" as const, ...c }))].sort(
        (a, b) => a.created_at.localeCompare(b.created_at),
      ),
    [messages, calls],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [items.length]);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setError(null);
    setDraft("");
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimistic = { id: tempId, connection_id: connectionId, sender_id: viewerId, body, created_at: new Date().toISOString(), read_at: null, pending: true };
    setMessages((prev) => [...prev, optimistic]);
    startSend(async () => {
      const res = await sendSupportMessage(connectionId, body).catch(() => ({ ok: false as const, error: "Your message didn't send. Check your connection." }));
      setMessages((prev) => {
        if (!res.ok) return prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m));
        // The realtime echo may already have added the real message.
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        return withoutTemp.some((m) => m.id === res.message.id) ? withoutTemp : [...withoutTemp, res.message];
      });
      if (!res.ok) {
        setError(res.error);
        setDraft((d) => d || body);
      }
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ol className="flex-1 space-y-2 overflow-y-auto pb-4" aria-label={`Conversation with ${peerName}`} aria-live="polite">
        {items.length === 0 && (
          <li className="py-16 text-center text-body">
            No messages yet. Say hello — even a short &ldquo;thinking of you&rdquo; can mean a lot.
          </li>
        )}
        {items.map((item, i) => {
          const day = dayLabel(item.created_at);
          const showDay = i === 0 || dayLabel(items[i - 1].created_at) !== day;
          return (
            <li key={`${item.type}-${item.id}`}>
              {showDay && <p className="py-4 text-center text-xs font-medium tracking-[0.08em] text-muted uppercase">{day}</p>}
              {item.type === "call" ? (
                <p className="py-1 text-center text-sm text-muted">
                  {callText(item, viewerId, peerName)} · {time(item.created_at)}
                </p>
              ) : (
                <div className={`flex ${item.sender_id === viewerId ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap break-words sm:max-w-[65%] ${
                      item.sender_id === viewerId ? "rounded-br-md bg-primary text-white" : "rounded-bl-md bg-surface-2"
                    } ${item.pending ? "opacity-60" : ""} ${item.failed ? "ring-2 ring-danger" : ""}`}
                  >
                    {item.body}
                    <span className={`mt-1 block text-right text-[0.6875rem] ${item.sender_id === viewerId ? "text-white/70" : "text-muted"}`}>
                      {item.failed ? "Not sent" : item.pending ? "Sending…" : time(item.created_at)}
                    </span>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        <div ref={endRef} />
      </ol>

      {active ? (
        <form
          className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] border-t border-border bg-bg pt-4 lg:bottom-0 lg:pb-4"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          {error && (
            <p role="alert" className="mb-2 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex items-end gap-2">
            <label htmlFor="message" className="sr-only">Message {peerName}</label>
            <textarea
              id="message"
              rows={1}
              value={draft}
              maxLength={2000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={`Message ${peerName}`}
              className="input max-h-36 min-h-12 flex-1 resize-none rounded-3xl px-5 py-3 focus:px-[19px] focus:py-[11px]"
            />
            <button type="submit" className="btn btn-primary shrink-0" disabled={!draft.trim()}>
              Send
            </button>
          </div>
        </form>
      ) : (
        <p className="border-t border-border py-5 text-center text-sm text-muted">This connection has ended. Messages are kept for your records.</p>
      )}
    </div>
  );
}
