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

// The SWF itself is baked with Mochi Media's old stats beacon — a copy-paste
// tracker snippet common to circa-2008 Flash games, firing on startup
// regardless of anything this page does. Mochi Media shut down in 2014, so
// the call was always going to fail one way or another; browsers/ad-blockers
// often reject it outright (ERR_BLOCKED_BY_CLIENT), which Ruffle logs as a
// movie-load error even though nothing in the actual game depends on it.
// Answering it here — synthetically, without ever touching the network —
// lets Ruffle's loadMovie call resolve instead of reject, so it fails
// silently instead of spamming the console on every launch.
const MOCHIBOT_HOST = "mochibot.com";

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  if (req.url.includes(MOCHIBOT_HOST)) {
    e.respondWith(new Response(new Uint8Array(0), { status: 200 }));
    return;
  }

  // Only this app's own same-origin files are ours to cache/serve offline.
  // Any other third-party request has no business being intercepted here:
  // it can't be cached (opaque cross-origin response) and was never going to
  // be in our cache as a fallback, so catching its failures here only turned
  // an already-failed request into an unhandled "undefined is not a
  // Response" rejection. Left alone, the browser handles it exactly as it
  // would with no service worker installed at all.
  if (!req.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        // Stash a fresh copy for offline use (same-origin, successful responses).
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || Response.error())
      )
  );
});
