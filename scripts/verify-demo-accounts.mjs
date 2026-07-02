#!/usr/bin/env node
/* Verify live Supabase demo accounts used for App Review and QA. */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', 'www', 'env.local.js');

const ACCOUNTS = [
  'demo-provider-admin@ciaralink.example',
  'demo-provider-owner@ciaralink.example',
  'demo-worker@ciaralink.example',
  'demo-sc@ciaralink.example',
  'demo-allied@ciaralink.example',
  'demo-participant@ciaralink.example',
  'demo-guardian@ciaralink.example',
];
const PASSWORD = 'DemoPassword123!';

export async function verifyDemoAccounts() {
  if (!existsSync(ENV_PATH)) {
    return { ok: false, errors: ['www/env.local.js missing — run npm run setup'], passes: [] };
  }
  const ctx = { window: { ENV: {} } };
  vm.runInNewContext(await readFile(ENV_PATH, 'utf8'), ctx);
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: key } = ctx.window.ENV;
  if (!url || !key) {
    return { ok: false, errors: ['env.local.js missing SUPABASE_URL or SUPABASE_ANON_KEY'], passes: [] };
  }

  const errors = [];
  const passes = [];
  for (const email of ACCOUNTS) {
    try {
      const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: PASSWORD }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.access_token) passes.push(`demo login OK: ${email}`);
      else errors.push(`demo login FAIL: ${email} — ${body.error_description || body.msg || res.status}`);
    } catch (e) {
      errors.push(`demo login FAIL: ${email} — ${e.message}`);
    }
  }

  // .com.au must NOT be used for review
  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo-provider-admin@ciaralink.com.au', password: PASSWORD }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.access_token) {
      errors.push('demo-provider-admin@ciaralink.com.au unexpectedly works — docs may be wrong');
    } else {
      passes.push('.com.au demo correctly absent (use .example for review)');
    }
  } catch (e) {
    passes.push('.com.au demo check skipped (network)');
  }

  return { ok: errors.length === 0, errors, passes };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  verifyDemoAccounts().then(({ ok, errors, passes }) => {
    for (const p of passes) console.log('  ✓', p);
    for (const e of errors) console.error('  ✗', e);
    process.exit(ok ? 0 : 1);
  });
}
