import Foundation
import LocalAuthentication
import Observation

// On-device protection for the one number the whole product is about.
//
// Two separate controls that both hang off the app lifecycle, which is why they
// live in one file:
//
//   1. The PRIVACY OVERLAY covers the screen the moment the app becomes
//      inactive, so the net worth is not baked into the app-switcher snapshot
//      iOS captures on the way out. That snapshot persists on disk and survives
//      the app being killed.
//   2. The LOCK requires Face ID, Touch ID or the device passcode before the
//      app is usable again after a real absence.
//
// The threat is the one the security audit's row 1.0.10 names and could not
// close: someone holding a STOLEN, ALREADY UNLOCKED phone. The Keychain's
// `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` and the cache's
// `.completeFileProtection` both protect data at rest behind the device
// passcode, and neither does anything once the device is unlocked and Coiny is
// on screen. This is the layer for that case.

/// Whether the app is currently demanding authentication.
enum AppLockState: Equatable, Sendable {
    /// Usable.
    case unlocked
    /// Waiting for the user to authenticate.
    case locked
    /// A prompt is on screen. Distinct from `locked` so the lifecycle cannot
    /// stack a second prompt on top of the first, which iOS rejects and which
    /// reads to the user as the lock silently failing.
    case authenticating
}

/// Reasons the lock can be unavailable, kept apart because they need different
/// answers rather than one shared error screen.
enum AppLockAvailability: Equatable, Sendable {
    case available
    /// Biometrics or a passcode exist but this device has neither enrolled.
    case noAuthenticationConfigured
    /// The policy cannot be evaluated at all.
    case unavailable
}

/// The lock's own settings and clock, separated from the SwiftUI layer so the
/// timing rules are testable without a running scene.
/// `@Observable` so the SwiftUI layer re-renders when `state` moves. The rest
/// of the app uses the same macro (no `ObservableObject` anywhere), so this
/// matches rather than introduces a second pattern.
@MainActor
@Observable
final class AppLock {
    /// "Require Face ID" in Settings. **Absent means ON.**
    ///
    /// Default-on is a deliberate choice: an app-lock that ships off protects
    /// approximately nobody, because almost no one goes looking for the setting.
    /// It is also what Google Play requires for financial data at Android
    /// parity (prd.md open decision B11), so shipping it on front-runs that.
    static let enabledKey = "appLockEnabled"

    /// Grace period before a backgrounded app re-locks.
    ///
    /// Five minutes rather than zero, and this is the difference between a lock
    /// people keep and one they switch off in a week. Locking on EVERY
    /// backgrounding means a glance at Control Centre, a copied 2FA code, or a
    /// tapped notification all demand Face ID. The window is short enough that
    /// a phone taken from a table is locked before anyone has walked anywhere
    /// with it.
    static let graceInterval: TimeInterval = 5 * 60

    private(set) var state: AppLockState
    private var backgroundedAt: Date?

    private let defaults: UserDefaults
    private let now: () -> Date
    private let context: () -> LAContextProtocol

    init(
        defaults: UserDefaults = .standard,
        now: @escaping () -> Date = Date.init,
        context: @escaping () -> LAContextProtocol = { LAContext() }
    ) {
        self.defaults = defaults
        self.now = now
        self.context = context
        // A cold launch is always past any grace period, so an enabled lock
        // starts locked. Starting unlocked would mean the strictest case, a
        // phone that was powered off and taken, is the one case that walks
        // straight in.
        state = Self.isEnabled(defaults: defaults) ? .locked : .unlocked
    }

    static func isEnabled(defaults: UserDefaults = .standard) -> Bool {
        defaults.object(forKey: enabledKey) as? Bool ?? true
    }

    var isEnabled: Bool { Self.isEnabled(defaults: defaults) }

    /// Whether this device can satisfy the lock at all.
    ///
    /// `.deviceOwnerAuthentication` (not `...WithBiometrics`) so a device with
    /// no Face ID enrolment, or one whose biometrics are locked out after too
    /// many failures, falls through to the passcode instead of being refused.
    /// Refusing would leave the user unable to reach their own data, which the
    /// cache already holds on-device and which no network round trip can
    /// recover.
    func availability() -> AppLockAvailability {
        var error: NSError?
        let ctx = context()
        if ctx.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) { return .available }
        if let code = error.map({ LAError.Code(rawValue: $0.code) }) ?? nil,
           code == .passcodeNotSet || code == .biometryNotEnrolled {
            return .noAuthenticationConfigured
        }
        return .unavailable
    }

    // MARK: - Lifecycle

    /// The app left the foreground. Stamps the clock; does not lock yet.
    func didEnterBackground() {
        guard isEnabled else { return }
        // Do not overwrite an existing stamp. `.inactive` then `.background`
        // both route here on some paths, and restamping would keep pushing the
        // deadline out for an app that never came back to the foreground.
        if backgroundedAt == nil { backgroundedAt = now() }
    }

    /// The app returned. Locks only if it was away longer than the grace period.
    func willEnterForeground() {
        guard isEnabled else {
            state = .unlocked
            return
        }
        defer { backgroundedAt = nil }
        guard let left = backgroundedAt else { return }
        if now().timeIntervalSince(left) >= Self.graceInterval {
            state = .locked
        }
    }

    /// Turning the setting off unlocks immediately; turning it on does NOT lock
    /// the user out of the screen they are already looking at.
    func settingChanged(to enabled: Bool) {
        defaults.set(enabled, forKey: Self.enabledKey)
        if !enabled { state = .unlocked }
    }

    // MARK: - Authentication

    /// Prompt, and unlock on success.
    ///
    /// A failed or cancelled attempt leaves the app LOCKED rather than
    /// surfacing an error and moving on. That is the whole point: the failure
    /// path of an authentication control must not be a way past it.
    func authenticate(reason: String = "Unlock Coiny to see your net worth") async {
        guard state != .authenticating else { return }
        guard isEnabled else {
            state = .unlocked
            return
        }
        // A device with nothing enrolled cannot satisfy the prompt. Locking it
        // out forever would be worse than not locking: the data is already on
        // this device and the user has no other route to it.
        if availability() == .noAuthenticationConfigured {
            state = .unlocked
            return
        }

        state = .authenticating
        let ctx = context()
        let ok = await ctx.evaluate(policy: .deviceOwnerAuthentication, reason: reason)
        state = ok ? .unlocked : .locked
    }
}

// MARK: - Test seam

/// The slice of `LAContext` this uses, so the timing and failure rules can be
/// tested without a biometric prompt. There is no simulator affordance for
/// "the user cancelled", and that is the branch that most needs a test.
@MainActor
protocol LAContextProtocol {
    func canEvaluatePolicy(_ policy: LAPolicy, error: NSErrorPointer) -> Bool
    func evaluate(policy: LAPolicy, reason: String) async -> Bool
}

extension LAContext: LAContextProtocol {
    func evaluate(policy: LAPolicy, reason: String) async -> Bool {
        (try? await evaluatePolicy(policy, localizedReason: reason)) ?? false
    }
}
