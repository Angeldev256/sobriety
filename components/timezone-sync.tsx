"use client";

import { useEffect } from "react";
import { setTimezoneIfDefault } from "@/app/(app)/settings/actions";
import type { Theme } from "@/lib/database.types";

/**
 * - On first visit, store the browser's time zone so "today" matches the user's real day.
 * - Keep this device's theme in step with the theme saved on the profile.
 */
export function TimezoneSync({ saved, theme }: { saved: string; theme: Theme }) {
  useEffect(() => {
    if (saved !== "UTC") return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== "UTC") void setTimezoneIfDefault(tz);
  }, [saved]);

  useEffect(() => {
    try {
      if (localStorage.getItem("theme") === theme) return;
      localStorage.setItem("theme", theme);
    } catch {
      // storage unavailable; fall through and apply for this view
    }
    const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [theme]);

  return null;
}
