# iOS — Coiny SwiftUI App

Swift 5.10 + SwiftUI, iOS 17+. XcodeGen-managed project. Apple Sign In + Keychain session.

## Key commands

```bash
# Regenerate Xcode project after ios/project.yml changes (ALWAYS do this)
cd /Users/antoinewiley/Tamogatchi/ios && xcodegen generate

# Build for device (after xcodegen)
xcodebuild -scheme Coiny -project ios/Coiny.xcodeproj \
  -destination 'generic/platform=iOS' -configuration Debug build

# Open in Xcode
open ios/Coiny.xcodeproj
```

## Key files

| File | Purpose |
|---|---|
| `Coiny/CoinyApp.swift` | App entry point; three-state flow: SignIn → Onboarding → Root |
| `Coiny/Services/API.swift` | Typed backend client; injects Bearer token; auto-signs-out on 401 |
| `Coiny/Services/Keychain.swift` | Generic Keychain wrapper; `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` |
| `Coiny/Views/SignInView.swift` | `SignInWithAppleButton`; extracts identity token + user ID |
| `Coiny/Views/OnboardingView.swift` | Goals → bank link → push opt-in flow |
| `Coiny/Views/RootView.swift` | Main pet screen (breathing animation, health bar) |
| `Coiny/Views/SettingsView.swift` | Bank status, goal display, sign-out, reset |
| `ios/project.yml` | XcodeGen config — edit this, not the .xcodeproj directly |

## Conventions

- SwiftUI only — no UIKit unless forced by an API.
- `@MainActor` on all ViewModels.
- `async/await` over completion handlers.
- Never store session token in `UserDefaults` — Keychain only.
- `SWIFT_TREAT_WARNINGS_AS_ERRORS: YES` — no warnings allowed.
- After any `project.yml` change, run `xcodegen generate` before building.

## BLE (Phase 2 — not yet implemented)

BLE command schema is in `docs/mqtt-topics.md`. The iOS side will use `CoreBluetooth` to relay commands from push notifications to the nRF52840 device.
