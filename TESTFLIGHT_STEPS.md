# CiaraLink iOS → TestFlight: Step-by-Step

A complete, beginner-friendly walkthrough for getting the **CiaraLink** iOS app
from this Xcode project onto **TestFlight** (Apple's app for testing builds on a
real iPhone before going live).

You do **not** need to know how to code to follow this. Just do each step in order.

**What you already have (no action needed):**
- Xcode is installed, and you've accepted its license.
- You're enrolled in the Apple Developer Program.
- The web app this wraps is live at `https://ciaralink.vercel.app`.

**Key facts about this app:**
- App name: **CiaraLink**
- Bundle Identifier (the app's unique ID): **`au.com.ciaralink.app`**
- Project folder: `/Users/billy/ciaralink-mobile`

> **Quick mental model:** You build the app in **Xcode** (on your Mac), upload it
> to **App Store Connect** (Apple's website), then invite yourself to test it via
> **TestFlight** (the app on your iPhone). Three tools, in that order.

> **Heads-up — the app needs the website.** This app loads a bundled copy of the
> CiaraLink website and calls the live backend at `https://ciaralink.vercel.app`.
> If the website is down, the app is broken too. Make sure the site is healthy
> first.

---

## Step 1 — Refresh the project and open it in Xcode

1. Open the **Terminal** app on your Mac (press `Cmd + Space`, type `Terminal`,
   hit Enter).
2. Copy and paste this single line, then press Enter:

   ```bash
   cd /Users/billy/ciaralink-mobile && npm run refresh && npm run open:ios
   ```

   - `cd ...` moves into the project folder.
   - `npm run refresh` re-copies the latest website files into the app and syncs
     them (this runs `sync-web` + `cap sync` for you).
   - `npm run open:ios` opens the iOS project in **Xcode**.

3. Wait. The first time, Xcode may spend a few minutes at the top saying things
   like **"Resolving Package Graph"** or **"Indexing"**. This is normal — let it
   finish before clicking around.

> If Terminal says `command not found: npm`, Node isn't on your path in this
> window. Close Terminal, reopen it, and try the command again.

---

## Step 2 — Set up signing (so Apple trusts your app)

"Signing" is how Apple confirms the app really comes from your developer account.
Xcode can handle it automatically.

1. In Xcode, look at the **left sidebar** (the column of files). At the very top is
   a blue icon named **App** (or **CiaraLink**). Click it once.
2. The main area now shows project settings. Near the top of that area, find the
   **TARGETS** list and click **App** (the target, not the project above it).
3. Along the top of the settings area, click the tab named
   **Signing & Capabilities**.
4. Tick the checkbox **Automatically manage signing**.
5. Click the **Team** dropdown and choose your Apple Developer account (it usually
   shows your name or company, sometimes followed by "(Personal Team)" — pick the
   **paid** Developer Program team, not a personal team, if both appear).
6. Confirm the **Bundle Identifier** field reads exactly:

   ```
   au.com.ciaralink.app
   ```

   Don't change it. This must match everywhere.

7. Xcode will now try to create a signing certificate and "provisioning profile"
   automatically. After a few seconds you should see a small grey line like
   **"Provisioning Profile: Xcode Managed Profile"** with no red errors. That means
   signing is working.

### If you see "Failed to register bundle identifier"

This means the ID `au.com.ciaralink.app` either isn't registered to your account
yet, or someone already claimed it. Try these in order:

1. **Let Xcode register it (easiest).** This error often appears the very first
   time. Click the **Try Again** button if Xcode shows one, or untick and re-tick
   **Automatically manage signing**. Xcode usually registers the ID for you on the
   second attempt.
2. **Register it by hand** if Xcode still fails:
   - Go to <https://developer.apple.com/account/resources/identifiers/list> and
     sign in.
   - Click the **+** (top left, next to "Identifiers").
   - Choose **App IDs → App**, click **Continue**.
   - Set **Description** to `CiaraLink`, **Bundle ID** to **Explicit**, and type
     `au.com.ciaralink.app`.
   - Click **Continue → Register**.
   - Go back to Xcode and click **Try Again** under Signing — it should now succeed.
3. **If it says the ID is already taken** and it's not yours, you'd need to choose a
   different Bundle Identifier (e.g. `au.com.ciaralink.careapp`). This is rare for
   a reverse-domain ID like yours — only do this as a last resort, and tell whoever
   set up the project, because it must be changed in the project config too.

---

## Step 3 — Choose what to build for ("Any iOS Device")

At the **top middle** of the Xcode window there's a bar showing the app name and a
device name (e.g. "iPhone 15 Simulator").

1. Click the **device name** part of that bar (to the right of the app name).
2. In the dropdown, under the **"Build"** section near the top, choose
   **Any iOS Device (arm64)**.

This tells Xcode to build a real, uploadable app rather than a simulator-only
version. (If "Any iOS Device" is greyed out, redo Step 2 — signing must be set
first.)

---

## Step 4 — Archive (package the app for upload)

1. In the top menu bar, click **Product → Archive**.

   - If **Archive** is greyed out, you didn't select "Any iOS Device" in Step 3.
     Go back and fix that.

2. Xcode now builds and packages the app. **This can take 5–15 minutes** the first
   time (it downloads dependencies and compiles everything). You'll see a progress
   bar at the top. Don't close Xcode.
3. When it finishes, the **Organizer** window opens automatically, showing your new
   archive with today's date. If it doesn't pop up, open it with
   **Window → Organizer**.

---

## Step 5 — Upload to App Store Connect

1. In the **Organizer** window, make sure your newest archive is selected on the
   left, then click the blue **Distribute App** button on the right.
2. Choose **App Store Connect**, then click **Next**.
3. Choose **Upload**, then click **Next**.
4. You'll see a few checkbox options — leave the defaults ticked:
   - **Upload your app's symbols** (helps Apple show you crash reports) — keep ON.
   - **Manage Version and Build Number** automatically, if offered — fine to keep.
   Click **Next**.
5. For signing, choose **Automatically manage signing**, then **Next**.
6. Xcode shows a summary. Click **Upload**.
7. Wait for the upload to finish, then you'll see **"Upload Successful"**. Click
   **Done**.

> **What "processing" means next:** After upload, Apple spends **5 minutes to ~1
> hour** checking and preparing your build on their servers. During this time the
> build shows as **"Processing"** in App Store Connect and you can't test it yet.
> You'll usually get an email when it's ready. Just wait — move on to Step 6
> meanwhile.

---

## Step 6 — Set up the app in App Store Connect + TestFlight

Now switch to Apple's website to create the app record and turn on testing.

### 6a — Create the app record (one time only)

1. Go to <https://appstoreconnect.apple.com> and sign in.
2. Click **Apps**, then the blue **+** near the top left, then **New App**.
3. Fill in the form:
   - **Platforms:** tick **iOS**.
   - **Name:** `CiaraLink` (this is the public name; must be unique across the App
     Store — if taken, try `CiaraLink Care`).
   - **Primary Language:** **English (Australia)** (or English (U.K.)/(U.S.)).
   - **Bundle ID:** choose **`au.com.ciaralink.app`** from the dropdown. (If it's
     not listed, your upload/registration from Step 2/5 hasn't landed yet — wait a
     few minutes and refresh.)
   - **SKU:** a private ID just for your records — type anything simple like
     `ciaralink-ios-001`. Users never see it.
   - **User Access:** leave as **Full Access**.
4. Click **Create**.

### 6b — Go to TestFlight and add your build

1. Open your **CiaraLink** app in App Store Connect, then click the **TestFlight**
   tab along the top.
2. Your uploaded build appears under **iOS Builds**. If it still says
   **"Processing"**, wait until that clears (see Step 5).
3. Once processed, it may show **"Missing Compliance"** with a yellow warning. Click
   the build (or the **Manage** / warning link) and answer the **export compliance**
   question:
   - Most wrapper apps like this only use standard HTTPS encryption. Choosing
     **"None of the algorithms mentioned above"** / answering **No** to using
     non-exempt encryption is typical. (If unsure, the standard answer for an app
     that only uses HTTPS is that it's **exempt**.) Confirm to clear the warning.

### 6c — Turn on internal testing and add yourself

1. Still in **TestFlight**, look at the left sidebar under **Internal Testing**.
2. Click the **+** next to **Internal Testing** to create a group (name it e.g.
   `Founders`), or use the default group if one exists.
3. Open that group, click **Testers**, then the **+**, and add yourself by your
   **Apple ID email** (the same email you use for App Store Connect).
4. Under the group, make sure your processed **build** is enabled/attached (click
   **Builds → +** and select it if needed). Internal testers can use a build as
   soon as it's done processing — no Apple review wait.
5. You'll get an email invite from TestFlight (also check spam).

### 6d — Install and test on your iPhone

1. On your iPhone, open the **App Store** and install the free app called
   **TestFlight** (made by Apple).
2. Open the TestFlight invite email on your phone and tap **View in TestFlight**,
   or open the TestFlight app and tap **Accept**.
3. Tap **Install** next to CiaraLink. It installs like a normal app.
4. Open it and test signing in and the main flows. Done — you're on TestFlight!

> **Tip:** Use a real test login when checking sign-in. The app talks to the live
> backend, so use a genuine CiaraLink account.

---

## Step 7 — Common errors and how to fix them

**"No account with team..." / "No signing certificate found"**
→ In Xcode go **Xcode → Settings → Accounts**, click **+**, and sign in with your
Apple Developer Apple ID. Then redo Step 2 (pick the Team again).

**Signing / certificate errors when archiving**
→ Make sure **Automatically manage signing** is ticked and a **Team** is selected
(Step 2). If it's still stuck, click **Try Again**, or untick and re-tick
"Automatically manage signing" to force Xcode to regenerate the certificate.

**"Failed to register bundle identifier"**
→ See the boxed instructions in **Step 2**. Short version: let Xcode try again, or
register `au.com.ciaralink.app` manually at developer.apple.com.

**"Archive" menu item is greyed out**
→ You're not targeting a device. Redo **Step 3** and pick **Any iOS Device
(arm64)**.

**Build shows "Missing Compliance" in TestFlight**
→ This is the export/encryption question. Click the build and answer it (see Step
6b). For a standard HTTPS app, the exempt answer clears it.

**Build stuck in "Processing" for a long time**
→ Usually under an hour, but it can occasionally take a few hours, especially the
first upload. If it's been over ~24 hours, or it disappears, upload a fresh build
with a **higher build number** (see Step 8) — Apple sometimes silently drops a
build.

**"Invalid Binary" email after upload**
→ Apple found a problem with the package. Read the email — common causes are
missing icons or a bad version number. Re-run `npm run refresh` (Step 1), bump the
build number (Step 8), re-archive (Step 4), and re-upload (Step 5).

**Bundle ID not appearing when creating the app (Step 6a)**
→ Wait 5–10 minutes after your first upload and refresh the page; it can take a
moment for Apple to register the ID against your account.

---

## Step 8 — Each time you update the web app

When you change the CiaraLink website and want those changes in the iPhone app:

1. **Refresh the bundled files** — in Terminal:

   ```bash
   cd /Users/billy/ciaralink-mobile && npm run refresh && npm run open:ios
   ```

2. **Bump the build number** so Apple sees it as new:
   - In Xcode, click the blue **App** icon (left sidebar) → **App** target →
     **General** tab → find **Build** under **Identity** and increase it by 1
     (e.g. `1` → `2`). You can leave the **Version** the same for test builds.
   - Each upload to Apple **must** have a build number higher than the last one, or
     it will be rejected.

3. **Re-archive and re-upload** — repeat **Step 3 → Step 4 → Step 5**.

4. The new build appears in **TestFlight** after processing. Internal testers
   (including you) can install it right away — no review needed.

> Remember: only website *layout/HTML/JS* changes need a new build. Live data, AI,
> and billing come straight from the backend and update instantly without
> re-shipping.

---

That's the whole loop. First time through, the slow parts are the Xcode archive
(Step 4) and Apple's processing (Step 5). After that, updates take just a few
minutes of your time.
