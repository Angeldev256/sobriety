"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // The worker skips caching on localhost, so registering in development is safe and lets push be tested.
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Offline support and push are enhancements; the app works without them.
    });
  }, []);
  return null;
}
