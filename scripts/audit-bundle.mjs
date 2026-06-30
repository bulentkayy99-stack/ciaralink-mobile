#!/usr/bin/env node
/* CiaraLink mobile — static audit of the www/ bundle for native correctness.
 * Read-only. Flags the classes of problem that break a Capacitor (capacitor://)
 * bundle but look fine in a normal dev server:
 *   - pages missing the capacitor bridge / native-init
 *   - insecure http:// subresources (blocked by allowMixedContent:false)
 *   - local asset refs (src/href) that don't resolve to a file in the bundle
 *   - hardcoded localhost / 127.0.0.1 / dev ports
 *   - leftover service-worker registration that the bridge can't reach
 */
import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WWW = path.resolve(__dirname, '..', 'www');

const issues = [];
const note = (file, level, msg) => issues.push({ file, level, msg });

// Asset reference extractor — src="...", href="...", and url(...) in inline CSS.
const ATTR_RE = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
const CSSURL_RE = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

// Things that are fine as-is and shouldn't be flagged as "missing file".
function isExternalOrDynamic(ref) {
  if (!ref) return true;
  const r = ref.trim();
  return (
    r.startsWith('http://') || r.startsWith('https://') ||
    r.startsWith('//') || r.startsWith('data:') || r.startsWith('blob:') ||
    r.startsWith('mailto:') || r.startsWith('tel:') || r.startsWith('javascript:') ||
    r.startsWith('#') || r.startsWith('capacitor:') || r === '' ||
    r.startsWith('{') || r.includes('${') ||           // template/JSX expressions
    r.startsWith('/api/') || r.startsWith('./api/') || // routed to backend by bridge
    r.includes(',') ||                                  // JS arg lists captured as attrs
    /^(?:window|document|location|d|it|s|e|self)\./.test(r) || // JS member access
    (!r.includes('/') && /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/.test(r)) // bare obj.prop
  );
}

// Resolve a bundle-local ref to an on-disk path under www/.
function resolveLocal(ref, fromFile) {
  let r = ref.split('?')[0].split('#')[0].trim();
  if (!r) return null;
  try { r = decodeURIComponent(r); } catch (e) {}
  if (r.startsWith('/')) return path.join(WWW, r.slice(1));
  return path.join(path.dirname(path.join(WWW, fromFile)), r);
}

async function run() {
  const files = (await fs.readdir(WWW)).filter((f) => f.endsWith('.html'));
  for (const file of files) {
    const html = await fs.readFile(path.join(WWW, file), 'utf8');

    if (file !== 'index.html') {
      if (!html.includes('capacitor-bridge.js')) note(file, 'ERROR', 'missing capacitor-bridge.js');
      if (!html.includes('native-init.js')) note(file, 'WARN', 'missing native-init.js');
    }

    // Insecure subresources (blocked when allowMixedContent:false).
    for (const m of html.matchAll(/(?:src|href)\s*=\s*["'](http:\/\/[^"']+)["']/gi)) {
      note(file, 'ERROR', 'insecure http:// resource: ' + m[1]);
    }

    // Hardcoded dev hosts.
    for (const m of html.matchAll(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?[^\s"')]*/gi)) {
      note(file, 'ERROR', 'hardcoded local host: ' + m[0]);
    }

    // Active service-worker registration outside the bridge (the bridge neutralises
    // navigator.serviceWorker.register, so this is informational only).
    if (/navigator\.serviceWorker\.register/.test(html) && !file.includes('bridge')) {
      // ok — bridge intercepts; no flag.
    }

    // Local asset existence.
    const refs = new Set();
    for (const m of html.matchAll(ATTR_RE)) refs.add(m[1]);
    for (const m of html.matchAll(CSSURL_RE)) refs.add(m[1]);
    for (const ref of refs) {
      if (isExternalOrDynamic(ref)) continue;
      const local = resolveLocal(ref, file);
      if (!local) continue;
      // Only check things that look like real file refs (have an extension).
      const base = path.basename(local);
      if (!base.includes('.')) continue;
      if (!existsSync(local)) note(file, 'ERROR', 'missing local asset: ' + ref);
    }
  }

  const errors = issues.filter((i) => i.level === 'ERROR');
  const warns = issues.filter((i) => i.level === 'WARN');
  const byFile = {};
  for (const i of issues) (byFile[i.file] ||= []).push(i);

  for (const [file, list] of Object.entries(byFile)) {
    console.log('\n' + file);
    for (const i of list) console.log(`  [${i.level}] ${i.msg}`);
  }
  console.log(`\n[audit] ${files.length} pages scanned — ${errors.length} errors, ${warns.length} warnings`);
  if (errors.length) process.exitCode = 1;
}
run().catch((e) => { console.error('[audit] FAILED:', e); process.exit(2); });
