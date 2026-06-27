// Service worker for the Flappy Bird standalone web app.
// Scope is this folder (registered from play.html as "sw.js"), so it only
// controls /projects/Flappy_Bird/.
//
// Strategy: NETWORK-FIRST. When online, always fetch the latest file and refresh
// the cache; only fall back to the cache when the network is unavailable (true
// offline play). This avoids the classic cache-first trap where deployed updates
// never reach an installed app because it keeps serving stale cached code.
//
// Bump CACHE whenever the precached file list changes.
const CACHE = "flappy-v3";
const ASSETS = [
  "./play.html",
  "./manifest.webmanifest",
  "./assets/css/effects.css",
  "./assets/js/flappy_assets.js",
  "./assets/js/Flappy_Bird.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        // Stash a fresh copy for offline use (same-origin, successful responses).
        if (res && res.status === 200 && req.url.startsWith(self.location.origin)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
