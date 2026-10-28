// Service worker: keeps the public pages a visitor has opened (the map page carries the whole church list
// with summaries) and their photos, so they still open where there is no signal (much of Karpasia).
// Pages always come from the network first; the stored copy is only used offline.
const VERSION = "v2"
const PAGES = `pages-${VERSION}`
const ASSETS = `assets-${VERSION}`
const OFFLINE = "/offline.html"
const MAX_ASSETS = 400

// Accounts, forms and the admin area are never stored.
const PRIVATE = /^\/(?:[a-z]{2}\/)?(?:admin|api|profile|login|signup|forgot-password|reset-password|verified)(?:\/|$)/

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.addAll([OFFLINE, "/", "/cyprus/map"])).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function trim(cache) {
  const keys = await cache.keys()
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(k)
}

async function page(request) {
  const cache = await caches.open(PAGES)
  try {
    const res = await fetch(request)
    if (res.ok && !res.redirected) cache.put(request, res.clone())
    return res
  } catch {
    return (await cache.match(request)) ?? (await cache.match(new URL(request.url).pathname)) ?? (await cache.match(OFFLINE))
  }
}

// Build files and stored photos never change under the same address: the stored copy is used first.
async function asset(request) {
  const cache = await caches.open(ASSETS)
  const hit = await cache.match(request)
  if (hit) return hit
  const res = await fetch(request)
  if (res.ok && /immutable/.test(res.headers.get("cache-control") ?? "")) {
    await cache.put(request, res.clone())
    trim(cache)
  }
  return res
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== "GET" || url.origin !== location.origin || PRIVATE.test(url.pathname)) return
  if (request.mode === "navigate") event.respondWith(page(request))
  else if (/^\/(?:_next\/static|media|uploads)\//.test(url.pathname)) event.respondWith(asset(request))
})
