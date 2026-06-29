/* CiaraLink — Capacitor native bridge shim
 *
 * Loaded FIRST on every page inside the native iOS/Android app.
 * The web assets are BUNDLED into the app, so the app shell, HTML, CSS,
 * JS, icons and Supabase calls all work offline-first / on-device.
 *
 * Two jobs:
 *  1. Route relative serverless calls (fetch('/api/...')) to the live
 *     Vercel backend, because those /api functions are NOT bundled — they
 *     run on https://ciaralink.vercel.app. Supabase calls already use absolute URLs.
 *  2. Neutralise the PWA service worker inside the native shell (it can serve
 *     stale cached assets after an app update; the WebView already caches).
 *
 * No-op in a normal browser (window.Capacitor undefined).
 */
(function () {
  'use strict';

  var IS_NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if (!IS_NATIVE) return;

  var API_ORIGIN = 'https://ciaralink.vercel.app';

  var origFetch = window.fetch ? window.fetch.bind(window) : null;
  if (origFetch) {
    window.fetch = function (input, init) {
      try {
        if (typeof input === 'string' && input.indexOf('/api/') === 0) {
          input = API_ORIGIN + input;
        } else if (input && typeof input === 'object' && typeof input.url === 'string' && input.url.indexOf('/api/') === 0) {
          input = new Request(API_ORIGIN + input.url, input);
        }
      } catch (e) {}
      return origFetch(input, init);
    };
  }

  if (window.XMLHttpRequest) {
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      try {
        if (typeof url === 'string' && url.indexOf('/api/') === 0) {
          arguments[1] = API_ORIGIN + url;
        }
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

  console.log('[capacitor-bridge] native shell active — /api -> ' + API_ORIGIN + ', SW disabled');
})();
