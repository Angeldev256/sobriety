"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Shows "Install app" when the browser supports it, or Add-to-Home-Screen steps on iOS Safari. */
export function InstallAppButton({ className = "", tone = "default" }: { className?: string; tone?: "default" | "inverse" }) {
  const variant = tone === "inverse" ? "btn-on-inverse" : "btn-secondary";
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    // Reading browser-only APIs after mount; this cannot run during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstalled(standalone);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  if (deferred) {
    return (
      <button
        type="button"
        className={`btn ${variant} ${className}`}
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
      >
        Install the app
      </button>
    );
  }

  if (isIos) {
    return (
      <div className={className}>
        <button type="button" className={`btn ${variant} w-full`} aria-expanded={showIosHelp} onClick={() => setShowIosHelp((v) => !v)}>
          Install on iPhone or iPad
        </button>
        {showIosHelp && (
          <p className={`mt-3 text-sm ${tone === "inverse" ? "text-white/60" : "text-muted"}`}>
            In Safari, tap the <strong>Share</strong> button, then <strong>Add to Home Screen</strong>.
          </p>
        )}
      </div>
    );
  }

  return null;
}
