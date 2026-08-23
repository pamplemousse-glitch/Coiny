import SwiftUI

/// What covers the app while it is locked.
///
/// Deliberately says nothing about the account: no balance, no net worth, no
/// name. A lock screen that leaks the number it is protecting is decorative,
/// and this one is reachable by anyone holding the phone.
struct AppLockScreen: View {
    let state: AppLockState
    let availability: AppLockAvailability
    let unlock: () async -> Void

    var body: some View {
        ZStack {
            CoinyTheme.screen.ignoresSafeArea()

            VStack(spacing: 24) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 44, weight: .light))
                    .foregroundStyle(CoinyTheme.ink2)
                    // Decorative: the heading below carries the meaning, and
                    // VoiceOver reading "lock" twice is noise.
                    .accessibilityHidden(true)

                VStack(spacing: 8) {
                    Text("Coiny is locked")
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(CoinyTheme.ink)
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(CoinyTheme.ink2)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.horizontal, 32)

                if state != .authenticating {
                    Button("Unlock") {
                        Task { await unlock() }
                    }
                    .buttonStyle(.coinyFilled)
                    .accessibilityIdentifier("applock.unlock")
                } else {
                    // Says what is in progress. A bare spinner announces
                    // "in progress" with no subject (audit row 6.1.13).
                    ProgressView()
                        .frame(height: 50)
                        .accessibilityLabel("Waiting for authentication")
                }
            }
        }
        .accessibilityIdentifier("applock.screen")
    }

    private var subtitle: String {
        switch availability {
        case .available:
            return String(
                localized: "appLock.subtitle.available",
                defaultValue: "Use Face ID, Touch ID or your passcode to continue.",
                comment: "Shown on the lock screen when authentication is possible."
            )
        case .noAuthenticationConfigured:
            return String(
                localized: "appLock.subtitle.notConfigured",
                defaultValue: "Set a passcode on this iPhone to lock Coiny.",
                comment: "Shown when the device has neither biometrics nor a passcode enrolled."
            )
        case .unavailable:
            return String(
                localized: "appLock.subtitle.unavailable",
                defaultValue: "Authentication is unavailable on this device right now.",
                comment: "Shown when the authentication policy cannot be evaluated at all."
            )
        }
    }
}

/// Covers the window while the app is inactive, so the net worth is not written
/// into the app-switcher snapshot.
///
/// iOS captures that image on the way out and keeps it ON DISK, where it
/// survives the app being killed and is visible to anyone who opens the app
/// switcher. Every balance the app was showing goes with it.
///
/// `.inactive` rather than `.background` is the load-bearing detail: the
/// snapshot is taken during the inactive transition, so covering only at
/// `.background` covers the screen after the picture has already been taken.
struct PrivacyOverlay: View {
    var body: some View {
        ZStack {
            CoinyTheme.screen.ignoresSafeArea()
            Image(systemName: "circle.hexagongrid.fill")
                .font(.system(size: 52, weight: .light))
                .foregroundStyle(CoinyTheme.signal)
                .accessibilityHidden(true)
        }
        // Hidden from assistive technology as well as from the snapshot: this
        // is a curtain, not content, and VoiceOver should not land on it.
        .accessibilityHidden(true)
        .transition(.opacity)
    }
}

// MARK: - Environment

/// Lets `SettingsView` reach the live lock without threading it through every
/// view between here and there. Optional because previews and unit tests render
/// the settings screen without constructing one.
private struct AppLockKey: EnvironmentKey {
    static let defaultValue: AppLock? = nil
}

extension EnvironmentValues {
    var appLock: AppLock? {
        get { self[AppLockKey.self] }
        set { self[AppLockKey.self] = newValue }
    }
}
