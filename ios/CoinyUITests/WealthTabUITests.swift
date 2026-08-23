import XCTest

/// Tests for the Wealth tab (NetWorthView).
/// See `ActivityTabUITests` for why this is `@MainActor` and why the lifecycle
/// hook opts in with `MainActor.assumeIsolated` rather than inheriting it.
@MainActor
final class WealthTabUITests: XCTestCase {
    private static var app: XCUIApplication!

    override class func setUp() {
        super.setUp()
        MainActor.assumeIsolated {
            app = XCUIApplication()
            app.launchArguments = ["--ui-testing"]
            app.launch()
            Self.app.tabBars.firstMatch.buttons["Wealth"].tap()
        }
    }

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testWealthTabPassesTheAccessibilityAudit() throws {
        try auditAccessibility(Self.app)
    }

    func testWealthTabShowsNavigationTitle() {
        XCTAssertTrue(Self.app.navigationBars["Wealth"].waitForExistence(timeout: 10))
    }

    func testWealthTabRendersContentArea() {
        XCTAssertTrue(Self.app.navigationBars["Wealth"].waitForExistence(timeout: 10))
        // Net worth either shows a loading spinner, an error, or the loaded scroll view.
        let hasProgress = Self.app.activityIndicators.firstMatch.exists
        // The failure state is a CoinyErrorLine now, not a
        // ContentUnavailableView titled "Couldn't load"; the retry is the part
        // that has to be there, so assert on that rather than on copy.
        let hasError = Self.app.buttons["Try again"].exists
        let hasScrollView = Self.app.scrollViews.firstMatch.exists
        XCTAssertTrue(hasProgress || hasError || hasScrollView, "Wealth tab should render content")
    }
}
