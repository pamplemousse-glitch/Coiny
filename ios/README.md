# Coiny iOS

Native Swift + SwiftUI app for Coiny. iOS 17+.

## Tooling

- **Xcode 16.x** (full app — Command Line Tools not enough; install from App Store)
- **XcodeGen** — `brew install xcodegen` (defines the Xcode project from `project.yml`)
- **SwiftFormat** — `brew install swiftformat`
- **SwiftLint** — `brew install swiftlint` (requires full Xcode)

## Generate the Xcode project

The `.xcodeproj` is not checked in — it's generated from `project.yml`:

```
cd ios
xcodegen generate
open Coiny.xcodeproj
```

## Versioning

Two numbers, one of them typed by a human and one of them never.

| Key | Source | Who changes it |
|---|---|---|
| `CFBundleShortVersionString` | `MARKETING_VERSION` in `project.yml` | A human, once per release |
| `CFBundleVersion` | `git rev-list --count HEAD`, stamped at build time | Nobody |

`Scripts/stamp-build-number.sh` runs as a post-build phase and rewrites
`CFBundleVersion` inside the built product before code signing. Nothing in the
source tree is modified, so a build never dirties the working copy.

Why commit count: App Store Connect refuses a second upload carrying a build
number it has already seen for the same marketing version, and the old value
was the literal `1`, so the first TestFlight upload would have worked and every
one after it would have failed. Commit count is strictly increasing (history
only grows, and a squash-merge to `main` adds one), needs no state outside the
repo, and names exactly one commit.

Two consequences worth knowing:

- **Two archives of the same commit get the same build number**, and the second
  upload is refused. That is correct: they are the same build. Commit, then
  re-archive.
- **Build numbers are only comparable along one line of history.** Uploads come
  from `main` or from a release tag, where they are.

### Releases are tagged

Tag the release commit `ios-v<MARKETING_VERSION>`:

```
git tag -a ios-v0.2.0 -m "iOS 0.2.0"
git push origin ios-v0.2.0
```

The tag is what makes "which commit shipped as 0.2.0" answerable later, when
the build number alone only tells you how many commits preceded it. The build
script fails the build if `HEAD` carries an `ios-v` tag that disagrees with
`MARKETING_VERSION`, so the two cannot drift silently.

## Build for Simulator (CLI)

```
xcodebuild \
  -project ios/Coiny.xcodeproj \
  -scheme Coiny \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
  -configuration Debug \
  build
```

## Install + launch in Simulator (CLI)

```
xcrun simctl boot 'iPhone 16 Pro' 2>/dev/null || true
open -a Simulator
xcrun simctl install booted \
  $(xcodebuild -project ios/Coiny.xcodeproj -scheme Coiny -showBuildSettings | grep BUILT_PRODUCTS_DIR | head -1 | awk '{print $3}')/Coiny.app
xcrun simctl launch booted app.coiny.ios
```

## Screenshot the current view

```
xcrun simctl io booted screenshot ~/Desktop/coiny-current.png
```

## Architecture

- **MVVM** via `@Observable` (Swift Observation framework)
- **Single API client** (`Services/API.swift`) — actor-isolated, talks to `coiny-backend.fly.dev`
- **Stores** (`ViewModels/PetStore.swift`) — `@Observable` classes; injected via `Environment(PetStore.self)`
- **Views** — SwiftUI, organized in `Views/` by concern (Pet, Spending, Settings)

## Layer responsibilities

```
ios/
├── project.yml                  # XcodeGen project definition (review me, not the .xcodeproj)
├── Coiny/
│   ├── CoinyApp.swift           # @main entry point
│   ├── Info.plist               # Minimal — most config is in project.yml
│   ├── Models/                  # Decodable types matching backend response shapes
│   ├── Services/                # Networking, BLE (future), Plaid Link (future)
│   ├── ViewModels/              # @Observable stores
│   ├── Views/                   # SwiftUI views
│   └── Resources/               # Assets, Localizable.strings, etc.
└── CoinyTests/                  # XCTest unit tests
```

## Backend dependency

Hits the live deployed backend at `https://coiny-backend.fly.dev`. No local
backend setup needed; you can develop iOS against production sandbox data.

If you want to point at a local backend instead, change `Endpoint.baseURL`
in `Services/API.swift`. Future: this should read from a build setting.

## What's missing (current state — Phase 1 of iOS work)

This is the scaffold PR. Not yet implemented:

- [ ] Plaid Link SDK integration (`PLKPlaidLink` cocoapod or SwiftPM)
- [ ] WorkOS auth (Sign In With Apple flow)
- [ ] Push notifications (APNs)
- [ ] CoreBluetooth integration with Coiny device
- [ ] Real pet sprite assets (currently SF Symbols)
- [ ] Onboarding flow
- [ ] Apple Watch companion
- [ ] iOS Widgets
- [ ] Live Activities + Dynamic Island
- [ ] Datadog RUM SDK
- [ ] Sentry crash reporting

Each becomes its own PR.
