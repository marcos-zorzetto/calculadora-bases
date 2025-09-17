/* Service Worker — Calculator Pro
   Estratégia: App Shell com "cache-first" para os assets locais e "network-first" para CDNs.
*/
const CACHE_NAME = "calc-pro-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./assets/styles.css",
  "./assets/app.js",
  "./assets/favicon.svg",
  "./manifest.webmanifest"
];


// Instala e pré-cacheia o app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Limpa caches antigos em ativação
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Regra de fetch:
// - Requisições do mesmo host => cache-first (rápido/offline).
// - CDNs (bootstrap/jsdelivr) => network-first com fallback ao cache.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req));
  } else {
    event.respondWith(networkFirst(req));
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  return cached || fetch(req).then((res) => {
    if (req.method === "GET" && res.ok) cache.put(req, res.clone());
    return res;
  });
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req);
    if (req.method === "GET" && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(req);
    return cached || new Response("Offline", { status: 503, statusText: "Offline" });
  }
}
