"use client";

import { useTransition } from "react";
import { markAllRead } from "@/app/(app)/notifications/actions";

export function MarkAllRead() {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => markAllRead())} className="text-sm font-semibold text-link hover:underline disabled:opacity-50">
      {pending ? "Marking…" : "Mark all as read"}
    </button>
  );
}
