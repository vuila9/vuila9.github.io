// Service worker for the Achilles standalone web app.
// Scope is this folder (registered from webapp.html as "sw.js"), so it only
// controls /projects/Achilles/.
//
// Strategy: NETWORK-FIRST. When online, always fetch the latest file and refresh
// the cache; only fall back to the cache when the network is unavailable (true
// offline play). This avoids the classic cache-first trap where deployed updates
// never reach an installed app because it keeps serving stale cached code.
//
// The precache list below is deliberately just the small app shell — the SWF
// and the Ruffle wasm runtime (~14MB, picked at runtime from two SIMD/non-SIMD
// variants) are NOT force-fetched here, that would make first install slow.
// They're cached the same way as everything else instead: the "fetch" handler
// below stashes a copy of every successful same-origin response, so once the
// game has actually been played once online, it's cached and plays offline
// from then on — which is what "offline after the first launch" means anyway.
//
// Bump CACHE whenever the precached file list changes.
const CACHE = "achilles-v4";
const ASSETS = [
  "./webapp.html",
  "./manifest.webmanifest",
  "./Achilles_icon.svg",
  "./achilles.swf",
  "./assets/css/effects.css",
  "./assets/js/achilles_app.js",
  "./vendor/ruffle/ruffle.js"
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
