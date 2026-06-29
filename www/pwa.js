/* CiaraLink Worker — PWA registration + install UX
 *
 * - Registers /sw.js (scope "/") when supported.
 * - Android/Chrome: captures `beforeinstallprompt` and shows a subtle,
 *   dismissible "Install app" button that calls prompt().
 * - iOS Safari (no beforeinstallprompt): shows a one-time, dismissible
 *   "Tap Share -> Add to Home Screen" hint, only in mobile Safari and only
 *   when not already running standalone.
 *
 * Tasteful + honest: nothing blocks the UI; everything is dismissible and
 * remembers dismissal in localStorage.
 */
(function () {
  'use strict';

  var BRAND = '#0c2622';
  var ACCENT = '#16b8a6';
  var DISMISS_KEY = 'cl_worker_pwa_hint_dismissed';

  // ---- Service worker registration -------------------------------------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(
        function (reg) {
          // Pick up updated SW on next navigation.
          reg.addEventListener('updatefound', function () {
            var sw = reg.installing;
            if (!sw) return;
            sw.addEventListener('statechange', function () {
              if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                // A new version is ready; it will take over on next load.
                sw.postMessage('SKIP_WAITING');
              }
            });
          });
        },
        function (err) {
          // Registration failed (e.g. unsupported context) — fail silently.
          if (window.console && console.warn) console.warn('SW registration failed:', err);
        }
      );
    });
  }

  // ---- Helpers ----------------------------------------------------------
  function isStandalone() {
    return (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true
    );
  }

  function isIos() {
    var ua = window.navigator.userAgent || '';
    var iOSDevice = /iPad|iPhone|iPod/.test(ua);
    // iPadOS 13+ reports as Mac; detect touch Mac too.
    var iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return iOSDevice || iPadOS;
  }

  function isIosSafari() {
    if (!isIos()) return false;
    var ua = window.navigator.userAgent || '';
    // Exclude in-app browsers / other engines on iOS.
    return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Mercury/.test(ua);
  }

  function dismissed() {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return false; }
  }
  function setDismissed() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
  }

  // ---- Banner UI --------------------------------------------------------
  function makeBanner(inner) {
    var bar = document.createElement('div');
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Install CiaraLink Worker');
    bar.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:18px', 'transform:translateX(-50%)',
      'z-index:99999', 'max-width:92vw', 'box-sizing:border-box',
      'display:flex', 'align-items:center', 'gap:12px',
      'padding:11px 14px', 'border-radius:14px',
      'background:' + BRAND, 'color:#eafaf8',
      'font-family:inherit', 'font-size:13.5px', 'font-weight:600',
      'box-shadow:0 16px 40px -12px rgba(0,0,0,.55)',
      'border:1px solid rgba(255,255,255,.08)'
    ].join(';');
    bar.appendChild(inner);
    return bar;
  }

  function closeBtn(onClose) {
    var b = document.createElement('button');
    b.setAttribute('aria-label', 'Dismiss');
    b.textContent = '×';
    b.style.cssText = 'background:none;border:none;color:#7ce0d2;cursor:pointer;font-size:20px;line-height:1;padding:0 2px;flex:0 0 auto';
    b.addEventListener('click', onClose);
    return b;
  }

  function mount(bar) {
    function add() { document.body.appendChild(bar); }
    if (document.body) add();
    else window.addEventListener('DOMContentLoaded', add);
  }

  // ---- Android / Chrome install prompt ---------------------------------
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (isStandalone() || dismissed()) return;

    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:12px';

    var label = document.createElement('span');
    label.textContent = 'Install the CiaraLink Worker app';

    var install = document.createElement('button');
    install.textContent = 'Install';
    install.style.cssText = 'background:' + ACCENT + ';color:#04201c;border:none;border-radius:9px;padding:7px 14px;font-weight:700;font-size:13px;cursor:pointer;flex:0 0 auto';

    var bar = makeBanner(wrap);
    wrap.appendChild(label);
    wrap.appendChild(install);
    wrap.appendChild(closeBtn(function () { setDismissed(); bar.remove(); }));

    install.addEventListener('click', function () {
      bar.remove();
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () { deferredPrompt = null; });
    });

    mount(bar);
  });

  window.addEventListener('appinstalled', function () {
    setDismissed();
    deferredPrompt = null;
  });

  // ---- iOS Safari hint --------------------------------------------------
  function maybeShowIosHint() {
    if (isStandalone() || dismissed()) return;
    if (!isIosSafari()) return;

    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:10px';

    var txt = document.createElement('span');
    txt.innerHTML = 'Install this app: tap <b style="color:' + ACCENT + '">Share</b> then <b>Add to Home Screen</b>';

    var bar = makeBanner(wrap);
    wrap.appendChild(txt);
    wrap.appendChild(closeBtn(function () { setDismissed(); bar.remove(); }));
    mount(bar);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(maybeShowIosHint, 800);
  } else {
    window.addEventListener('DOMContentLoaded', function () {
      setTimeout(maybeShowIosHint, 800);
    });
  }
})();
