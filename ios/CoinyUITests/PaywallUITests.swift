import XCTest

/// The paywall had no automated coverage of any kind until 2026-08-16.
///
/// It is two levels deep (Settings, then View plans) and sits behind controls
/// the exploratory crawl skips as destructive, so nothing reached it. The first
/// audit that ever ran against it found four contrast failures in its body text
/// and two Apple-required legal links with 15.7pt hit areas.
///
/// This is the screen that asks for money and carries the Terms and privacy
/// links App Review 3.1.2 requires. It gets its own test.
/// See `ActivityTabUITests` for why this is `@MainActor` and why the lifecycle
/// hook opts in with `MainActor.assumeIsolated` rather than inheriting it.
@MainActor
final class PaywallUITests: XCTestCase {
    private var app: XCUIApplication!

    // `setUp() async throws` rather than `setUpWithError()`: the async variant
    // inherits the class's `@MainActor` isolation, where a `setUpWithError()`
    // override stays nonisolated and would have to send `self` into an
    // `assumeIsolated` block to touch `app`. Safe to convert here because this
    // class has exactly one setup hook, so there is no second hook whose
    // relative order could change (unlike JourneyUITests and HomeTabUITests).
    override func setUp() async throws {
        try await super.setUp()
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launch()
        XCTAssertTrue(app.tabBars.firstMatch.waitForExistence(timeout: 20))

        app.buttons["Settings"].tap()
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 10))
        let viewPlans = app.buttons["View plans"]
        XCTAssertTrue(viewPlans.waitForExistence(timeout: 10), "Settings no longer offers a route to the paywall")
        viewPlans.tap()
        // Let the local StoreKit configuration resolve its products.
        _ = app.buttons["Subscribe"].waitForExistence(timeout: 15)
    }

    func testPaywallPassesTheAccessibilityAudit() throws {
        try auditAccessibility(app)
    }

    func testShowsBothPlans() {
        XCTAssertTrue(app.staticTexts["Coiny Individual"].exists)
        XCTAssertTrue(app.staticTexts["Coiny Household"].exists)
    }

    func testCarriesTheLegallyRequiredLinks() {
        // Apple requires functional Terms and privacy links on the screen that
        // sells an auto-renewable subscription, not merely somewhere in the
        // binary. If either disappears the build is not submittable, so this
        // asserts their presence rather than the layout around them.
        XCTAssertTrue(app.buttons["Terms of Use"].exists)
        XCTAssertTrue(app.buttons["Privacy Policy"].exists)
    }

    func testLegalLinksAreActuallyTappable() {
        // They were not. `frame(minHeight: 44)` grew the layout and left the
        // hit area at the label's 15.7pt, which is the defect this guards.
        for title in ["Terms of Use", "Privacy Policy"] {
            let link = app.buttons[title]
            XCTAssertGreaterThanOrEqual(
                link.frame.height, 44,
                "\(title) hit area is \(link.frame.height)pt, below the 44pt minimum"
            )
        }
    }
}
