import fs from 'fs';
import vm from 'vm';
import { execSync } from 'child_process';

const UDID = '16BC82F9-739F-4A71-A153-5E9289B5C541';
const DEVELOPER_DIR = '/Applications/Xcode-26.5.app/Contents/Developer';
const OUT_DIR = '/Users/billy/ciaralink-mobile/store-assets/ios/ipad-13';
const env = { ...process.env, DEVELOPER_DIR };

const ctx = { window: { ENV: {} } };
vm.runInNewContext(fs.readFileSync('www/env.local.js', 'utf8'), ctx);
const { SUPABASE_URL: url, SUPABASE_ANON_KEY: key } = ctx.window.ENV;
if (!url || !key) {
  console.error('Missing Supabase ENV in www/env.local.js');
  process.exit(1);
}
const ref = new URL(url).hostname.split('.')[0];
const storageKey = `sb-${ref}-auth-token`;

const email = 'demo-provider-admin@ciaralink.example';
const password = 'DemoPassword123!';

function sh(cmd) {
  return execSync(cmd, { env, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

function findDb() {
  const data = sh(`xcrun simctl get_app_container ${UDID} au.com.ciaralink.app data`).trim();
  return sh(`find "${data}/Library/WebKit" -name localstorage.sqlite3 | head -1`).trim();
}

function esc(s) {
  return s.replace(/'/g, "''");
}

async function authSession() {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('Auth failed: ' + (j.error_description || j.msg || j.error || JSON.stringify(j)));
  return JSON.stringify({
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_in: j.expires_in,
    expires_at: Math.floor(Date.now() / 1000) + j.expires_in,
    token_type: 'bearer',
    user: j.user,
  });
}

function inject(sessionJson, dest) {
  const db = findDb();
  if (!db) throw new Error('localstorage.sqlite3 not found');
  try { sh(`xcrun simctl terminate ${UDID} au.com.ciaralink.app`).trim(); } catch (_) {}
  sh(`sqlite3 '${db}' "DELETE FROM ItemTable;"`);
  if (sessionJson) {
    sh(`sqlite3 '${db}' "INSERT OR REPLACE INTO ItemTable (key,value) VALUES ('${esc(storageKey)}','${esc(sessionJson)}');"`);
  }
  if (dest) {
    sh(`sqlite3 '${db}' "INSERT OR REPLACE INTO ItemTable (key,value) VALUES ('__capture_dest','${esc(dest)}');"`);
  }
}

function patchIndex() {
  const indexPath = 'www/index.html';
  const bak = 'www/index.html.store-capture-bak';
  if (!fs.existsSync(bak)) fs.copyFileSync(indexPath, bak);
  let html = fs.readFileSync(bak, 'utf8');
  const needle = "window.location.replace('Login.dc.html?source=app');";
  const replacement = `(function(){try{var d=localStorage.getItem('__capture_dest');if(d){localStorage.removeItem('__capture_dest');window.location.replace(d);return;}}catch(e){}window.location.replace('Login.dc.html?source=app');})();`;
  if (!html.includes('__capture_dest')) {
    html = html.replace(needle, replacement);
    fs.writeFileSync(indexPath, html);
  }
  execSync('npx cap copy ios', { stdio: 'inherit', cwd: '/Users/billy/ciaralink-mobile' });
}

function screenshot(outFile) {
  sh(`xcrun simctl io ${UDID} screenshot "${outFile}"`);
}

function verify(path) {
  const out = sh(`sips -g pixelWidth -g pixelHeight "${path}"`);
  const w = /pixelWidth: (\d+)/.exec(out)?.[1];
  const h = /pixelHeight: (\d+)/.exec(out)?.[1];
  return { w: Number(w), h: Number(h) };
}

const shots = [
  { file: '01-sign-in.png', dest: 'Login.dc.html?source=app', auth: false },
  { file: '02-provider-dashboard.png', dest: 'CiaraLink Provider Dashboard.dc.html', auth: true },
  { file: '03-support-worker.png', dest: 'Support Worker.dc.html', auth: true },
];

patchIndex();
execSync(
  `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'platform=iOS Simulator,id=${UDID}' -derivedDataPath ios/build build`,
  { stdio: 'inherit', cwd: '/Users/billy/ciaralink-mobile', env: { ...process.env, DEVELOPER_DIR } }
);
const builtApp = '/Users/billy/ciaralink-mobile/ios/build/Build/Products/Debug-iphonesimulator/App.app';
sh(`xcrun simctl install ${UDID} "${builtApp}"`);

fs.mkdirSync(OUT_DIR, { recursive: true });

const sessionJson = await authSession();
console.log('Authenticated as', email);

for (const shot of shots) {
  inject(shot.auth ? sessionJson : '', shot.dest);
  sh(`xcrun simctl launch ${UDID} au.com.ciaralink.app`);
  await new Promise((r) => setTimeout(r, shot.auth ? 12_000 : 7_000));
  const out = `${OUT_DIR}/${shot.file}`;
  screenshot(out);
  const dim = verify(out);
  console.log(`${shot.file}\t${dim.w}x${dim.h}\t${shot.dest}`);
}

const bak = 'www/index.html.store-capture-bak';
if (fs.existsSync(bak)) {
  fs.copyFileSync(bak, 'www/index.html');
  fs.unlinkSync(bak);
  execSync('npx cap copy ios', { stdio: 'inherit', cwd: '/Users/billy/ciaralink-mobile' });
}
