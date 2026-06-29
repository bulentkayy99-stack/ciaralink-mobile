# CiaraLink Mobile

Capacitor wrapper for the [CiaraLink](https://ciaralink.vercel.app) Care OS web app — ships to **iOS** and **Android** as `au.com.ciaralink.app`.

The web UI is **bundled** in `www/` (offline shell, store-safe). Live data comes from **Supabase** and Vercel `/api` functions at `https://ciaralink.vercel.app`.

## Quick start

**Prerequisites:** Node 18+, Xcode (iOS), Android Studio (Android).

```bash
git clone https://github.com/bulentkayy99-stack/ciaralink-mobile.git
cd ciaralink-mobile
npm run setup          # env.local.js + install + sync web + cap sync
npm run verify         # preflight checks
npm run open:ios       # or: npm run open:android
```

In Xcode: select your **Team** under Signing & Capabilities, pick a simulator or device, press **Run**.

## Day-to-day

| Command | What it does |
|---|---|
| `npm run setup` | First-time bootstrap (env, install, sync) |
| `npm run verify` | Preflight before a build or store upload |
| `npm run refresh` | Re-copy web app from `../ciaralink` + `cap sync` |
| `npm run sync:web` | Update `www/` only (no native sync) |
| `npm run icons` | Regenerate app icons + splash from `assets/icon.png` |
| `npm run open:ios` | Open Xcode |
| `npm run open:android` | Open Android Studio |

After editing the website in `../ciaralink`, run **`npm run refresh`** before archiving a new store build.

## Secrets

`www/env.local.js` holds the **public Supabase anon key** only (safe in a client app). It is **gitignored**. On a fresh clone:

- If `../ciaralink/env.local.js` exists, `npm run setup` copies it automatically.
- Otherwise copy it manually or create from `www/env.example.js`.

Never commit a `service_role` key.

## Store submission

Detailed copy-paste guides live in this repo:

- [`MOBILE_APP_GUIDE.md`](MOBILE_APP_GUIDE.md) — overview, costs, publishing steps
- [`TESTFLIGHT_STEPS.md`](TESTFLIGHT_STEPS.md) — iOS TestFlight walkthrough
- [`SUBMISSION_KIT.md`](SUBMISSION_KIT.md) — App Store Connect fields
- [`STORE_LISTING.md`](STORE_LISTING.md) — Play Store listing

**Before first submission:** create a demo login for reviewers, confirm `ciaralink.vercel.app` is healthy, and set up signing (Apple Team + Android upload keystore).

## Architecture notes

- **`www/capacitor-bridge.js`** — routes `/api/...` to Vercel; disables PWA service worker in the native shell.
- **`www/vendor/`** — React, Babel, and Supabase bundled for offline-first auth/UI (no CDN dependency at login).
- **`scripts/sync-web.mjs`** — copies web assets from `../ciaralink`, re-injects the bridge, vendors Supabase.

Push notifications plugin is installed but **not configured** (needs APNs key + Firebase `google-services.json`). Safe to omit from v1 submission.
