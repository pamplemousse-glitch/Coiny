import XCTest

/// Tests for the Activity tab (SpendingView).
/// `@MainActor` because every `XCUIElement` member is main-actor isolated in the
/// iOS 26 SDK, so without it each `app.buttons[...]` in this file is a strict
/// concurrency violation. Applied to the class so the test methods inherit it.
///
/// The lifecycle hooks below cannot inherit it: `XCTestCase` declares `setUp()`
/// nonisolated and an override may not add isolation. They opt in with
/// `MainActor.assumeIsolated`, which is an assertion rather than a hope, because
/// XCUITest runs its hooks on the main thread. If that were ever false this
/// traps loudly instead of racing quietly.
@MainActor
final class ActivityTabUITests: XCTestCase {
    private static var app: XCUIApplication!

    override class func setUp() {
        super.setUp()
        MainActor.assumeIsolated {
            app = XCUIApplication()
            app.launchArguments = ["--ui-testing"]
            app.launch()
            Self.app.tabBars.firstMatch.buttons["Activity"].tap()
        }
    }

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testActivityTabShowsNavigationTitle() {
        XCTAssertTrue(Self.app.navigationBars["Activity"].waitForExistence(timeout: 10))
    }

    func testActivityTabRendersContentArea() {
        XCTAssertTrue(Self.app.navigationBars["Activity"].waitForExistence(timeout: 10))
        // Either shows an empty-state message, a loading indicator, or reaction rows.
        let hasEmptyState = Self.app.staticTexts["No reactions yet"].exists
        let hasProgress = Self.app.activityIndicators.firstMatch.exists
        let hasContent = Self.app.collectionViews.firstMatch.exists || Self.app.tables.firstMatch.exists
        XCTAssertTrue(hasEmptyState || hasProgress || hasContent, "Activity tab should render content")
    }

    func testActivityTabPassesTheAccessibilityAudit() throws {
        try auditAccessibility(Self.app)
    }
}
