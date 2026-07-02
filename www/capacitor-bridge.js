/* CiaraLink — Capacitor native bridge shim
 *
 * Loaded FIRST on every page inside the native iOS/Android app.
 * The web assets are BUNDLED into the app, so the app shell, HTML, CSS,
 * JS, icons and Supabase calls all work offline-first / on-device.
 *
 * Two jobs:
 *  1. Route relative serverless calls (fetch('/api/...') and fetch('./api/...'))
 *     to the live Vercel backend, because those /api functions are NOT bundled —
 *     they run on https://ciaralink.vercel.app. Supabase calls already use absolute URLs.
 *  2. Neutralise the PWA service worker inside the native shell (it can serve
 *     stale cached assets after an app update; the WebView already caches).
 *
 * No-op in a normal browser (window.Capacitor undefined).
 */
(function () {
  'use strict';

  var IS_NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if (!IS_NATIVE) return;

  /* Native phone layout: mark root + load shared mobile CSS before first paint. */
  try {
    document.documentElement.classList.add('cl-native');
    var vp = document.querySelector('meta[name="viewport"]');
    if (vp) {
      vp.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
    } else {
      vp = document.createElement('meta');
      vp.name = 'viewport';
      vp.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
      document.head.appendChild(vp);
    }
    if (!document.querySelector('link[href*="mobile-native.css"]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/mobile-native.css';
      document.head.appendChild(link);
    }
  } catch (e) {}

  var API_ORIGIN = 'https://ciaralink.vercel.app';

  function rewriteApiUrl(url) {
    if (typeof url !== 'string') return url;
    if (url.indexOf('/api/') === 0) return API_ORIGIN + url;
    if (url.indexOf('./api/') === 0) return API_ORIGIN + url.slice(1);
    return url;
  }

  var origFetch = window.fetch ? window.fetch.bind(window) : null;
  if (origFetch) {
    window.fetch = function (input, init) {
      try {
        if (typeof input === 'string') {
          input = rewriteApiUrl(input);
        } else if (input && typeof input === 'object' && typeof input.url === 'string') {
          var rewritten = rewriteApiUrl(input.url);
          if (rewritten !== input.url) input = new Request(rewritten, input);
        }
      } catch (e) {}
      return origFetch(input, init);
    };
  }

  if (window.XMLHttpRequest) {
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      try {
        if (typeof url === 'string') arguments[1] = rewriteApiUrl(url);
      } catch (e) {}
      return origOpen.apply(this, arguments);
    };
  }

  if (navigator.serviceWorker && navigator.serviceWorker.register) {
    navigator.serviceWorker.register = function () {
      return Promise.reject(new Error('Service worker disabled inside CiaraLink native app'));
    };
    navigator.serviceWorker.getRegistrations && navigator.serviceWorker
      .getRegistrations()
      .then(function (regs) { regs.forEach(function (r) { r.unregister(); }); })
      .catch(function () {});
  }

  console.log('[capacitor-bridge] native shell active — /api + ./api -> ' + API_ORIGIN + ', SW disabled');
})();
