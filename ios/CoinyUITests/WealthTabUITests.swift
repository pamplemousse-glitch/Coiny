import XCTest

/// Tests for the Wealth tab (NetWorthView).
final class WealthTabUITests: XCTestCase {
    private static var app: XCUIApplication!

    override class func setUp() {
        super.setUp()
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launch()
        Self.app.tabBars.firstMatch.buttons["Wealth"].tap()
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
        let hasError = Self.app.staticTexts["Couldn't load"].exists
        let hasScrollView = Self.app.scrollViews.firstMatch.exists
        XCTAssertTrue(hasProgress || hasError || hasScrollView, "Wealth tab should render content")
    }
}
