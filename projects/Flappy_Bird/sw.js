// Service worker for the Flappy Bird standalone web app.
// Scope is this folder (registered from play.html as "sw.js"), so it only
// controls /projects/Flappy_Bird/. Cache-first: assets load instantly on repeat
// visits and the app works offline once it has been opened.
//
// Bump CACHE when any cached file changes so clients pick up the new version.
const CACHE = "flappy-v2";
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
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
