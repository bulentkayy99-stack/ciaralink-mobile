# CiaraLink — App Store Submission Kit (iOS)

Copy-paste ready fields for **App Store Connect**. Anything in `[[ ... ]]` is a
**FILL IN** placeholder you must complete before submitting.

| Field | Value |
|---|---|
| App name | **CiaraLink** |
| Bundle ID | `au.com.ciaralink.app` |
| SKU | `[[ e.g. ciaralink-ios-001 ]]` |
| Primary locale | English (Australia) |
| Live web app | https://ciaralink.vercel.app |
| Privacy policy URL | https://ciaralink.vercel.app/privacy.html |

> Positioning rule: CiaraLink is **care-coordination / admin software** for the
> Australian NDIS sector. Do **not** make clinical, diagnostic, or treatment
> claims anywhere in the listing.

---

## 1. App Name & Subtitle

**App Name** (max 30 characters) — pick one:

| Option | Chars |
|---|---|
| `CiaraLink` | 9 |
| `CiaraLink: Care Coordination` | 28 |
| `CiaraLink — Care OS` | 19 |

> Recommended: `CiaraLink` (clean brand) — put the descriptor in the subtitle.

**Subtitle** (max 30 characters) — pick one:

| Option | Chars |
|---|---|
| `NDIS care, in one place` | 23 |
| `Connected care for NDIS` | 23 |
| `Care coordination, made clear` | 29 |

> Recommended: `Connected care for NDIS`.

---

## 2. Listing Text

### Promotional Text (max 170 chars — editable anytime without review)
```
One place for NDIS care: notes, documents, shifts, consent and invoices — connected. One fair subscription, 0% commission. Start a 14-day free trial.
```
(146 chars)

### Keywords (max 100 chars, comma-separated, NO spaces after commas)
```
NDIS,care,coordination,support worker,disability,allied health,shift notes,provider,roster,participant
```
(101 chars — trim if App Store Connect flags it; drop `roster` to fit:)
```
NDIS,care,coordination,support worker,disability,allied health,shift notes,provider,participant
```
(94 chars — safe)

> Don't repeat words already in the app name/subtitle (e.g. "CiaraLink"). Don't
> use competitor brand names. Singular forms cover plurals.

### Support URL
```
https://ciaralink.vercel.app
```
> Optional but better: a dedicated `https://ciaralink.vercel.app/support.html`
> or a `mailto:` contact. `[[ confirm a support/contact page exists ]]`

### Marketing URL (optional)
```
https://ciaralink.vercel.app
```

### Description (full — paste into Description field)
```
CiaraLink is the connected-care platform for Australian NDIS and healthcare teams. Care, documents, support, notes and invoices — finally in one place, working as one system.

Most platforms grow by taking a cut of your care budget. CiaraLink charges one fair subscription with every feature included, and never takes commission on your work.

ONE CONNECTED RECORD
Participants, providers, support coordinators, allied health and support workers share one live record — with role-based access, so everyone sees exactly what they should and nothing they shouldn't.

BUILT FOR EVERY ROLE
• Providers — run participants, teams and billing from one console
• Support Coordination — manage caseloads, plan budgets and reviews with evidence attached
• Allied Health — notes, assessments and shared goals across disciplines
• Support Workers — see shifts, log visits and capture notes from your phone, on the go
• Participants, guardians and nominees — see supports, goals and documents, and stay in control of consent

WHAT YOU CAN DO
• Capture shift notes and visit records on the go, including photos of documents via your camera
• Keep service agreements, plans and consent attached to the right participant automatically
• Schedule shifts, confirm visits and turn each one into a note and a billable line — without double entry
• Link every invoice to the shift, note and budget line behind it for fast reconciliation
• Control consent and access so the right people see the right information

FAIR PRICING
• One subscription, priced by your size — every feature included
• 0% commission, ever
• 14-day free trial

CiaraLink is care-coordination and practice-administration software. It helps teams organise and share information; it is not a medical device and does not provide clinical advice, diagnosis or treatment.

An account is required to use CiaraLink. New to CiaraLink? Start a free trial at https://ciaralink.vercel.app.

Questions? Visit https://ciaralink.vercel.app or see our Privacy Policy at https://ciaralink.vercel.app/privacy.html.
```

---

## 3. Category & Age Rating

| Field | Recommendation |
|---|---|
| **Primary category** | **Business** |
| **Secondary category** | **Medical** |

> Rationale: CiaraLink is admin/coordination software for care **providers**,
> so **Business** is the safest fit and attracts less clinical scrutiny.
> **Medical** as secondary aids discovery in the care sector. (If you'd rather
> lead with sector relevance, swap to Medical primary / Business secondary — but
> Medical-primary apps get extra review attention and you must avoid any
> diagnostic framing.)

**Age Rating:** Complete the questionnaire with **all "None"** for objectionable
content. Expected result: **4+**. CiaraLink has no violence, mature themes,
gambling, or user-generated public content. Note: the app is intended for
professional/adult users; there is no age-gating requirement beyond 4+.

---

## 4. App Privacy ("Data Safety") Questionnaire

Apple asks, per data type: **Is it collected? Used for tracking? Linked to the
user's identity? What purposes?** CiaraLink collects the following. **Nothing is
used for tracking** (no third-party ad/data-broker sharing across apps), and
account-related data **is linked to identity**.

> Set **"Used for Tracking": NO** for every type. CiaraLink does not use IDFA or
> share data with brokers for cross-app advertising.

### Contact Info
| Data | Collected | Linked to identity | Purposes |
|---|---|---|---|
| Email address | Yes | Yes | App Functionality, Account management |
| Name | Yes | Yes | App Functionality |
| Phone number | Yes (if provided) | Yes | App Functionality |

### Health & Fitness
| Data | Collected | Linked to identity | Purposes |
|---|---|---|---|
| Health (care/support information about participants entered by users) | Yes | Yes | App Functionality |

> Apple's "Health" bucket is the right place for participant care/support
> records and any health-related details users record. Purpose = **App
> Functionality** only. Do NOT tick Analytics/Advertising for this.

### User Content
| Data | Collected | Linked to identity | Purposes |
|---|---|---|---|
| Photos or Videos (document scans, uploads via camera) | Yes | Yes | App Functionality |
| Other User Content (notes, documents, service agreements, consent records) | Yes | Yes | App Functionality |

### Identifiers
| Data | Collected | Linked to identity | Purposes |
|---|---|---|---|
| User ID (account identifier) | Yes | Yes | App Functionality, Account management |
| Device ID (push token, if push enabled) | `[[ Yes only if you ship push in v1; otherwise No ]]` | Yes | App Functionality (notifications) |

### Financial Info
| Data | Collected | Linked to identity | Purposes |
|---|---|---|---|
| Payment Info | Collected by Stripe, not by CiaraLink | n/a | Purchases (handled by Stripe's hosted checkout) |

> Card details are entered on Stripe's hosted page, not stored by CiaraLink. You
> may declare **Payment Info: Not Collected** by the app, since Stripe is the
> processor. If unsure, declare it as collected for "Purchases" and note Stripe
> in review notes.

### Diagnostics / Usage Data
| Data | Collected | Linked to identity | Purposes |
|---|---|---|---|
| Crash data / Performance | `[[ Yes if you add analytics/crash SDK; default No for v1 ]]` | No | Analytics |

> v1 default: **No** diagnostics collection. Update if you later add Sentry,
> Firebase Analytics, etc.

**Tracking:** No. **App does not request App Tracking Transparency permission.**

---

## 5. App Review Notes (CRITICAL)

Paste into **App Review Information → Notes**, and fill the **Sign-In Required**
demo credential fields.

### Demo account (REQUIRED — Apple WILL reject a sign-in app without this)

Use the verified working account (tested against live Supabase). Full paste block: **`APP_REVIEW_PASTE.md`**.

```
Demo username (email): demo-provider-admin@ciaralink.example
Demo password:         DemoPassword123!
Demo role:             Provider Admin (full-feature view — recommended for review)
```

> Do **not** use `@ciaralink.com.au` demo addresses — those are not provisioned on Supabase.
> All role demos use `@ciaralink.example` with the same password (see `Login.dc.html`).

### Reviewer notes (paste into the Notes box)
```
ABOUT THE APP
CiaraLink is a care-coordination and practice-administration platform for
Australian NDIS providers and care teams (providers, support coordinators,
allied health, support workers, and participants). It is administrative
software, not a medical device — it does not provide diagnosis, treatment or
clinical advice.

SIGN-IN
The app requires an account to be useful (it manages private care records, so
data is gated behind authentication). Please use the demo account in the
Sign-In Required fields above. After signing in you will land on a role-based
dashboard with sample data.

WHAT TO TEST
1. Sign in with the demo account.
2. View the dashboard (participants, shifts, KPIs).
3. Open a participant record and an associated note.
4. Tap to add a shift note; the app can attach a photo of a document using the
   device CAMERA (this is a native capability, not a web feature).
5. Sign out.

NATIVE FUNCTIONALITY (re: Guideline 4.2 Minimum Functionality)
CiaraLink is a native app built with Capacitor — the interface is BUNDLED in the
app (not a remote URL wrapper) and launches instantly with a native splash and
icon. It uses native device capabilities:
 • Camera + Photo library for capturing/uploading care documents on the go
 • Local filesystem for handling files offline
 • Native splash screen, status bar theming, and app lifecycle handling
Dynamic data (records, AI document processing, billing) is served live from our
backend, the same way any native app calls its server API. The app provides an
offline shell so it opens and remains usable when connectivity drops.

PAYMENTS
Subscriptions are sold to businesses (B2B SaaS) and are processed via Stripe's
hosted checkout, which opens in an in-app browser. These are not digital goods
consumed inside the app, so In-App Purchase is not used. No paywall blocks the
reviewer — the demo account is already active.

CONTACT
[[ your name ]] — [[ your email/phone for the reviewer ]]
```

> If you ship **without** push notifications in v1 (recommended for a smoother
> first review), delete the push line above and answer "No" to Device ID
> collection in Section 4.

---

## 6. Screenshots

Apple requires screenshots for the largest device sizes; smaller sizes are
optional but recommended. Upload **at least 3**, ideally **5–6** per size.

### Required / recommended sizes (iPhone)
| Display | Device examples | Pixel size (portrait) | Required? |
|---|---|---|---|
| 6.9" / 6.7" | iPhone 16 Pro Max / 15 Pro Max | **1290 × 2796** (or 1320 × 2868) | **Required** |
| 6.5" | iPhone 11 Pro Max / XS Max | 1242 × 2688 | Recommended (can reuse 6.7") |
| 5.5" | iPhone 8 Plus | 1242 × 2208 | Optional (legacy) |

> Modern App Store Connect accepts a single 6.9"/6.7" set and scales it to other
> iPhone sizes. Provide the 6.7"/6.9" set at minimum.

### iPad (ONLY if you enable iPad support)
| Display | Device | Pixel size (portrait) | Required if iPad supported |
|---|---|---|---|
| 13" / 12.9" | iPad Pro | **2048 × 2732** | Required |

> If the app targets iPhone only, set the device family to iPhone in Xcode and
> you can skip iPad screenshots entirely.

### Suggested shot list (6 shots)
1. **Hero / sign-in or role chooser** — "Care coordination, made clear." with the role/sign-in screen.
2. **Provider dashboard** — KPIs (participants, shifts, on-track %) and the participant list.
3. **Participant record** — care team + linked documents view (shows role-based access).
4. **Shift notes capture** — adding a visit note, with the camera document-scan affordance visible.
5. **Invoices linked to evidence** — an invoice tied to a shift/note/budget line.
6. **Consent / access control** — consent on file, role-based permissions.

> Add a short caption overlay to each (e.g. "Everything care needs, in one
> place" / "0% commission"). Keep them honest — only show real, working
> screens. Capture from the demo account on a device/simulator at the exact
> pixel sizes above.

---

## 7. Export Compliance

In App Store Connect → Export Compliance, answer:

- **Does your app use encryption?** → **Yes**
- **Does it qualify for the exemption?** → **Yes** — the app uses only standard
  encryption (HTTPS/TLS for network calls, and the platform's standard
  encryption). It implements **no proprietary or non-standard cryptography**.
- This qualifies under the **exemption** in category 5D992 (uses standard
  encryption only). **No CCATS / no annual self-classification report required.**

To make this automatic on every build, you may add to `Info.plist`:
```
ITSAppUsesNonExemptEncryption = NO
```
> `[[ optional: add the above key to ios/App/App/Info.plist to skip the export
> compliance prompt on each upload ]]`

---

## Pre-submit checklist
- [ ] Demo account created on live app, populated with sample data, credentials in Section 5
- [ ] Privacy policy URL loads: https://ciaralink.vercel.app/privacy.html
- [ ] App Privacy answers entered (Section 4) — Tracking = No everywhere
- [ ] Screenshots uploaded at 6.7"/6.9" (+ iPad if supported)
- [ ] Category set (Business / Medical), age rating = 4+
- [ ] Export compliance answered (standard encryption, exempt)
- [ ] Decide push: in or out of v1 (keep out for smoother first review)
- [ ] Build archived & uploaded via Xcode, attached to the version, then **Submit for Review**
