/*
 * stripe-pricing.js — shared CiaraLink ↔ Stripe checkout helpers.
 * Price IDs come from stripe-prices.json (same catalogue as create-checkout-session allowlist).
 */
(function () {
  'use strict';

  var catalogPromise = null;

  function authHeaders() {
    var headers = { 'Content-Type': 'application/json' };
    return Promise.resolve().then(function () {
      var A = window.CiaraLinkAuth;
      var client = A && A.getSupabaseClient && A.getSupabaseClient();
      if (!client || !client.auth) return headers;
      return client.auth.getSession().then(function (r) {
        var token = r && r.data && r.data.session && r.data.session.access_token;
        if (token) headers.Authorization = 'Bearer ' + token;
        return headers;
      });
    }).catch(function () { return headers; });
  }

  function loadCatalog() {
    if (window.__ciaralinkStripeCatalog) {
      return Promise.resolve(window.__ciaralinkStripeCatalog);
    }
    if (catalogPromise) return catalogPromise;
    catalogPromise = fetch('./stripe-prices.json?v=20260630')
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (map) {
        window.__ciaralinkStripeCatalog = map || {};
        return window.__ciaralinkStripeCatalog;
      });
    return catalogPromise;
  }

  function priceIdForSlug(catalog, slug, interval) {
    var entry = catalog && catalog[slug];
    if (!entry || !entry.prices) return null;
    interval = interval || 'month';
    return entry.prices[interval] || entry.prices.month || null;
  }

  function planLabelForPriceId(catalog, priceId) {
    if (!priceId || !catalog) return null;
    var keys = Object.keys(catalog);
    for (var i = 0; i < keys.length; i++) {
      var slug = keys[i];
      var p = catalog[slug].prices || {};
      if (p.month === priceId || p.year === priceId) {
        return (catalog[slug].name || slug).replace(/^CiaraLink — /, '');
      }
    }
    return null;
  }

  function startCheckout(opts) {
    opts = opts || {};
    var slug = opts.slug;
    var priceId = opts.priceId;
    var interval = opts.interval || 'month';
    var quantity = opts.quantity || 1;
    return loadCatalog().then(function (catalog) {
      if (!priceId && slug) priceId = priceIdForSlug(catalog, slug, interval);
      if (!priceId) return { ok: false, error: 'unknown_plan' };
      return authHeaders().then(function (headers) {
        return fetch('./api/create-checkout-session', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ priceId: priceId, mode: 'subscription', quantity: quantity }),
        }).then(function (r) {
          return r.json().then(function (data) { return { ok: r.ok, data: data }; })
            .catch(function () { return { ok: false, data: {} }; });
        }).then(function (res) {
          if (res.ok && res.data && res.data.url) {
            window.location = res.data.url;
            return { ok: true, redirecting: true };
          }
          return { ok: false, error: (res.data && res.data.error) || 'checkout_failed', data: res.data };
        });
      });
    }).catch(function () { return { ok: false, error: 'network' }; });
  }

  function openBillingPortal() {
    return authHeaders().then(function (headers) {
      return fetch('./api/create-portal-session', { method: 'POST', headers: headers })
        .then(function (r) {
          return r.json().then(function (data) { return { ok: r.ok, data: data }; })
            .catch(function () { return { ok: false, data: {} }; });
        })
        .then(function (res) {
          if (res.ok && res.data && res.data.url) {
            window.location = res.data.url;
            return { ok: true, redirecting: true };
          }
          return {
            ok: false,
            error: (res.data && res.data.error) || 'portal_failed',
            message: (res.data && res.data.message) || null,
          };
        });
    }).catch(function () { return { ok: false, error: 'network' }; });
  }

  window.CiaraLinkStripe = {
    loadCatalog: loadCatalog,
    priceIdForSlug: function (slug, interval) {
      return loadCatalog().then(function (c) { return priceIdForSlug(c, slug, interval); });
    },
    planLabelForPriceId: function (priceId) {
      return loadCatalog().then(function (c) { return planLabelForPriceId(c, priceId); });
    },
    startCheckout: startCheckout,
    openBillingPortal: openBillingPortal,
  };
})();
