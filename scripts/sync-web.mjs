#!/usr/bin/env node
/* CiaraLink mobile — repeatable web-bundle sync.
 *
 * Copies the live web app from ../ciaralink into ./www as a COMPLETE, CURRENT
 * copy, then (re)writes the native-only files and (re)injects the Capacitor
 * bridge into every page. Safe to run any time the website changes.
 *
 * Run via:  npm run sync:web      (then `npx cap sync` to push into native)
 *           npm run refresh       (does both)
 *
 * Never bundles secrets: only env.local.js with the public anon key is copied,
 * and we hard-fail if a service_role key is ever detected.
 */
import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, '..');
const SRC = path.resolve(PROJECT, '..', 'ciaralink');
const DEST = path.join(PROJECT, 'www');
const API_ORIGIN = 'https://ciaralink.vercel.app';

// Native-only files we own (never come from the website). These are (re)written
// every run so the bundle is correct even from a clean www/.
const NATIVE_FILES = ['capacitor-bridge.js', 'native-init.js', 'mobile-native.css', 'index.html'];

// Root files we explicitly DO NOT bundle.
const SKIP_FILES = new Set([
  'clone-prices-to-live.mjs', // server-only build script
  'stripe-prices.test.json',  // test fixture
  'vercel.json',              // Vercel deploy config, irrelevant to the app
  'env.example.js',           // template
  'manifest.json',            // stale PWA manifest with broken ../icons/*.webp refs;
                              // pages use /manifest.webmanifest instead.
]);

// The web pages load supabase-js from a public CDN. Inside the native shell we
// want the app to work even when that CDN is unreachable (offline first launch,
// a reviewer behind a restricted proxy, etc.) — otherwise login silently does
// nothing. We vendor supabase-js into vendor/ and rewrite the CDN <script> to it.
const SUPABASE_LOCAL = '/vendor/supabase.js';
const SUPABASE_UMD_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
const SUPABASE_CDN_RE = /https?:\/\/(?:cdn\.jsdelivr\.net\/npm|unpkg\.com)\/@supabase\/supabase-js@[^"')\s]*/g;

// Root file extensions to bundle.
const COPY_EXT = new Set(['.html', '.js', '.json', '.webmanifest', '.png']);

const BRIDGE_TAG = '<script src="capacitor-bridge.js"></script>';
const INIT_TAG = '<script src="native-init.js" defer></script>';

const capacitorBridgeJs = `/* CiaraLink — Capacitor native bridge shim
 *
 * Loaded FIRST on every page inside the native iOS/Android app.
 * The web assets are BUNDLED into the app, so the app shell, HTML, CSS,
 * JS, icons and Supabase calls all work offline-first / on-device.
 *
 * Two jobs:
 *  1. Route relative serverless calls (fetch('/api/...')) to the live
 *     Vercel backend, because those /api functions are NOT bundled — they
 *     run on ${API_ORIGIN}. Supabase calls already use absolute URLs.
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
    }
    if (!document.querySelector('link[href*="mobile-native.css"]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/mobile-native.css';
      document.head.appendChild(link);
    }
  } catch (e) {}

  var API_ORIGIN = '${API_ORIGIN}';

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
`;

const nativeInitJs = `/* CiaraLink — native runtime niceties (vanilla, no bundler).
 * Uses the global window.Capacitor.Plugins API. No-op in a normal browser.
 */
(function () {
  'use strict';
  var C = window.Capacitor;
  if (!C || !(C.isNativePlatform && C.isNativePlatform())) return;
  var P = C.Plugins || {};

  try {
    if (P.StatusBar) {
      P.StatusBar.setBackgroundColor({ color: '#14302b' });
      P.StatusBar.setStyle({ style: 'DARK' });
    }
  } catch (e) {}

  try {
    if (P.SplashScreen) {
      window.addEventListener('load', function () {
        setTimeout(function () { P.SplashScreen.hide(); }, 200);
      });
    }
  } catch (e) {}

  try {
    if (P.App && P.App.addListener) {
      P.App.addListener('backButton', function (ev) {
        var path = (location.pathname || '').toLowerCase();
        var atRoot = path.indexOf('login') > -1 || path.indexOf('landing') > -1 || path === '/' || path === '';
        if (ev && ev.canGoBack && !atRoot) {
          window.history.back();
        } else {
          P.App.exitApp();
        }
      });
    }
  } catch (e) {}
})();
`;

const indexHtml = `<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>CiaraLink — Care OS</title>
  <meta name="theme-color" content="#14302b" />
  ${BRIDGE_TAG}
  ${INIT_TAG}
  <style>
    html,body{height:100%;margin:0;background:#14302b;color:#16b8a6;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}
    .wrap{height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px;}
    img{width:96px;height:96px;border-radius:22px;}
    .dot{width:8px;height:8px;border-radius:50%;background:#16b8a6;animation:p 1s infinite ease-in-out;}
    @keyframes p{0%,100%{opacity:.3}50%{opacity:1}}
  </style>
  <script>
    window.location.replace('Login.dc.html?source=app');
  </script>
</head>
<body>
  <div class="wrap">
    <img src="icons/ciaralink-worker-512.png" alt="CiaraLink" />
    <div class="dot"></div>
    <noscript><a href="Login.dc.html" style="color:#16b8a6">Open CiaraLink</a></noscript>
  </div>
</body>
</html>
`;

async function copyTree(srcDir, destDir) {
  await fs.mkdir(destDir, { recursive: true });
  for (const entry of await fs.readdir(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) await copyTree(s, d);
    else await fs.copyFile(s, d);
  }
}

async function run() {
  if (!existsSync(SRC)) throw new Error('Source web app not found at ' + SRC);

  // 1. Copy eligible root files fresh (overwrites stale copies).
  let copied = 0;
  for (const name of await fs.readdir(SRC)) {
    if (SKIP_FILES.has(name) || NATIVE_FILES.includes(name)) continue;
    const ext = path.extname(name).toLowerCase();
    if (!COPY_EXT.has(ext)) continue;
    const stat = await fs.stat(path.join(SRC, name));
    if (!stat.isFile()) continue;
    await fs.copyFile(path.join(SRC, name), path.join(DEST, name));
    copied++;
  }

  // 2. Copy the icons directory.
  if (existsSync(path.join(SRC, 'icons'))) {
    await copyTree(path.join(SRC, 'icons'), path.join(DEST, 'icons'));
  }

  // 2b. Copy the vendored app runtime (React/ReactDOM/Babel) so the dashboards
  // hydrate offline on-device instead of fetching libraries from a CDN.
  if (existsSync(path.join(SRC, 'vendor'))) {
    await copyTree(path.join(SRC, 'vendor'), path.join(DEST, 'vendor'));
  }

  // 2c. Ensure supabase-js is vendored locally (so auth/data work without the
  // CDN). Kept if already present; downloaded once if missing.
  const supaVendor = path.join(DEST, 'vendor', 'supabase.js');
  if (!existsSync(supaVendor)) {
    try {
      const res = await fetch(SUPABASE_UMD_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      await fs.mkdir(path.dirname(supaVendor), { recursive: true });
      await fs.writeFile(supaVendor, Buffer.from(await res.arrayBuffer()));
      console.log('  vendored supabase-js -> vendor/supabase.js');
    } catch (e) {
      throw new Error(
        'vendor/supabase.js is missing and the download failed (' + e.message +
        '). Restore www/vendor/supabase.js (the @supabase/supabase-js@2 UMD build) and re-run.'
      );
    }
  }

  // 3. (Re)write native-only files (mobile-native.css is edited in www/ — preserve it).
  await fs.writeFile(path.join(DEST, 'capacitor-bridge.js'), capacitorBridgeJs);
  await fs.writeFile(path.join(DEST, 'native-init.js'), nativeInitJs);
  await fs.writeFile(path.join(DEST, 'index.html'), indexHtml);
  if (!existsSync(path.join(DEST, 'mobile-native.css'))) {
    throw new Error('www/mobile-native.css missing — restore before sync');
  }

  // 4. Re-inject the bridge + native-init into every page (fresh copies lost it)
  //    and point the supabase-js <script> at the local vendored copy.
  let injected = 0;
  let rewired = 0;
  for (const name of await fs.readdir(DEST)) {
    if (!name.endsWith('.html') || name === 'index.html') continue;
    let html = await fs.readFile(path.join(DEST, name), 'utf8');
    let changed = false;
    if (!html.includes('capacitor-bridge.js')) {
      const m = html.match(/<head[^>]*>/i);
      if (m) html = html.replace(m[0], m[0] + '\n  ' + BRIDGE_TAG + '\n  ' + INIT_TAG);
      else html = BRIDGE_TAG + '\n' + INIT_TAG + '\n' + html;
      changed = true;
    } else if (!html.includes('native-init.js')) {
      html = html.replace(BRIDGE_TAG, BRIDGE_TAG + '\n  ' + INIT_TAG);
      changed = true;
    }
    const withLocalSupabase = html.replace(SUPABASE_CDN_RE, SUPABASE_LOCAL);
    if (withLocalSupabase !== html) { html = withLocalSupabase; changed = true; rewired++; }
    if (changed) { await fs.writeFile(path.join(DEST, name), html); injected++; }
  }
  console.log(`[sync-web] supabase-js CDN -> ${SUPABASE_LOCAL} on ${rewired} pages`);

  // 4b. Mobile QA uses @ciaralink.example demo accounts (live Supabase). The web
  //     repo still lists .com.au in workflow1-auth-test — rewrite after copy.
  const wfTest = path.join(DEST, 'workflow1-auth-test.html');
  if (existsSync(wfTest)) {
    let wf = await fs.readFile(wfTest, 'utf8');
    const patched = wf.replace(/@ciaralink\.com\.au/g, '@ciaralink.example');
    if (patched !== wf) {
      await fs.writeFile(wfTest, patched);
      console.log('  patched workflow1-auth-test.html demo emails -> @ciaralink.example');
    }
  }

  // 5. Secret guard: env.local.js must be anon-only, and no service_role anywhere.
  const envPath = path.join(DEST, 'env.local.js');
  if (existsSync(envPath)) {
    const env = await fs.readFile(envPath, 'utf8');
    const m = env.match(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\./);
    let role = 'unknown';
    if (m) { try { role = JSON.parse(Buffer.from(m[1], 'base64').toString()).role; } catch {} }
    if (role !== 'anon') throw new Error('REFUSING: env.local.js JWT role is "' + role + '", expected "anon"');
    console.log('  env.local.js JWT role = ' + role + ' (safe)');
  }
  // Scan whole bundle for a service-role key.
  for (const name of await fs.readdir(DEST)) {
    const p = path.join(DEST, name);
    if (!(await fs.stat(p)).isFile()) continue;
    const body = await fs.readFile(p, 'utf8').catch(() => '');
    if (body.includes('service_role')) throw new Error('REFUSING: service_role string found in www/' + name);
  }

  const htmlCount = (await fs.readdir(DEST)).filter((f) => f.endsWith('.html')).length;
  console.log(`[sync-web] copied ${copied} root files + icons; ${htmlCount} html pages; bridge re-injected into ${injected}; no service_role found. Bundle is current.`);
}

run().catch((e) => { console.error('[sync-web] FAILED:', e.message); process.exit(1); });
