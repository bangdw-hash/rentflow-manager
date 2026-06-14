// rentflow service worker — network-first (온라인이면 항상 최신, 오프라인일 때만 캐시 폴백)
const CACHE = 'rentflow-runtime-v1'
const INDEX = new URL('./index.html', self.location).href

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return

  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req)
        const cache = await caches.open(CACHE)
        cache.put(req, res.clone()).catch(() => {})
        return res
      } catch {
        const cached = await caches.match(req)
        if (cached) return cached
        if (req.mode === 'navigate') {
          const fallback = await caches.match(INDEX)
          if (fallback) return fallback
        }
        throw new Error('offline and not cached')
      }
    })()
  )
})
