const CACHE = 'thor-mode-v3';
const FONTS_CACHE = 'thor-mode-fonts-v1';
const CORE = ['./index.html', './'];

// ── Install: pre-cache core shell ────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

// ── Activate: wipe ALL old caches ────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE && k !== FONTS_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = e.request.url;
  const isFont = url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com');
  const isNav  = e.request.mode === 'navigate';

  if (isFont) {
    // Cache-first for fonts — they never change
    e.respondWith(
      caches.open(FONTS_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  if (isNav) {
    // Network-first for HTML — always try to get the latest version.
    // Falls back to cache only when genuinely offline.
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Everything else: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
