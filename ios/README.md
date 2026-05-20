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
