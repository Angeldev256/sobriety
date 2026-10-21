"use client";

import { useEffect, useState, useTransition } from "react";
import { removePushSubscription, savePushSubscription, sendTestNotification } from "@/app/(app)/notifications/actions";

type Status = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/** Turns phone/desktop notifications on or off for this device. */
export function PushToggle({ vapidKey }: { vapidKey: string | null }) {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!vapidKey || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setStatus(ios && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setStatus("denied");
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    })();
  }, [vapidKey]);

  const enable = () =>
    start(async () => {
      setMessage(null);
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey!) });
      const res = await savePushSubscription(sub.toJSON(), navigator.userAgent);
      if (res.ok) {
        setStatus("on");
        setMessage("Notifications are on for this device.");
      } else {
        await sub.unsubscribe();
        setMessage("We couldn't turn on notifications. Please try again.");
      }
    });

  const disable = () =>
    start(async () => {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
      setMessage("Notifications are off for this device.");
    });

  const test = () =>
    start(async () => {
      const r = await sendTestNotification();
      setMessage(r.pushed > 0 ? "Test sent. It should appear in a moment." : "Saved to your inbox, but no device received it. Try turning notifications off and on again.");
    });

  return (
    <div className="rounded-lg border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-semibold">Phone and desktop notifications</p>
          <p className="caption mt-1">
            {status === "on" && "On for this device."}
            {status === "off" && "Get gentle reminders even when the app is closed."}
            {status === "denied" && "Blocked in your browser settings. Allow notifications for this site to turn them on."}
            {status === "unsupported" && "This browser doesn't support notifications."}
            {status === "ios-install" && "On iPhone and iPad, first add the app to your Home Screen (Share → Add to Home Screen), then open it from there."}
            {status === "loading" && " "}
          </p>
        </div>
        {status === "off" && (
          <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={enable}>
            {pending ? "Turning on…" : "Turn on"}
          </button>
        )}
        {status === "on" && (
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={test}>Send a test</button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={disable}>Turn off</button>
          </div>
        )}
      </div>
      {message && (
        <p role="status" className="mt-4 border-l-2 border-primary pl-3 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
