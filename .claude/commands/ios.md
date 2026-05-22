# iOS Dev Commands

Working directory: `/Users/antoinewiley/Tamogatchi/ios`

## Build (simulator)
```bash
cd /Users/antoinewiley/Tamogatchi/ios && xcodebuild -scheme Coiny -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | xcpretty
```

## Run tests
```bash
cd /Users/antoinewiley/Tamogatchi/ios && xcodebuild test -scheme Coiny -destination 'platform=iOS Simulator,name=iPhone 16' 2>&1 | xcpretty
```

## Regenerate Xcode project (after adding files)
```bash
cd /Users/antoinewiley/Tamogatchi/ios && xcodegen generate
```

## Stack
- Swift + SwiftUI + Combine
- XcodeGen for project file management (never edit .xcodeproj directly)
- XCTest + XCUITest
- Apple Sign In for auth
- Bearer token session stored in Keychain (kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly)

## Key conventions
- New Swift files must be added to ios/project.yml (XcodeGen config), not .xcodeproj
- API calls go through Services/API.swift (actor)
- All views are in Views/, models in Models/, view models in ViewModels/
