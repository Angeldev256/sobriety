// Sobriety Tracker service worker.
// Caching:
//  - Static build assets (/_next/static, icons): cache-first (they are content-hashed).
//  - Page navigations: network-first; fall back to the offline page. Private pages are NEVER cached,
//    because they contain sensitive personal data and may be on a shared device.
//  - Public pages (/help, /toolkit) are cached so support stays reachable offline.
//  - Caching is skipped on localhost so development builds are never served stale.
// Push:
//  - Shows notifications sent by the server and opens the right page when tapped.

const VERSION = "v2";
const STATIC_CACHE = `static-${VERSION}`;
const PAGES_CACHE = `pages-${VERSION}`;
const OFFLINE_URL = "/offline";
const PUBLIC_PAGES = [OFFLINE_URL, "/help", "/toolkit"];
const IS_DEV = ["localhost", "127.0.0.1"].includes(self.location.hostname);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (IS_DEV ? Promise.resolve() : caches.open(PAGES_CACHE).then((cache) => cache.addAll(PUBLIC_PAGES))).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC_CACHE, PAGES_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (IS_DEV) return;
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && PUBLIC_PAGES.includes(url.pathname)) {
            const copy = res.clone();
            caches.open(PAGES_CACHE).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match(OFFLINE_URL))),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const url = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/dashboard";
  event.waitUntil(
    self.registration.showNotification(data.title || "Sobriety Tracker", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "general",
      renotify: false,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const existing = wins.find((w) => new URL(w.url).origin === self.location.origin);
      if (existing) return existing.navigate(target).then((w) => (w || existing).focus());
      return self.clients.openWindow(target);
    }),
  );
});
