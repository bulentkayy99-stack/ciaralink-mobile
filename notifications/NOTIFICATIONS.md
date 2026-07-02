# CiaraLink — Push Notifications

The app side is **done and shipped in the bundle**. This folder is the
plug-and-play kit for the parts that need platform credentials + a backend
(Bulent's wall). Nothing here touches the live system until you deploy it.

## What already works (in the app, no action needed)

`www/native-init.js` (generated from `scripts/sync-web.mjs`) now:

- Requests notification permission on first launch, then registers with
  APNs (iOS) / FCM (Android).
- Captures the device token, stores it locally (`ciaralink_push_token`), and
  best-effort POSTs it (with the Supabase Bearer token) to
  `/api/register-push-token`. A 404 is swallowed — nothing breaks before the
  endpoint exists.
- Routes a **tapped** notification to its target page (`data.url` / `data.page`,
  validated to in-bundle pages only) or the in-app **Notification Centre**.
- Android `POST_NOTIFICATIONS` permission is already in the manifest; iOS
  presentation options are in `capacitor.config.json`.

## The 3 walls (need you)

### 1. iOS — APNs (Apple Push Notification service)
- Apple Developer account → **Keys** → create an **APNs Auth Key** (`.p8`).
- In Xcode → App target → **Signing & Capabilities → + Capability → Push
  Notifications** (adds the `aps-environment` entitlement; needs your signing
  team).
- Upload the APNs key in App Store Connect (or to your push provider/Firebase).

### 2. Android — Firebase Cloud Messaging
- Create a Firebase project, add an Android app with id `au.com.ciaralink.app`.
- Download `google-services.json` into `android/app/`.
- (Capacitor's FCM wiring is already pulled in by the push plugin.)

### 3. Backend — token store + sender (this folder)
1. **Table:** run `device-tokens.sql` in Supabase (project `txcndwunbwuexasqtrow`).
2. **Endpoint:** copy `_register-push-token.js` into the website repo at
   `api/_register-push-token.js`, then:
   - add to `api/compliance.js` `ROUTES`:
     ```js
     "register-push-token": () => import("./_register-push-token.js"),
     ```
   - add to `vercel.json` `rewrites`:
     ```json
     { "source": "/api/register-push-token", "destination": "/api/compliance?route=register-push-token" }
     ```
   - This rides the existing single router function — it does **not** use a new
     Vercel Hobby function slot (still ≤ 12).
   - Ensure `CIARALINK_SUPABASE_SERVICE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) and
     `SUPABASE_ANON_KEY` are set in the Vercel project env.
   - Deploy: `vercel deploy --prod --yes`.
3. **Sender:** to actually send a push, add a small job that reads
   `device_tokens` for the target users and calls APNs/FCM (or Firebase Admin).
   That's the only remaining piece; the tokens will be waiting in the table.

## Test path
1. Build to a **real device** (push doesn't work in the iOS Simulator).
2. Sign in → accept the permission prompt.
3. Confirm a row lands in `device_tokens` (proves token + endpoint + table).
4. Send a test push with `data: { "url": "Notification%20Centre.dc.html" }` and
   confirm the tap opens the Notification Centre.

Until the walls are crossed, the **in-app Notification Centre** (live from
Supabase) is the working notification surface; remote push is additive.
