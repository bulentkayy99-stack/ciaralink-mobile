#!/usr/bin/env node
/* Preflight checks before opening Xcode / Android Studio or submitting a build. */
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyDemoAccounts } from './verify-demo-accounts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, '..');
const WWW = path.join(PROJECT, 'www');
const APP_ID = 'au.com.ciaralink.app';

const errors = [];
const ok = [];

function fail(msg) { errors.push(msg); }
function pass(msg) { ok.push(msg); }

async function jwtRole(filePath) {
  const env = await fs.readFile(filePath, 'utf8');
  const m = env.match(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\./);
  if (!m) return 'missing';
  try { return JSON.parse(Buffer.from(m[1], 'base64').toString()).role; }
  catch { return 'unparseable'; }
}

async function main() {
  // env.local.js
  const envPath = path.join(WWW, 'env.local.js');
  if (!existsSync(envPath)) fail('www/env.local.js missing — run npm run setup');
  else {
    const role = await jwtRole(envPath);
    if (role !== 'anon') fail(`www/env.local.js JWT role is "${role}", expected "anon"`);
    else pass('env.local.js present (anon key)');
  }

  // vendored runtime
  const supa = path.join(WWW, 'vendor', 'supabase.js');
  if (!existsSync(supa)) fail('www/vendor/supabase.js missing — run npm run refresh');
  else {
    const st = await fs.stat(supa);
    if (st.size < 50_000) fail('www/vendor/supabase.js looks truncated');
    else pass('vendor/supabase.js bundled');
  }
  for (const lib of ['react.production.min.js', 'react-dom.production.min.js', 'babel.min.js']) {
    if (!existsSync(path.join(WWW, 'vendor', lib))) fail(`www/vendor/${lib} missing`);
  }
  if (existsSync(path.join(WWW, 'vendor', 'babel.min.js'))) pass('vendor React/Babel bundled');

  // no CDN supabase in html
  const cdnRe = /cdn\.jsdelivr\.net\/npm\/@supabase|unpkg\.com\/@supabase/;
  for (const name of await fs.readdir(WWW)) {
    if (!name.endsWith('.html')) continue;
    const body = await fs.readFile(path.join(WWW, name), 'utf8');
    if (cdnRe.test(body)) fail(`${name} still loads supabase-js from a CDN`);
  }
  if (!errors.some((e) => e.includes('CDN'))) pass('no CDN supabase-js in HTML pages');

  // native mobile layout bundle
  const mobileCss = path.join(WWW, 'mobile-native.css');
  if (!existsSync(mobileCss)) fail('www/mobile-native.css missing — native dashboard layout will break');
  else {
    const css = await fs.readFile(mobileCss, 'utf8');
    if (!css.includes('html.cl-native')) fail('mobile-native.css looks invalid');
    else pass('mobile-native.css present (all-platform dashboard layout)');
  }
  const bridge = path.join(WWW, 'capacitor-bridge.js');
  if (existsSync(bridge)) {
    const js = await fs.readFile(bridge, 'utf8');
    if (!js.includes('mobile-native.css')) fail('capacitor-bridge.js does not load mobile-native.css');
    else if (!js.includes('cl-native')) fail('capacitor-bridge.js does not set cl-native class');
    else pass('capacitor-bridge injects mobile layout on iOS + Android');
  }

  // bridge on every dashboard page
  const dcPages = (await fs.readdir(WWW)).filter((f) => f.endsWith('.dc.html'));
  const missingBridge = [];
  for (const name of dcPages) {
    const html = await fs.readFile(path.join(WWW, name), 'utf8');
    if (!html.includes('capacitor-bridge.js')) missingBridge.push(name);
  }
  if (missingBridge.length) fail(`dashboard pages missing bridge: ${missingBridge.join(', ')}`);
  else pass(`capacitor-bridge on all ${dcPages.length} dashboard pages`);

  // bridge injected on login
  const login = path.join(WWW, 'Login.dc.html');
  if (existsSync(login)) {
    const html = await fs.readFile(login, 'utf8');
    if (!html.includes('capacitor-bridge.js')) fail('Login.dc.html missing capacitor-bridge.js');
    else if (!html.includes('/vendor/supabase.js')) fail('Login.dc.html missing local supabase.js');
    else pass('Login.dc.html has bridge + local supabase');
  }

  // capacitor config
  const cap = JSON.parse(await fs.readFile(path.join(PROJECT, 'capacitor.config.json'), 'utf8'));
  if (cap.appId !== APP_ID) fail(`capacitor.config.json appId is ${cap.appId}`);
  else if (cap.webDir !== 'www') fail(`capacitor.config.json webDir is ${cap.webDir}`);
  else if (cap.server?.url) fail('capacitor.config.json has server.url — should bundle www/ for store');
  else pass('capacitor.config.json OK (bundled www/, no server.url)');

  // native bundle IDs
  const pbx = await fs.readFile(path.join(PROJECT, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
  if (!pbx.includes(`PRODUCT_BUNDLE_IDENTIFIER = ${APP_ID}`)) fail('iOS bundle ID mismatch');
  else pass('iOS bundle ID matches');

  const gradle = await fs.readFile(path.join(PROJECT, 'android/app/build.gradle'), 'utf8');
  if (!gradle.includes(`applicationId "${APP_ID}"`)) fail('Android applicationId mismatch');
  else pass('Android applicationId matches');

  // icons
  if (!existsSync(path.join(PROJECT, 'assets/icon.png'))) fail('assets/icon.png missing');
  else pass('app icon source present');

  // node_modules
  if (!existsSync(path.join(PROJECT, 'node_modules'))) fail('node_modules missing — run npm install');
  else pass('node_modules installed');

  const demo = await verifyDemoAccounts();
  for (const m of demo.passes) pass(m);
  for (const m of demo.errors) fail(m);

  console.log('');
  for (const m of ok) console.log('  ✓', m);
  if (errors.length) {
    console.log('');
    for (const m of errors) console.error('  ✗', m);
    console.error(`\n[verify] ${errors.length} issue(s) — fix before building.\n`);
    process.exit(1);
  }
  console.log('\n[verify] All checks passed — ready to open Xcode / Android Studio.\n');
}

main().catch((e) => {
  console.error('[verify] FAILED:', e.message);
  process.exit(1);
});
