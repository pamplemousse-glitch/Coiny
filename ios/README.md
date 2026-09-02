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

## The gate, which is what CI runs

Run this before opening a PR, and run it AFTER the last edit.

```
xcrun simctl shutdown all                    # see the note below
cd ios && xcodegen generate                  # after adding or moving any file
swiftlint lint --strict Coiny                # ios-ci.yml runs exactly this

UDID=$(xcrun simctl list devices available --json \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["devices"]; \
                runtimes=sorted([k for k in d if "iOS" in k]); \
                devs=[x for r in runtimes for x in d[r] if x.get("isAvailable") and "iPhone" in x["name"]]; \
                print(devs[0]["udid"])')

xcodebuild test \
  -project Coiny.xcodeproj -scheme Coiny -sdk iphonesimulator \
  -destination "platform=iOS Simulator,id=$UDID" \
  -resultBundlePath TestResults.xcresult \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" CODE_SIGN_ENTITLEMENTS="" \
  > /tmp/ios-test.log 2>&1; echo "EXIT=$?"
```

**No `-only-testing:CoinyTests`.** That flag runs the unit target alone, which
is about 614 fast tests and roughly twenty seconds, and it SKIPS `CoinyUITests`
entirely: the accessibility audits, the paywall's legally required links, the
tab navigation. CI runs the whole scheme. A session ran the narrow form on six
iOS PRs, called the gate green, and found out from CI on the seventh (#362).
The unit target on its own is a fine inner loop; it is not the gate.

**Never behind a pipe.** `xcodebuild ... | xcbeautify` reports xcbeautify's exit
code, which is 0. Redirect and echo `$?`, the same rule the backend gate follows.

**Shut the simulators down first.** Leftover booted devices are the single
biggest source of timing failures in the UI tests, and they also poison the
backend's PGlite suite through machine load.

### When a UI test fails

Read the result bundle before believing the summary line. The log prints
`XCTAssertTrue failed` with no context, and the bundle says which line:

```
xcrun xcresulttool get test-results tests --path TestResults.xcresult --format json
```

Two failures look identical in the log and mean opposite things:

- **A failure inside `setUp`** is navigation or launch timing, not the thing the
  test is named after. `PaywallUITests.swift:33` is a `waitForExistence` on the
  Settings navigation bar; when it times out, the paywall was never reached and
  the accessibility audit never ran. That is a flake, and the tell is that the
  other tests in the same class share that `setUp` and passed.
- **A failure inside the test body** is real. For the audits specifically,
  `CoinyUITests/AccessibilityAudit.swift` already distinguishes a finding from
  `Code=-56` ("audit failed to complete in time") and retries once on the
  timeout only, so a reported finding has survived that filter.

Re-run the job to tell them apart rather than asserting flake: `gh run rerun
<run-id> --failed`.

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
