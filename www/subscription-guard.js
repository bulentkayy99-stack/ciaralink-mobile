/*
 * subscription-guard.js — CiaraLink soft, non-blocking subscription gate.
 *
 * GUARDRAIL: honest preview, never break the demo.
 * This helper NEVER locks anyone out of a core dashboard. It reads the
 * signed-in user's real Stripe subscription state (via
 * CiaraLinkAuth.loadCurrentSubscription, which is RLS-protected) and:
 *
 *   - SOFT mode (DEFAULT): adds a small "Upgrade" badge to elements you
 *     explicitly mark with  data-cl-premium  when the user has NO active
 *     plan. Purely visual and honest — clicking the element still works.
 *
 *   - HARD mode (OPT-IN, OFF by default): intercepts clicks on
 *     data-cl-premium elements for users without an active plan and shows an
 *     "Upgrade to unlock" nudge that routes to pricing.html instead of running
 *     the action. To enable, set BEFORE this script loads:
 *         window.CIARALINK_HARD_GATE = true;
 *     Even in hard mode, ONLY elements you mark are affected — the dashboards
 *     themselves are never gated.
 *
 * FAILS OPEN: if billing isn't configured, the user isn't signed in, the
 * lookup errors, or state is simply unknown, NOTHING is gated and no badge is
 * shown. Demo logins (which have no subscription) are signed in but read
 * active:false — in soft mode they see an honest badge, never a lockout.
 *
 * HOW TO MARK A PREMIUM ACTION:
 *   <button data-cl-premium ...>Smart Match</button>
 * then include this file once per page (after supabase-client.js):
 *   <script src="./subscription-guard.js"></script>
 *
 * The CSS badge is rendered with a ::after pseudo-element on the marked
 * element, so it survives framework re-renders (no DOM children injected).
 */
(function () {
  'use strict';

  var STATE = null;     // resolved { known, active, subscription }
  var INFLIGHT = null;  // de-dupe concurrent resolves

  function hardMode() { return window.CIARALINK_HARD_GATE === true; }

  // Resolve subscription state once. Always resolves (never rejects).
  // known === false means we could not determine state -> treat as allowed.
  function resolveState() {
    if (STATE) return Promise.resolve(STATE);
    if (INFLIGHT) return INFLIGHT;
    INFLIGHT = (async function () {
      var out = { known: false, active: false, subscription: null };
      try {
        var A = window.CiaraLinkAuth;
        if (!A || typeof A.loadCurrentSubscription !== 'function') return out;
        if (A.isSupabaseConfigured && !A.isSupabaseConfigured()) return out;
        // Only meaningful if signed in.
        var client = A.getSupabaseClient && A.getSupabaseClient();
        if (!client) return out;
        var u = null;
        try { var r = await client.auth.getUser(); u = r && r.data && r.data.user; } catch (e) {}
        if (!u) return out; // signed out -> unknown, fail open
        var res = await A.loadCurrentSubscription();
        if (!res || !res.ok) return out; // lookup failed -> fail open
        out.known = true;
        out.active = !!res.active;
        out.subscription = res.subscription || null;
        return out;
      } catch (e) {
        return out; // any error -> fail open
      } finally {
        // cached below
      }
    })().then(function (s) { STATE = s; INFLIGHT = null; return s; });
    return INFLIGHT;
  }

  function injectBadgeStyles() {
    if (document.getElementById('cl-guard-style')) return;
    var st = document.createElement('style');
    st.id = 'cl-guard-style';
    st.textContent =
      '[data-cl-premium]{position:relative}' +
      '[data-cl-premium].cl-locked::after{content:"Upgrade";position:absolute;top:-8px;right:-8px;' +
      'font-family:inherit;font-size:9px;font-weight:800;letter-spacing:.04em;line-height:1;' +
      'padding:3px 6px;border-radius:999px;background:#0c2622;color:#7ce0d2;' +
      'box-shadow:0 2px 6px -2px rgba(8,40,36,.5);pointer-events:none;z-index:2}';
    (document.head || document.documentElement).appendChild(st);
  }

  function markElements() {
    var els = document.querySelectorAll('[data-cl-premium]');
    for (var i = 0; i < els.length; i++) els[i].classList.add('cl-locked');
  }

  var nudgeShowing = false;
  function nudge(opts) {
    opts = opts || {};
    if (nudgeShowing) return;
    nudgeShowing = true;
    var wrap = document.createElement('div');
    wrap.setAttribute('role', 'status');
    wrap.style.cssText =
      'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483600;' +
      'display:flex;align-items:center;gap:12px;max-width:calc(100vw - 32px);' +
      'background:#0c2622;color:#eafaf8;font-family:\'Hanken Grotesk\',system-ui,sans-serif;' +
      'padding:13px 16px;border-radius:14px;box-shadow:0 20px 50px -20px rgba(8,40,36,.7);' +
      'border:1px solid rgba(255,255,255,.08)';
    var msg = document.createElement('span');
    msg.style.cssText = 'font-size:13.5px;font-weight:600';
    msg.textContent = opts.message || 'That’s a premium feature on a paid plan.';
    var cta = document.createElement('a');
    cta.href = './pricing.html';
    cta.textContent = 'Choose a plan →';
    cta.style.cssText = 'font-size:13px;font-weight:800;color:#06201c;background:#16b8a6;' +
      'border-radius:9px;padding:7px 13px;text-decoration:none;white-space:nowrap';
    var close = document.createElement('button');
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '×';
    close.style.cssText = 'background:none;border:none;color:#7e948e;font-size:18px;cursor:pointer;line-height:1;padding:0 2px';
    close.onclick = function () { remove(); };
    function remove() { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); nudgeShowing = false; }
    wrap.appendChild(msg); wrap.appendChild(cta); wrap.appendChild(close);
    document.body.appendChild(wrap);
    setTimeout(remove, 6000);
  }

  // HARD mode only: intercept clicks on premium elements when no active plan.
  // Delegated on document (capture) so it survives framework re-renders and
  // never touches framework-owned DOM.
  function installHardInterceptor() {
    document.addEventListener('click', function (ev) {
      if (!STATE || !STATE.known || STATE.active) return; // allowed / unknown
      var el = ev.target && ev.target.closest && ev.target.closest('[data-cl-premium]');
      if (!el) return;
      ev.preventDefault();
      ev.stopPropagation();
      nudge({ message: 'Unlock this with a CiaraLink plan.' });
    }, true);
  }

  function apply() {
    resolveState().then(function (s) {
      if (!s.known || s.active) return; // fail open / already paid -> do nothing
      injectBadgeStyles();
      markElements();
      if (hardMode()) installHardInterceptor();
    });
  }

  // Public API (also usable programmatically without data-attributes).
  window.CiaraLinkGuard = {
    // Promise<{known, active, subscription}>; fails open (never rejects).
    state: resolveState,
    // Promise<boolean> — true if the user may use a premium feature.
    // In SOFT mode this is always true (advisory). In HARD mode it's false
    // only when state is known AND inactive.
    canUsePremium: function () {
      return resolveState().then(function (s) {
        if (!s.known) return true;       // unknown -> allow
        if (s.active) return true;       // paid -> allow
        return hardMode() ? false : true; // soft mode still allows
      });
    },
    // Show the upgrade nudge on demand.
    nudge: nudge,
    // Wrap a function so HARD mode gates it; SOFT mode just runs it.
    guard: function (fn, opts) {
      return function () {
        var args = arguments, self = this;
        return resolveState().then(function (s) {
          var blocked = hardMode() && s.known && !s.active;
          if (blocked) { nudge(opts); return undefined; }
          return fn.apply(self, args);
        });
      };
    },
    // Re-scan the DOM for newly added [data-cl-premium] elements.
    refresh: apply,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
