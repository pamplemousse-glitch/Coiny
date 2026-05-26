import XCTest

/// Verifies that all three tabs exist and are reachable.
/// The --ui-testing flag bypasses Keychain sign-in so the app opens on RootView.
final class TabNavigationUITests: XCTestCase {
    private static var app: XCUIApplication!

    override class func setUp() {
        super.setUp()
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launch()
    }

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testAllThreeTabsExist() {
        let tabBar = Self.app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 10), "Tab bar should appear")
        XCTAssertTrue(tabBar.buttons["Pet"].exists)
        XCTAssertTrue(tabBar.buttons["Activity"].exists)
        XCTAssertTrue(tabBar.buttons["Wealth"].exists)
    }

    func testCanNavigateToActivityTab() {
        Self.app.tabBars.firstMatch.buttons["Activity"].tap()
        XCTAssertTrue(Self.app.navigationBars["Activity"].waitForExistence(timeout: 5))
    }

    func testCanNavigateToWealthTab() {
        Self.app.tabBars.firstMatch.buttons["Wealth"].tap()
        XCTAssertTrue(Self.app.navigationBars["Wealth"].waitForExistence(timeout: 5))
    }

    func testCanNavigateBackToPetTab() {
        Self.app.tabBars.firstMatch.buttons["Wealth"].tap()
        Self.app.tabBars.firstMatch.buttons["Pet"].tap()
        XCTAssertTrue(Self.app.navigationBars["Coiny"].waitForExistence(timeout: 5))
    }
}
