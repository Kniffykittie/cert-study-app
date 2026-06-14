const CACHE = 'csa-shell-v2'

const SHELL = [
  '/',
  '/offline',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Never intercept API calls, Supabase, or non-GET requests
  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return
  if (url.hostname.includes('supabase')) return
  if (url.hostname.includes('anthropic')) return

  // Network-first for navigation (HTML pages)
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .catch(() => caches.match('/offline').then(r => r || new Response('Offline', { status: 503 })))
    )
    return
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ico)$/)) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then(c => c.put(request, clone))
          }
          return res
        })
      })
    )
    return
  }

  // Everything else: network with no caching
  e.respondWith(fetch(request).catch(() => new Response('', { status: 503 })))
})
