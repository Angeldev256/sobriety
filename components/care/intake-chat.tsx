"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { findMatches, sendIntakeMessage } from "@/app/(app)/care/actions";
import type { IntakeMessage } from "@/lib/database.types";
import { helplinesFor } from "@/lib/helplines";

const STARTERS = [
  "I'm having a strong craving right now",
  "How do I cut down on drinking?",
  "I can't stop betting",
  "How do I tell my family?",
  "What help is there at Butabika?",
  "I'd like to talk to a professional",
];

type Props = {
  intakeId: string;
  initialMessages: IntakeMessage[];
  initialCrisis: boolean;
  initialReady: boolean;
  country: string;
  maxTurns: number;
};

export function IntakeChat({ intakeId, initialMessages, initialCrisis, initialReady, country, maxTurns }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [crisis, setCrisis] = useState(initialCrisis);
  const [ready, setReady] = useState(initialReady);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [matching, startMatching] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  const userTurns = messages.filter((m) => m.role === "user").length;
  const full = userTurns >= maxTurns;
  const help = helplinesFor(country);
  const helpline = help.lines.find((l) => l.phone);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending]);

  function send(preset?: string) {
    const text = (preset ?? draft).trim();
    if (!text || pending || full) return;
    setError(null);
    // Show the person's message straight away; the server returns the full saved conversation.
    setMessages((m) => [...m, { role: "user", content: text, at: new Date().toISOString() }]);
    setDraft("");
    start(async () => {
      const res = await sendIntakeMessage(intakeId, text);
      if (res.ok) {
        setMessages(res.messages);
        setCrisis(res.crisis);
        setReady((r) => r || res.readyToMatch);
      } else {
        setMessages((m) => m.slice(0, -1));
        if (!preset) setDraft(text);
        setError(res.error);
      }
    });
  }

  function match() {
    setError(null);
    startMatching(async () => {
      const res = await findMatches(intakeId);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col pt-4">
      {crisis && (
        <div role="alert" className="mb-4 rounded-lg border-2 border-danger bg-danger-soft p-4 text-sm leading-relaxed">
          <p className="font-semibold">If you&apos;re in danger, please get help now — it&apos;s free.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`tel:${help.emergency.split(" ")[0]}`} className="btn btn-danger btn-sm">Call {help.emergency}</a>
            {helpline && (
              <a href={`tel:${helpline.phone!.replace(/\s/g, "")}`} className="btn btn-secondary btn-sm">
                {helpline.name}: {helpline.phone}
              </a>
            )}
          </div>
        </div>
      )}

      <ol className="flex-1 space-y-4 overflow-y-auto pb-6" aria-live="polite" aria-label="Conversation">
        {messages.map((m, i) => (
          <li key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed whitespace-pre-wrap ${
                m.role === "user" ? "bg-primary text-primary-fg" : "bg-surface-2"
              }`}
            >
              <span className="sr-only">{m.role === "user" ? "You: " : "Assistant: "}</span>
              {m.content}
            </p>
          </li>
        ))}
        {userTurns === 0 && !pending && (
          <li>
            <p className="caption mb-3">Not sure where to start? Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </li>
        )}
        {pending && (
          <li className="flex justify-start">
            <p className="rounded-2xl bg-surface-2 px-4 py-3 text-muted">Thinking…</p>
          </li>
        )}
        <div ref={endRef} />
      </ol>

      <div className="sticky bottom-16 space-y-3 border-t border-border bg-bg pt-4 pb-2 lg:bottom-0">
        {ready && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-2 p-4">
            <p className="text-sm">Want to talk to a professional? See who we&apos;d recommend — you can keep chatting too.</p>
            <button type="button" onClick={match} className="btn btn-primary btn-sm" disabled={matching || pending}>
              {matching ? "Finding your matches…" : "See my matches"}
            </button>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {full ? (
          <p className="caption">This conversation has reached its limit. You can start a new one from the Care page.</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-end gap-2"
          >
            <label htmlFor="intake-input" className="sr-only">Your message</label>
            <textarea
              id="intake-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              maxLength={1500}
              placeholder="Ask about cravings, drinking, betting, feelings…"
              className="input min-h-12 flex-1 resize-none"
              disabled={pending || matching}
            />
            <button type="submit" className="btn btn-primary" disabled={pending || matching || !draft.trim()}>
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
