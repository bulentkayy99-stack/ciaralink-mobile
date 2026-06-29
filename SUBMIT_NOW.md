# CiaraLink — App Store Connect submit (build 4 / 1.0.0)

Technical prep done on this machine:

- **Build uploaded:** `1.0.0 (4)` via Xcode **26.5 GM** (`DEVELOPER_DIR=/Applications/Xcode-26.5.app/Contents/Developer`)
- **Upload:** `xcodebuild -exportArchive` with `ExportOptions.plist` (`app-store-connect`, `upload`) — **Upload succeeded** 2026-06-29
- **Device family:** iPhone only (`UIDeviceFamily` = `1`)
- **Archive:** `ios/App/build/App-build4.xcarchive`
- **Screenshots:** `store-assets/ios/iphone-6.9/01-sign-in.png`, `02-provider-dashboard.png`, `03-support-worker.png` (1320×2868)

Wait until App Store Connect shows build **4** as **Ready to Submit** (Processing usually 5–30 minutes).

### Fixes in build 4 (Invalid Binary mitigation)

- Removed **`UIBackgroundModes` → `remote-notification`** (no Push Notifications capability / `aps-environment` for v1)
- **`UIRequiredDeviceCapabilities`:** `armv7` → **`arm64`**
- Added app **`PrivacyInfo.xcprivacy`** (bundled in target)
- **`ONLY_ACTIVE_ARCH = NO`** on Release (device archive)
- **`CURRENT_PROJECT_VERSION` = 4**

---

## 1. Pricing (required — “choose price tier”)

1. Open [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **CiaraLink**.
2. **Monetization** → **Pricing and Availability** (or **App Store** → **Pricing and Availability**).
3. Set **Free** (Price Tier **0**) → **Save**.

---

## 2. Attach build 4 to version 1.0

1. **Distribution** → version **1.0** (Prepare for Submission).
2. **Build** → **+** → select **`1.0.0 (4)`** (not build 3 or older).
3. Save the version page.

---

## 3. iPhone 6.9" screenshots

1. **App Previews and Screenshots** → **iPhone** → **6.9" Display**.
2. Upload at least 3 from `store-assets/ios/iphone-6.9/` (see paths above).
3. **Save**.

---

## 4. TestFlight — internal testing (optional before review)

1. **TestFlight** tab → wait until build **4** finishes processing.
2. **Internal Testing** → create or open a group → **+** → add build **`1.0.0 (4)`**.
3. Add internal testers (App Store Connect users on your team). They install via **TestFlight** app.
4. Smoke-test sign-in and core flows before **Submit to App Review**.

---

## 5. Export compliance & submit

1. On version **1.0**, if **App Encryption** is asked: standard encryption only — **`ITSAppUsesNonExemptEncryption` = No** (already in Info.plist).
2. Complete remaining metadata (Privacy, Age Rating, etc.).
3. **Add for Review** → **Submit to App Review**.

---

## Demo account (App Review notes)

- Email: `demo-provider-admin@ciaralink.com.au`
- Password: `DemoPassword123!`

---

## Re-upload reference (build 4 — already uploaded)

```bash
cd /Users/billy/ciaralink-mobile
npm run verify && npm run refresh

cd ios/App
DEVELOPER_DIR=/Applications/Xcode-26.5.app/Contents/Developer \
  xcodebuild -project App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/App-build4.xcarchive \
  -allowProvisioningUpdates DEVELOPMENT_TEAM=38GH68YP88 archive

DEVELOPER_DIR=/Applications/Xcode-26.5.app/Contents/Developer \
  xcodebuild -exportArchive \
  -archivePath build/App-build4.xcarchive \
  -exportPath build/export-build4 \
  -exportOptionsPlist ExportOptions.plist \
  -allowProvisioningUpdates
```

Validate archive before export:

```bash
ARCH=build/App-build4.xcarchive/Products/Applications/App.app
plutil -lint "$ARCH/Info.plist"
plutil -p "$ARCH/Info.plist" | grep -E 'CFBundleVersion|UIDeviceFamily|UIBackground'
codesign -dv "$ARCH"
test -f "$ARCH/PrivacyInfo.xcprivacy" && echo OK privacy manifest
```
