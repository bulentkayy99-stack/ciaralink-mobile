# iPad 13-inch App Store screenshots (CiaraLink)

## Simulator
- **Device:** iPad Pro 13-inch (M5)
- **UDID:** `16BC82F9-739F-4A71-A153-5E9289B5C541`
- **Xcode:** `/Applications/Xcode-26.5.app` (`DEVELOPER_DIR`)
- **Bundle ID:** `au.com.ciaralink.app`
- **Build:** `ios/build/Build/Products/Debug-iphonesimulator/App.app`

## Captured files (portrait)
| File | Screen |
|------|--------|
| `01-login.png` | Sign-in (`Login.dc.html`) |
| `02-dashboard.png` | Provider dashboard |
| `03-pricing.png` | Pricing |

Duplicate capture: `01-sign-in.png` (same login flow, same dimensions).

## Pixel dimensions (verified with `sips`)
All PNGs in this folder:

- **2064 × 2752** (portrait)

This matches **App Store Connect → iPad 13-inch display** portrait requirement (**2064 × 2752**).

Landscape uploads (if needed): **2752 × 2064**.

Note: Legacy **12.9-inch iPad Pro** slot uses **2048 × 2732** (portrait) / **2732 × 2048** (landscape). This simulator’s native screenshot size is **2064 × 2752**, which is the correct 13-inch slot—not 12.9-inch.

## Capture command
```bash
export DEVELOPER_DIR="/Applications/Xcode-26.5.app/Contents/Developer"
UDID="16BC82F9-739F-4A71-A153-5E9289B5C541"
xcrun simctl io "$UDID" screenshot "store-assets/ios/ipad-13/your-shot.png"
sips -g pixelWidth -g pixelHeight "store-assets/ios/ipad-13/your-shot.png"
```

## Auth note
## Auth note

Screenshot capture uses **`demo-provider-admin@ciaralink.example`** / `DemoPassword123!` (same as App Review and `Login.dc.html`). Re-run `scripts/ios-store-capture-ipad-13.mjs` after `npm run refresh` if assets need refreshing.
