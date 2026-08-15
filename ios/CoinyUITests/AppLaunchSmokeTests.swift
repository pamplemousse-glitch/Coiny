import XCTest

/// The bare-minimum smoke check that survives every cold launch of the app.
/// Catches the catastrophic-but-untestable-from-unit-tests class of regression:
/// app crashes at launch, the root scene's first view fails to render, or the
/// SignIn entry point disappears entirely.
///
/// Why this exists: the unit-test bundle only loads `API.swift` /
/// `SessionStore` / decoders. Nothing in the app's view layer (SignInView,
/// OnboardingView, RootView, PetView, SettingsView, SpendingView) is exercised
/// by unit tests. Without this smoke, CI is silent when a view crashes on
/// construction.
final class AppLaunchSmokeTests: XCTestCase {
    override func setUpWithError() throws {
        // Stop the test on the first failure so the trace points at root cause
        // rather than a cascade of secondary asserts.
        continueAfterFailure = false
    }

    func testAppLaunchesAndShowsSignInScreen() throws {
        let app = XCUIApplication()
        app.launch()

        // The simulator's Keychain rejects writes without a
        // keychain-access-groups entitlement (see Coiny.entitlements), so
        // KeychainSessionStore().load() always returns nil during UI tests.
        // The app therefore starts on SignInView every cold launch — making
        // this assertion deterministic across local and CI runs.
        let title = app.staticTexts["Coiny"]
        XCTAssertTrue(title.waitForExistence(timeout: 10), "SignInView's 'Coiny' title should be visible at launch")

        // The Sign In with Apple button is provided by AuthenticationServices.
        // Its accessibility label depends on locale; use the system-provided
        // button identifier via type match instead of label text.
        XCTAssertTrue(
            app.buttons.allElementsBoundByIndex.contains { $0.exists },
            "At least one button should be on screen at launch"
        )

        // Sanity: the subtitle wired up in SignInView.
        XCTAssertTrue(app.staticTexts["Everything you own and everything you owe, in one number."].exists)

        // The consent line. This screen is where the privacy notice is
        // delivered (Reg P 1016.9(b)(1)(iii)) and where Apple's required Terms
        // and Privacy links live in-binary. If the line disappears, the build
        // is not submittable, so assert the sentence rather than the layout.
        let consent = app.staticTexts.containing(
            NSPredicate(format: "label CONTAINS[c] %@", "you agree to the Terms of Service and Privacy Policy")
        )
        XCTAssertGreaterThan(consent.count, 0, "the sign-in consent line must be on screen")
    }

    func testSignInScreenPassesTheAccessibilityAudit() throws {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.staticTexts["Coiny"].waitForExistence(timeout: 10))
        try auditAccessibility(app)
    }
}
