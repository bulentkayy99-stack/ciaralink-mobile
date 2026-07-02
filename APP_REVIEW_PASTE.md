# App Store Connect — copy/paste block

Open **App Store Connect → CiaraLink → Distribution → 1.0 → App Review Information**.

Fill **Sign-In Required** and paste **Notes** below.

---

## Sign-In Required (username / password fields)

```
Username: demo-provider-admin@ciaralink.example
Password: DemoPassword123!
```

---

## Notes (paste into the Notes box)

```
ABOUT THE APP
CiaraLink is a care-coordination and practice-administration platform for
Australian NDIS providers and care teams (providers, support coordinators,
allied health, support workers, and participants). It is administrative
software, not a medical device — it does not provide diagnosis, treatment, or
clinical advice.

SIGN-IN
The app requires an account. Please use the demo credentials in the Sign-In
Required fields above. After sign-in you will land on the Provider Admin
dashboard with sample participants, shifts, and care records.

WHAT TO TEST
1. Sign in with the demo account.
2. View the Provider dashboard (participants, shifts, KPIs).
3. Open Support Worker or Participant views from the role navigation if visible.
4. Open Settings or a participant record to confirm data loads.
5. Sign out from Settings.

NATIVE FUNCTIONALITY (Guideline 4.2)
CiaraLink is a native Capacitor app. The UI is bundled in the app (not a
remote website wrapper) with native splash, icon, and lifecycle handling.
Camera and photo library permissions are declared for capturing care
documents on device. Dynamic records are loaded from our backend API over HTTPS.

PAYMENTS
Subscriptions are B2B SaaS via Stripe hosted checkout (in-app browser). The
demo account is already active — no paywall blocks review.

CONTACT
Billy — support via App Store Connect reply or the contact email on the listing.
```

---

## Quick checklist (same session)

- [ ] **TestFlight / Distribution:** Build **1.0.0 (4)** attached and **Ready to Test**
- [ ] **Screenshots:** iPhone 6.9" and 6.5" from `store-assets/ios/`
- [ ] **Pricing:** Free
- [ ] **Export compliance:** No non-exempt encryption
- [ ] **Add for Review** → Submit
