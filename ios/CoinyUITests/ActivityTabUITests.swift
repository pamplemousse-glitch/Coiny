import XCTest

/// Tests for the Activity tab (SpendingView).
final class ActivityTabUITests: XCTestCase {
    private static var app: XCUIApplication!

    override class func setUp() {
        super.setUp()
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launch()
        Self.app.tabBars.firstMatch.buttons["Activity"].tap()
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
}
