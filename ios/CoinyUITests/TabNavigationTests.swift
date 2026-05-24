import XCTest

/// Drives every tab in RootView and asserts it renders without crashing.
///
/// Key design:
/// - App is launched ONCE for the whole class (override class setUp), not once per
///   test. Relaunching 9 times in rapid succession with async tasks in flight is
///   what caused "LLDB RPC Server has exited" in the previous design.
/// - Uses the --ui-testing launch argument so CoinyApp skips Sign In/Onboarding.
/// - Session injection is best-effort: tests pass with or without a local backend.
final class TabNavigationTests: XCTestCase {

    private static var app: XCUIApplication!

    // MARK: - Class-level setup (launch once)

    override class func setUp() {
        super.setUp()
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launch()
        // Wait for the tab bar to stabilise before any test runs.
        _ = app.tabBars.firstMatch.waitForExistence(timeout: 20)
    }

    override class func tearDown() {
        app.terminate()
        app = nil
        super.tearDown()
    }

    // Per-test: navigate back to Pet tab so each test starts from a known state.
    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        Self.app.tabBars.firstMatch.buttons["Pet"].tap()
        _ = Self.app.navigationBars["Coiny"].waitForExistence(timeout: 5)
    }

    private var app: XCUIApplication { Self.app }

    // MARK: - Tab bar presence

    func testTabBarAppearsOnLaunch() {
        XCTAssertTrue(
            app.tabBars.firstMatch.exists,
            "RootView tab bar must exist"
        )
    }

    func testAllSixTabButtonsExist() {
        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.exists)
        for label in ["Pet", "Activity", "Wealth", "Crypto", "Debt", "Settings"] {
            XCTAssertTrue(
                tabBar.buttons[label].exists,
                "\(label) tab button must exist"
            )
        }
    }

    // MARK: - Per-tab rendering

    func testPetTabRendersWithoutCrash() {
        // Pet is already selected in setUp — just assert the nav title.
        XCTAssertTrue(
            app.navigationBars["Coiny"].waitForExistence(timeout: 8),
            "Pet tab navigation bar must show 'Coiny'"
        )
    }

    func testActivityTabRendersWithoutCrash() {
        app.tabBars.firstMatch.buttons["Activity"].tap()
        XCTAssertTrue(
            app.navigationBars["Activity"].waitForExistence(timeout: 8),
            "Activity tab navigation bar must show 'Activity'"
        )
    }

    func testWealthTabRendersWithoutCrash() {
        app.tabBars.firstMatch.buttons["Wealth"].tap()
        XCTAssertTrue(
            app.navigationBars["Wealth"].waitForExistence(timeout: 8),
            "Wealth tab navigation bar must show 'Wealth'"
        )
    }

    func testCryptoTabRendersWithoutCrash() {
        app.tabBars.firstMatch.buttons["Crypto"].tap()
        XCTAssertTrue(
            app.navigationBars["Crypto"].waitForExistence(timeout: 8),
            "Crypto tab navigation bar must show 'Crypto'"
        )
    }

    func testDebtTabRendersWithoutCrash() {
        app.tabBars.firstMatch.buttons["Debt"].tap()
        XCTAssertTrue(
            app.navigationBars["Debt Tracker"].waitForExistence(timeout: 8),
            "Debt tab navigation bar must show 'Debt Tracker'"
        )
    }

    func testSettingsTabRendersWithoutCrash() {
        app.tabBars.firstMatch.buttons["Settings"].tap()
        XCTAssertTrue(
            app.navigationBars["Settings"].waitForExistence(timeout: 8),
            "Settings tab navigation bar must show 'Settings'"
        )
    }

    // MARK: - Sequential full sweep

    func testNavigateThroughAllTabsInOrder() {
        let sequence: [(tab: String, navTitle: String)] = [
            ("Pet",      "Coiny"),
            ("Activity", "Activity"),
            ("Wealth",   "Wealth"),
            ("Crypto",   "Crypto"),
            ("Debt",     "Debt Tracker"),
            ("Settings", "Settings"),
        ]
        for (tab, navTitle) in sequence {
            app.tabBars.firstMatch.buttons[tab].tap()
            XCTAssertTrue(
                app.navigationBars[navTitle].waitForExistence(timeout: 8),
                "After tapping \(tab), navigation bar '\(navTitle)' must appear"
            )
        }
    }
}
