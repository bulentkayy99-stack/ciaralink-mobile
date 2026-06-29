# CiaraLink — Care OS: Mobile App Guide

Plain-language guide for getting the CiaraLink iOS and Android apps from this
folder into the Apple App Store and Google Play.

This project wraps the existing CiaraLink web app inside a native app shell using
**Capacitor**. One codebase, two stores. App name **CiaraLink**, app id
**`au.com.ciaralink.app`**.

> **IMPORTANT — the apps depend on the web app.** These apps load a *copy* of the
> CiaraLink website and call the live backend (Supabase + the `/api` functions on
> `https://ciaralink.vercel.app`). If the website is broken or down, the apps are
> broken too. Keep `ciaralink.vercel.app` healthy first.

---

## 1. What was built (already done for you)

- A Capacitor project in `/Users/billy/ciaralink-mobile`.
- The CiaraLink web pages copied into `www/` (all `.dc.html` pages, JS, icons,
  manifest). **No secrets bundled** — only the public Supabase anon key, which is
  safe in a client app. The service-role key is *not* present.
- A small bridge (`www/capacitor-bridge.js`) that:
  - sends `/api/...` calls to `https://ciaralink.vercel.app` (those functions are
    not bundled — they run on Vercel), and
  - turns off the website's service worker inside the app (prevents stale screens
    after an update).
- Native niceties: splash screen, status bar, app lifecycle, **camera**,
  **filesystem**, and **push notifications** plugins. Splash + status bar are
  themed to the brand (deep green `#14302b`, teal `#16b8a6`).
- App icons + splash screens generated for both platforms from the CiaraLink logo.
- iOS privacy text and Android permissions added for camera / photos / notifications.
- `npx cap sync` confirmed working for **both** iOS and Android.

You did **not** need to change anything in the website folder (`/Users/billy/ciaralink`).

---

## 2. Prerequisites & costs

| Thing | Why | Cost | Status on this Mac |
|---|---|---|---|
| **Apple Developer Program** | Required to publish to the App Store / TestFlight | **~$99 USD / year** | You must enrol |
| **Google Play Console** | Required to publish to Google Play | **$25 USD one-time** | You must enrol |
| **A Mac** | iOS apps can only be built on macOS | — | You have one |
| **Xcode** (from the Mac App Store) | Builds + uploads the iOS app | Free | **Not installed** (only Command Line Tools) |
| **CocoaPods** *(maybe)* | iOS dependency manager | Free | **Not installed** — Capacitor 8 uses Swift Package Manager, so you likely won't need it |
| **Android Studio** | Builds + signs the Android app | Free | **Not installed** |
| **Java JDK** (bundled with Android Studio) | Android builds | Free | **Not installed** |
| **Node.js + npm** | Project tooling | Free | Installed (Node 24, npm 11) |

### What's missing on this machine right now
- **Xcode** — install from the Mac App Store (large, ~7 GB+; allow time).
  After installing, run once: `sudo xcode-select -s /Applications/Xcode.app` and
  open Xcode to accept the license.
- **Android Studio** — download from <https://developer.android.com/studio>.
  On first launch it installs the Android SDK + JDK for you.
- (CocoaPods only if Xcode later asks for it: `sudo gem install cocoapods`.)

You can install these in any order. Android and iOS are independent — you can ship
one before the other.

---

## 3. Day-to-day commands (from `/Users/billy/ciaralink-mobile`)

```bash
npm run refresh        # re-copy web assets into both native apps (cap sync)
npm run open:ios       # open the iOS project in Xcode
npm run open:android   # open the Android project in Android Studio
npm run icons          # regenerate app icons + splash from assets/logo.png
```

---

## 4. Publishing to the **Apple App Store** (iOS)

1. **Enrol** in the Apple Developer Program (~$99/yr) at developer.apple.com.
2. Install **Xcode**, open it once, accept the license.
3. Open the project: `npm run open:ios` (or `npx cap open ios`).
4. In Xcode, select the **App** target → **Signing & Capabilities**:
   - Tick **Automatically manage signing**.
   - Choose your **Team** (your Apple Developer account).
   - Confirm **Bundle Identifier** is `au.com.ciaralink.app`.
   - If you want push notifications: click **+ Capability → Push Notifications**
     (this also needs an APNs key in App Store Connect — see section 7).
5. **Test it:** pick a simulator or a plugged-in iPhone and press **Run** (▶).
6. **Create the store listing:** at appstoreconnect.apple.com create a new app,
   pick the bundle id `au.com.ciaralink.app`, set name **CiaraLink**, category,
   privacy details, screenshots, and the **privacy policy URL**
   (`https://ciaralink.vercel.app/privacy.html`).
7. **Archive & upload:** in Xcode set the device target to **Any iOS Device**, then
   **Product → Archive**. When it finishes, **Distribute App → App Store Connect →
   Upload**.
8. **TestFlight:** the build appears in App Store Connect → TestFlight after
   processing. Invite yourself/testers and try it on a real device.
9. **Submit for review:** attach the build to your App Store listing and submit.
   Add **review notes** with a test login so Apple's reviewer can sign in
   (see section 7). Review usually takes 1–3 days.
10. **Release** once approved (manual or automatic).

---

## 5. Publishing to **Google Play** (Android)

1. **Register** a Google Play Console account ($25 one-time) at
   play.google.com/console.
2. Install **Android Studio** (installs the SDK + JDK on first run).
3. Open the project: `npm run open:android` (or `npx cap open android`). Let Gradle
   finish syncing.
4. **Create an upload key (one time)** — Android requires every release to be
   signed. In Android Studio: **Build → Generate Signed Bundle / APK → Android App
   Bundle → Create new…**. Save the keystore file somewhere safe and **back it up**
   — if you lose it you can't update the app. (Tip: enrol in **Play App Signing** so
   Google holds the final signing key; you keep the upload key.)
5. **Build the release bundle:** **Build → Generate Signed Bundle / APK → Android
   App Bundle (.aab) → release**. This produces an `.aab` file.
6. In **Play Console** create the app (name **CiaraLink**, default language,
   declarations), fill in the store listing, screenshots, content rating, **Data
   safety** form, and the **privacy policy URL**
   (`https://ciaralink.vercel.app/privacy.html`).
7. **Internal testing:** create an Internal testing release, upload the `.aab`, add
   yourself as a tester, install via the opt-in link, and verify.
8. **Production:** promote to Production and submit for review (often hours to a
   couple of days for new apps).

---

## 6. How updates work

There are two kinds of change:

- **Web/content change** (you edited the CiaraLink website): copy the latest
  website files into `www/`, then `npm run refresh`, then re-archive (iOS) /
  rebuild the `.aab` (Android) and upload a new build with a bumped version. The
  copy step is the same one used to build this project (copy the runtime web files
  from `/Users/billy/ciaralink` into `www/`, excluding `api/`, `audit/`, `docs/`,
  `screenshots/`, and any `.env`/secret files; then re-run the bridge-injection if
  you re-copy fresh HTML).
- **Native change** (new plugin, icon, permission): edit then `npm run refresh`,
  rebuild, upload.

**Bundled vs remote — why we bundled.** This project **bundles** the site inside the
app (rather than just pointing the app at the live URL). Bundling gives a real
native app: instant launch, native splash/icons, camera + file access, offline
shell, and a much lower chance of App Store rejection. The trade-off is that web
content updates require a new store build. Dynamic data still comes live from
Supabase and the Vercel `/api` functions, so most real changes (data, AI, billing)
appear instantly without a new build — only HTML/JS layout changes need a re-ship.

> A pure "load the website in a wrapper" app (`server.url`) would update instantly
> but Apple frequently **rejects** apps that are "just a website" (Guideline 4.2
> Minimum Functionality). That's why we bundle + add native features.

---

## 7. Required for approval — checklist

- **Privacy policy URL:** `https://ciaralink.vercel.app/privacy.html` (already exists).
- **A working test login:** reviewers must be able to sign in. Create a demo
  account and put the email + password in **App review notes** (iOS) and **App
  access** (Play Console). Without this, both stores reject sign-in apps.
- **Data handling disclosures:**
  - Apple **App Privacy** questionnaire and Google **Data safety** form must
    declare what you collect (account info, documents/photos uploaded, usage).
    CiaraLink handles care/health-adjacent data via Supabase — be accurate.
  - iOS camera/photo usage strings are already in `Info.plist`; Android
    permissions are in `AndroidManifest.xml`.
- **Push notifications (optional, later):** the plugin is installed but **not yet
  configured**. To actually send pushes you must set up:
  - **iOS:** an APNs Auth Key in App Store Connect + enable the Push Notifications
    capability in Xcode (adds the `aps-environment` entitlement, which needs your
    signing account).
  - **Android:** a **Firebase (FCM)** project; add the `google-services.json` file
    into `android/app/`. Until then, leave push out of the first submission to
    avoid extra review questions.
- **Health/medical positioning:** avoid implying clinical/diagnostic claims in the
  store listing unless you can back them; describe CiaraLink as care
  coordination / admin software.

---

## 8. Known follow-ups / notes

- **Email links (password reset, confirmation):** Supabase emails link to the
  website domain, not the app. They'll open in a browser. If you want them to open
  the app, set up **deep links / universal links** later (out of scope here).
- **Stripe checkout:** opens Stripe's hosted page in the in-app browser — works,
  but test the return-to-app flow during TestFlight/internal testing.
- **First build will be slow:** Xcode (Swift Package resolution) and Android Studio
  (Gradle) download dependencies on first open. This is normal.
- **Keep your Android keystore safe** — losing it means you can never update the
  Android app under the same listing.
