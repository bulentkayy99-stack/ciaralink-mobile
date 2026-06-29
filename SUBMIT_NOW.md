# CiaraLink — App Store Connect submit (build 3 / 1.0.0)

Technical prep done on this machine:

- **Build uploaded:** `1.0.0 (3)` via Xcode **26.5 GM** (`DEVELOPER_DIR=/Applications/Xcode-26.5.app/Contents/Developer`)
- **Device family:** iPhone only (`UIDeviceFamily` = `1`) — iPad 13" screenshots should **not** be required once this build is selected
- **Export:** `ios/App/build/export-build3/App.ipa` (upload succeeded 2026-06-29)
- **Screenshots:** `store-assets/ios/iphone-6.9/01-sign-in.png`, `02-provider-dashboard.png`, `03-support-worker.png` (1320×2868)

Wait until App Store Connect shows build **3** as **Ready to Submit** (Processing can take 5–30 minutes).

---

## 1. Pricing (required — “choose price tier”)

1. Open [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **CiaraLink**.
2. In the left sidebar, open **Monetization** → **Pricing and Availability**  
   *(older UI: **App Store** tab → **Pricing and Availability**)*.
3. Under **Price**, click **Edit** (or **Add Pricing**).
4. Select **Free** (Price Tier **0**).
5. Click **Save** / **Done**.

---

## 2. Attach build 3 to version 1.0

1. Left sidebar: **Distribution** (or **App Store** → **iOS App**).
2. Open version **1.0** (Prepare for Submission).
3. Scroll to **Build**.
4. Click **+** or **Select a build before you submit your app**.
5. Choose **1.0.0 (3)** — the build uploaded today with Xcode 26.5 GM.
6. If build **3** is missing, refresh after processing completes; do **not** re-select older beta-Xcode builds.

---

## 3. iPhone 6.9" screenshots

1. On the same **1.0** page, scroll to **App Previews and Screenshots**.
2. Select **iPhone** → **6.9" Display** (or the slot labeled for iPhone 17 Pro Max / 6.9").
3. Drag in (minimum 3):

   ```
   store-assets/ios/iphone-6.9/01-sign-in.png
   store-assets/ios/iphone-6.9/02-provider-dashboard.png
   store-assets/ios/iphone-6.9/03-support-worker.png
   ```

4. Click **Save** on the version page.

---

## 4. iPad 13" tab (only if still shown)

If **iPad Pro (13-inch)** still appears as required **after** build **3** is selected:

- Confirm the selected build is **(3)**, not an older build.
- If the iPad section remains, capture one simulator shot:

  ```bash
  export DEVELOPER_DIR=/Applications/Xcode-26.5.app/Contents/Developer
  xcrun simctl boot "iPad Pro 13-inch (M4)" 2>/dev/null || true
  # Install/run app on that sim, then:
  xcrun simctl io booted screenshot store-assets/ios/ipad-13/01-dashboard.png
  ```

  Upload to the **iPad Pro 13-inch** slot.

If build **3** is iPhone-only, the iPad section should disappear — no iPad art needed.

---

## 5. Export compliance & submit

1. On version **1.0**, answer **App Encryption** if prompted: uses standard encryption only / **ITSAppUsesNonExemptEncryption** is **No** (already in Info.plist).
2. Complete any remaining metadata (Privacy, Age Rating, etc.).
3. Click **Add for Review** → **Submit to App Review**.

---

## Demo account (for App Review notes)

- Email: `demo-provider-admin@ciaralink.com.au`
- Password: `DemoPassword123!`

(If login fails in review, confirm the demo user exists in production Supabase; capture script uses `demo-provider-admin@ciaralink.example` when `.com.au` is not provisioned.)

---

## Re-upload reference (already done)

```bash
cd ios/App
DEVELOPER_DIR=/Applications/Xcode-26.5.app/Contents/Developer \
  xcodebuild -exportArchive \
  -archivePath build/App-build3.xcarchive \
  -exportPath build/export-build3 \
  -exportOptionsPlist ExportOptions.plist \
  -allowProvisioningUpdates
```
