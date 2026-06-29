/* CiaraLink Worker — Service Worker
 *
 * Scope: "/" (registered from the worker PWA pages).
 *
 * Strategy:
 *   - Navigations / HTML  -> network-first (fresh from disk when online,
 *                            cached app shell when offline).
 *   - Static shell assets -> cache-first (icons, manifest, shell JS/CSS).
 *   - Supabase / /api/*   -> NEVER cached. These bypass the SW entirely so
 *                            auth + role-secured data are never stale or
 *                            served offline-wrong (network-only).
 *
 * The app shell is precached so a logged-in worker can still open the app
 * frame offline, but ALL secured data still goes straight to the network.
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `cl-worker-${CACHE_VERSION}`;

// App shell to precache. Spaces in filenames are URL-encoded (%20) so the
// cached keys match the requests the browser actually makes.
const SHELL_ASSETS = [
  '/Login.dc.html',
  '/Support%20Worker.dc.html',
  '/Worker%20App.dc.html',
  '/Worker%20Passport.dc.html',
  '/Worker%20Agreement.dc.html',
  '/supabase-client.js',
  '/env.local.js',
  '/pwa.js',
  '/manifest.webmanifest',
  '/apple-touch-icon.png',
  '/icons/ciaralink-worker-192.png',
  '/icons/ciaralink-worker-512.png',
  '/icons/ciaralink-worker-maskable-512.png'
];

// Offline fallback for navigations when nothing better is cached.
const OFFLINE_FALLBACK = '/Login.dc.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll fails the whole install if any asset 404s (e.g. icons not yet
      // generated). Add individually + tolerate failures so the SW still
      // installs; missing assets simply aren't precached.
      return Promise.all(
        SHELL_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {
            /* asset not present yet (e.g. icons) — skip, don't block install */
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('cl-worker-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Hosts whose responses must NEVER be cached / never intercepted.
function isBypassed(url, request) {
  // Anything not GET is never cached.
  if (request.method !== 'GET') return true;

  // Supabase auth + REST (role-secured data must be live).
  if (url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.in')) {
    return true;
  }

  // Same-origin API routes.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    return true;
  }

  // Cross-origin (supabase-js CDN data calls, fonts, analytics, etc.):
  // let the network handle them — we only manage same-origin shell.
  if (url.origin !== self.location.origin) {
    return true;
  }

  return false;
}

function isHtmlRequest(request, url) {
  if (request.mode === 'navigate') return true;
  if (request.destination === 'document') return true;
  return /\.dc\.html$|\.html$/.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Never touch secured / cross-origin requests — straight to network.
  if (isBypassed(url, request)) {
    return; // default browser fetch, SW does not intercept
  }

  // Network-first for HTML / navigations: fresh-from-disk when online,
  // fall back to cached shell when offline.
  if (isHtmlRequest(request, url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || caches.match(OFFLINE_FALLBACK)
          )
        )
    );
    return;
  }

  // Cache-first for static shell assets (icons, manifest, shell JS/CSS).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

// Allow the page to trigger an immediate activation after an update.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
