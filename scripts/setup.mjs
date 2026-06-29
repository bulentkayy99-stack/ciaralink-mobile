#!/usr/bin/env node
/* First-time (or fresh-clone) bootstrap for ciaralink-mobile.
 *
 * 1. Ensures www/env.local.js exists (copied from ../ciaralink if present)
 * 2. npm install when node_modules is missing
 * 3. npm run refresh (sync web bundle + cap sync)
 */
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, '..');
const WEB_SRC = path.resolve(PROJECT, '..', 'ciaralink');
const ENV_DEST = path.join(PROJECT, 'www', 'env.local.js');
const ENV_SOURCES = [
  path.join(WEB_SRC, 'env.local.js'),
  path.join(PROJECT, 'env.local.js'),
];

function run(cmd, args, label) {
  console.log(`[setup] ${label}…`);
  const r = spawnSync(cmd, args, { cwd: PROJECT, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`[setup] FAILED: ${label}`);
    process.exit(r.status ?? 1);
  }
}

async function ensureEnv() {
  if (existsSync(ENV_DEST)) {
    console.log('[setup] www/env.local.js already present');
    return;
  }
  for (const src of ENV_SOURCES) {
    if (!existsSync(src)) continue;
    await fs.mkdir(path.dirname(ENV_DEST), { recursive: true });
    await fs.copyFile(src, ENV_DEST);
    console.log('[setup] copied env.local.js from', src);
    return;
  }
  console.error(
    '[setup] www/env.local.js is missing.\n' +
    '  Copy ../ciaralink/env.local.js into www/env.local.js, or\n' +
    '  create it from www/env.example.js with your Supabase URL + anon key.'
  );
  process.exit(1);
}

async function main() {
  console.log('[setup] CiaraLink mobile bootstrap');
  await ensureEnv();

  if (!existsSync(path.join(PROJECT, 'node_modules'))) {
    run('npm', ['install'], 'npm install');
  } else {
    console.log('[setup] node_modules present — skipping npm install');
  }

  run('node', ['scripts/sync-web.mjs'], 'sync web bundle');
  run('npx', ['cap', 'sync'], 'cap sync');

  console.log('[setup] Ready. Open a native IDE:');
  console.log('  npm run open:ios      → Xcode');
  console.log('  npm run open:android  → Android Studio');
  console.log('  npm run verify        → preflight checks');
}

main().catch((e) => {
  console.error('[setup] FAILED:', e.message);
  process.exit(1);
});
