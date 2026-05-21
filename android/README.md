# Coiny Android

Native Kotlin + Jetpack Compose app for Coiny. Android 8.0+ (API 26+).

**Status:** Scaffold checkpoint. iOS is the launch priority (see `ios/README.md`);
this Android scaffold is paused. Pet/Spending/Settings screens are TODO placeholders
in `RootScaffold.kt` — fill them in by mirroring the iOS Swift structure when work resumes.

## Tooling

- **Android Studio Ladybug+** (Hedgehog or newer)
- **Android SDK Platform 35** (Android 15)
- **JDK 17** (Android Studio bundles JBR — set `JAVA_HOME` to point at it)
- **System image:** `system-images;android-35;google_apis;arm64-v8a` (for Apple Silicon Macs)

Already installed on this Mac:
```
brew install --cask android-studio android-commandlinetools
```

## One-time emulator setup

```bash
export ANDROID_HOME=/usr/local/share/android-commandlinetools
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

# AVD already created: Pixel_8_Pro_API35
avdmanager list avd

# Launch it
emulator @Pixel_8_Pro_API35 -no-snapshot-load &
```

## Build + run (when resumed)

```bash
cd android
# First build triggers gradle-wrapper.jar download (~80KB):
./gradlew build

# Install + launch in emulator:
./gradlew installDebug
adb shell am start -n app.coiny.debug/app.coiny.MainActivity
```

If `./gradlew` doesn't exist yet, open the `android/` directory in Android Studio first.
It auto-generates `gradle-wrapper.jar` and `gradlew` scripts.

## Architecture

- **Kotlin + Jetpack Compose + Material 3**
- **MVVM** via `ViewModel` + `StateFlow`
- **Ktor** client for HTTP (talks to `https://coiny-backend.fly.dev`)
- **kotlinx.serialization** + **kotlinx.datetime** for JSON + dates
- **Version catalog** in `gradle/libs.versions.toml`

## File map

```
android/
├── settings.gradle.kts
├── build.gradle.kts                        # Root: plugin declarations
├── gradle.properties
├── gradle/
│   ├── libs.versions.toml                  # Dependency catalog (review me)
│   └── wrapper/gradle-wrapper.properties
└── app/
    ├── build.gradle.kts                    # App: deps + Android config
    └── src/
        ├── main/
        │   ├── AndroidManifest.xml
        │   ├── kotlin/app/coiny/
        │   │   ├── MainActivity.kt
        │   │   ├── data/                   # Api.kt, Models.kt
        │   │   ├── ui/                     # CoinyTheme.kt, RootScaffold.kt
        │   │   └── viewmodel/              # PetViewModel.kt
        │   └── res/                        # strings, themes, xml rules
        └── test/kotlin/app/coiny/data/     # (placeholder for unit tests)
```

## What's NOT yet implemented

Same surface as iOS — mirror those when resuming:

- [ ] Real screens (PetScreen, SpendingScreen, SettingsScreen — currently placeholders)
- [ ] Wire `PetViewModel` to `PetScreen` via `collectAsStateWithLifecycle()`
- [ ] Plaid Link Android SDK (`com.plaid.link:sdk-core`)
- [ ] WorkOS auth Kotlin SDK
- [ ] CoreBluetooth equivalent (BluetoothLeScanner + foreground service for background BLE)
- [ ] Firebase Cloud Messaging
- [ ] Sentry SDK + Datadog Android RUM SDK
- [ ] Onboarding flow
- [ ] Real pet sprite assets
- [ ] Wear OS companion module
- [ ] Jetpack Glance widgets

Each becomes its own PR when Android work resumes.

## Why this is paused

Both founders (Antoine + Jack) carry iPhones. Validating on iOS first means the
3-friends carry-test happens on real devices we already own. Android comes after
iOS proves the concept.
