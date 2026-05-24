# Xcode MCP (xcrun mcpbridge) — Research Findings
# Source: web research May 2026. Apple has NOT published official standalone docs.

## What it is
Apple ships 20 MCP tools with Xcode 26.3 via `xcrun mcpbridge`. Bridges into the
running Xcode process via XPC. Requires Xcode to be open with a project loaded.

## All 20 tools

### File ops (9)
XcodeRead, XcodeWrite, XcodeUpdate, XcodeGlob, XcodeGrep,
XcodeLS, XcodeMakeDir, XcodeRM, XcodeMV

### Build & test (4)
- BuildProject — compiles the active scheme
- GetBuildLog — fetches last build output
- RunAllTests — runs every test in the active scheme's active test plan
- RunSomeTests — runs a specific subset by testIdentifier
- GetTestList — lists all tests in the plan

### Diagnostics (2)
XcodeListNavigatorIssues, XcodeRefreshCodeIssuesInFile

### Intelligence (3)
ExecuteSnippet (Swift REPL), RenderPreview (SwiftUI preview image),
DocumentationSearch (Apple docs + WWDC transcripts)

### Workspace (1)
XcodeListWindows — returns tabIdentifier needed by all other tools

## Critical facts about RunAllTests / RunSomeTests

- Uses THE ACTIVE SCHEME'S ACTIVE TEST PLAN — whatever is selected in Xcode's
  scheme editor at the moment of the call.
- For Coiny, the scheme includes two targets: CoinyTests (unit) + CoinyUITests (UI).
- CoinyUITests are XCUITests — they LAUNCH THE APP on the selected simulator,
  tap through the UI, and assert on real UI elements.
- The simulator destination used is whatever is currently selected in Xcode's
  toolbar (e.g. iPhone 17 Pro iOS 26.5).
- No way to specify a destination in the tool call — it's Xcode's active selection.
- UITests will visibly drive the simulator on screen (you will see taps happening).
- Apple has not published granular docs on timeout behavior, parallelization, etc.

## What RunAllTests does to Coiny right now
1. Compiles CoinyTests + CoinyUITests targets
2. Installs the app on the active simulator
3. Runs 76 unit tests (fast, no simulator UI interaction)
4. Runs AppLaunchSmokeTests (launches app, checks sign-in screen)
5. Runs TabNavigationTests (launches app with --ui-testing, taps all 6 tabs)
Total expected time: ~3-5 minutes. You will see the simulator being driven.

## What it CANNOT test
- Real Plaid Link flow (third-party WebView, no stable accessibility IDs)
- Sign In with Apple (requires real device + Apple ID entitlement)
- Real APNs delivery (simulator can't receive production APNs)
- Live external API calls (Coinbase, Zerion, Spinwheel) with real credentials
  → These are covered by the backend Vitest suite (258 tests, all mocked)

## Correct approach for comprehensive validation
1. RunAllTests via Xcode MCP → covers unit + UI
2. Backend suite already at 258 passing (includes E2E pipeline test)
3. Manual: tap "Debug: Skip Sign In" → link First Platypus Bank → reset cursor
   → fire test transaction → verify rule matched (this is the one thing we can't automate)
