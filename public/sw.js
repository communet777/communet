// Service Worker für Communet (PWA).
// Bewusst schlank: Es werden nur unveränderliche Dateien (Skripte, Bilder, Icons) zwischengespeichert,
// damit die App schneller startet. Seiten, Anmeldung und Daten (Supabase, Kartenkacheln) laufen immer
// über das Netz und werden nie zwischengespeichert. Ohne Verbindung erscheint /offline.html.
const VERSION = 'communet-v1'
const STATIC_CACHE = `${VERSION}-static`
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL, '/icon-192.png'])).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/fotos/') ||
    /\.(?:png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname)
  )
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // Supabase, Kartenkacheln, Schriften: nie anfassen
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(req).then((hit) => {
          const fresh = fetch(req).then((res) => {
            if (res && res.ok) cache.put(req, res.clone())
            return res
          }).catch(() => hit)
          return hit || fresh
        })
      )
    )
  }
})
