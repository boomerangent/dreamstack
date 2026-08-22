// Dreamstack service worker — makes the site installable and gives a basic
// offline fallback. Kept deliberately simple.
const CACHE = "dreamstack-v1";
const SHELL = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Only handle our own origin — never intercept Supabase, Stripe, fonts, etc.
  if (url.origin !== self.location.origin) return;

  // Page navigations: always try the network first so new deploys show up;
  // fall back to the cached shell only when offline.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/index.html")));
    return;
  }

  // Static assets (hashed JS/CSS, images): serve from cache, then network.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (
            res.ok &&
            (url.pathname.startsWith("/assets/") || url.pathname.endsWith(".png"))
          ) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
