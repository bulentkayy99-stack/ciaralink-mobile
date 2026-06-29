# CiaraLink — App Store Listing Creative Assets

Practical, on-brand guidance for producing the App Store screenshots, icon, captions and (optional) preview video for the **CiaraLink** iOS app.

- **App:** CiaraLink — CARE OS (Australian NDIS care coordination)
- **Bundle ID:** `au.com.ciaralink.app` · **App name:** CiaraLink
- **Brand:** Teal `#16b8a6`, deep green `#14302b`, accent teal-light `#11d4be`. Font: **Hanken Grotesk** (use weights 800/900 for overlay headlines).
- **Promise:** One platform for the whole care world · one fair subscription · **0% commission** · **14-day free trial**.
- **Web/app source:** the iOS build wraps `www/` (Capacitor). All routes below are the real `.html` / `.dc.html` pages bundled in `/Users/billy/ciaralink-mobile/www/`. App launch redirects `index.html → Login.dc.html?source=app`.

---

## 1. Screenshot shot list (capture 6 — order = App Store order)

Capture these screens from the running app/simulator. Each is mapped to the real page to open, with the overlay headline (brand voice) and a one-line supporting subhead. Keep headlines short (≤6 words) and in Hanken Grotesk 900.

| # | Screen to capture | Page / route to open | Overlay headline | Supporting subhead |
|---|---|---|---|---|
| 1 | **Hero / role chooser** (signup "who are you") | `signup.html` | One platform for your whole care world | Providers, workers, coordinators, allied health & participants |
| 2 | **Provider dashboard** (participants, shifts, on-track KPIs) | `CiaraLink Provider Dashboard.dc.html` | Run your whole service from one console | Participants, teams and billing — connected |
| 3 | **Support Worker app** (shifts + shift notes) | `Support Worker.dc.html` (or `Worker App.dc.html`) | Shift notes that reach your provider instantly | Log visits and notes from your phone, on the go |
| 4 | **Participant dashboard / NDIS plan** | `Participant Dashboard.dc.html` | Your NDIS plan, in your hands | See your supports, team, goals and documents |
| 5 | **Consent / connected care team** | `Consent Centre.dc.html` (or `Care Ecosystem.dc.html`) | Consent-based access you control | The right people see the right record — nothing more |
| 6 | **Pricing / 0% commission** | `pricing.html` | 0% commission. One fair subscription. | Keep 100% of every care dollar · 14-day free trial |

**Optional 7th/8th** if you want 7–8 (allowed up to 10):
- **Verified visit** — `Verified Visit.dc.html` — *"Every visit, verified and billable"* — *No double entry, ever.*
- **AI File Drop / intake** — `AI File Drop.dc.html` — *"Drop a document, it files itself"* — *Notes, plans and consent, sorted automatically.*

**Sequencing rule:** the first 2–3 must sell the value on their own — they're the only ones most browsers see. Lead with shot 1 (whole-care-world) and shot 2 (provider console).

---

## 2. Required device sizes & how to capture

Apple now only **mandates the 6.7"/6.9" iPhone size**; it auto-scales that set down to smaller devices. Provide the 6.7" set as the baseline, and add the others only if you want pixel-perfect framing on older devices.

| Display | Portrait resolution | Status | Capture on (iOS Simulator) |
|---|---|---|---|
| 6.7" iPhone | **1290 × 2796** | **Mandatory** (primary) | iPhone 15 Pro Max / 16 Pro Max / 15 Plus |
| 6.9" iPhone | 1320 × 2868 | Accepted in same slot as 6.7" | iPhone 16 Pro Max |
| 6.5" iPhone | 1242 × 2688 | Optional | iPhone 11 Pro Max / XS Max |
| 5.5" iPhone | **1242 × 2208** | Optional (legacy) | iPhone 8 Plus |
| 12.9" iPad Pro | 2048 × 2732 | Only if you ship iPad | iPad Pro 12.9" (6th gen) |

**Minimum to submit:** 1 screenshot at 6.7" (1290×2796). Recommended: the full 6 at 6.7", optionally re-rendered at 1242×2208 for the 5.5" slot.

**How to capture from the build:**
1. `cd /Users/billy/ciaralink-mobile && npx cap sync ios && npx cap open ios`
2. In Xcode pick the matching simulator (e.g. **iPhone 16 Pro Max** for 6.7"/1290×2796), Run.
3. Navigate to each route from the shot list. Sign in with a demo account so dashboards show real role data.
4. Capture: in the Simulator, **File → Save Screen** (or `⌘S`). Output already matches the device's native resolution — no resizing needed.
5. For framed marketing screenshots (device-in-frame + caption), drop the raw captures into the framing tool (see §4). Final exported canvas must equal the exact resolution in the table above.

> Tip: capture every shot on the **same single simulator** (6.7") so the whole set is consistent, then re-frame to other sizes only if needed.

---

## 3. App icon (1024 × 1024 marketing icon)

**Use as the source:** `/Users/billy/ciaralink-mobile/assets/icon.png` — already **1024 × 1024, RGB, no alpha** (verified). This is the cleanest marketing-icon source and is Apple-compliant.

Equivalent brand sources if you need to regenerate:
- `/Users/billy/ciaralink/icons/ciaralink-worker-1024.png` — 1024×1024, no alpha (brand icon).
- `/Users/billy/ciaralink/apple-touch-icon.png` — only **180×180**, do **not** use for the store (too small).

**Apple requirements — confirm before upload:**
- **1024 × 1024 px**, PNG or JPEG.
- **No transparency / no alpha channel** — ✅ `assets/icon.png` already has `hasAlpha: no`.
- **Square with no rounded corners and no drop shadow** — iOS applies the rounded mask automatically. If any source ever has rounded corners baked in, flatten on a solid brand background (`#14302b` deep green or teal gradient) before export.
- Flatten check (no alpha) if regenerating:
  `sips -s format png --setProperty hasAlpha no in.png --out icon-1024.png`

---

## 4. Caption / overlay copy + background

### Headline options (brand voice — pick one per shot)
- One platform for your whole care world
- Care coordination, made clear
- 0% commission. Every feature included.
- Shift notes that reach your provider instantly
- Your NDIS plan, in your hands
- Run your whole service from one console
- Consent-based access you control
- One connected record, not five portals
- Keep 100% of every care dollar
- 14-day free trial. No card to start.

### Subhead bank (smaller line under headline)
- Providers, workers, coordinators, allied health & participants — connected.
- Notes, invoices, consent and shifts, finally in one place.
- One fair subscription, priced by your size.
- Built for Australian NDIS & healthcare teams.

### Typography for overlays
- Font **Hanken Grotesk** (matches the app). Headline weight **900**, subhead **600**.
- Headline color **white** on dark backgrounds, or deep green `#14302b` on light teal panels.

### Suggested screenshot background (framed marketing shots)
Use the brand gradient behind the device frame:
- **Primary:** deep-green → teal vertical gradient, `#14302b → #0b6b60` (matches splash/`backgroundColor`).
- **Alt (lighter, for participant/consumer shots):** teal gradient `#11d4be → #16b8a6` with deep-green text.
- Keep one background treatment across all shots for a consistent carousel. Place device frame centered, headline top, subhead directly below.

---

## 5. Optional App Preview video (15–30s)

Portrait, recorded on the same 6.7" simulator (App Store accepts a 1080×1920 / device-native portrait preview). Aim ~20s. Suggested beat sheet:

1. **0–3s** — Brand splash → tagline "Care coordination, made clear." (deep-green bg, teal logo).
2. **3–8s** — Role chooser tap → land on Provider dashboard (KPIs, participants populate).
3. **8–13s** — Switch to Support Worker view: open a shift, write a shift note, hit save → "Note signed · shared with the team" toast.
4. **13–17s** — Participant view: NDIS plan, supports and team visible.
5. **17–20s** — End card: "0% commission · 14-day free trial" + CiaraLink — CARE OS logo, teal/green gradient, CTA.

Guidance: capture the live UI (no fake data), keep motion calm, one idea per beat, captions burned in for silent autoplay, no audio dependency. Export at device-native portrait resolution.

---

### Quick checklist before upload
- [ ] 6 screenshots @ 1290×2796 (6.7"), brand-gradient framed, Hanken Grotesk overlays
- [ ] First 3 shots sell value on their own
- [ ] Icon: `assets/icon.png` 1024×1024, no alpha, square (no rounded corners)
- [ ] (Optional) 5.5" set @ 1242×2208 and App Preview video
- [ ] Real role data shown (demo login), not placeholder/fake content
