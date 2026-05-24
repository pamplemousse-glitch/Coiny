import XCTest

/// Programmatically navigates every tab in RootView and asserts it renders
/// without crashing. Uses the --ui-testing launch argument so CoinyApp skips
/// Sign In and Onboarding and goes straight to RootView.
///
/// If the local backend (127.0.0.1:3000) is reachable, injectDebugSession()
/// succeeds and the pet data loads. If not (e.g. CI without a backend), the
/// session injection fails silently and each tab shows its empty/error state —
/// the test still passes because we're asserting structure, not data.
final class TabNavigationTests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Tab bar presence

    func testTabBarAppearsOnLaunch() throws {
        XCTAssertTrue(
            app.tabBars.firstMatch.waitForExistence(timeout: 15),
            "RootView tab bar must appear within 15s when launched with --ui-testing"
        )
    }

    func testAllSixTabButtonsExist() throws {
        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 15))

        for label in ["Pet", "Activity", "Wealth", "Crypto", "Debt", "Settings"] {
            XCTAssertTrue(
                tabBar.buttons[label].exists,
                "\(label) tab button must exist in the tab bar"
            )
        }
    }

    // MARK: - Per-tab navigation

    func testPetTabRendersWithoutCrash() throws {
        XCTAssertTrue(app.tabBars.firstMatch.waitForExistence(timeout: 15))

        // Pet is the default tab — no tap needed.
        // The navigation title "Coiny" must be visible (loaded or error state).
        XCTAssertTrue(
            app.navigationBars["Coiny"].waitForExistence(timeout: 10),
            "Pet tab navigation bar must show 'Coiny'"
        )
    }

    func testActivityTabRendersWithoutCrash() throws {
        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 15))

        tabBar.buttons["Activity"].tap()
        XCTAssertTrue(
            app.navigationBars["Activity"].waitForExistence(timeout: 8),
            "Activity tab navigation bar must show 'Activity'"
        )
    }

    func testWealthTabRendersWithoutCrash() throws {
        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 15))

        tabBar.buttons["Wealth"].tap()
        XCTAssertTrue(
            app.navigationBars["Wealth"].waitForExistence(timeout: 8),
            "Wealth tab navigation bar must show 'Wealth'"
        )
    }

    func testCryptoTabRendersWithoutCrash() throws {
        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 15))

        tabBar.buttons["Crypto"].tap()
        XCTAssertTrue(
            app.navigationBars["Crypto"].waitForExistence(timeout: 8),
            "Crypto tab navigation bar must show 'Crypto'"
        )
    }

    func testDebtTabRendersWithoutCrash() throws {
        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 15))

        tabBar.buttons["Debt"].tap()
        XCTAssertTrue(
            app.navigationBars["Debt Tracker"].waitForExistence(timeout: 8),
            "Debt tab navigation bar must show 'Debt Tracker'"
        )
    }

    func testSettingsTabRendersWithoutCrash() throws {
        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 15))

        tabBar.buttons["Settings"].tap()
        XCTAssertTrue(
            app.navigationBars["Settings"].waitForExistence(timeout: 8),
            "Settings tab navigation bar must show 'Settings'"
        )
    }

    // MARK: - Sequential full sweep

    func testNavigateThroughAllTabsInOrder() throws {
        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 15))

        let sequence: [(tab: String, navTitle: String)] = [
            ("Pet",      "Coiny"),
            ("Activity", "Activity"),
            ("Wealth",   "Wealth"),
            ("Crypto",   "Crypto"),
            ("Debt",     "Debt Tracker"),
            ("Settings", "Settings"),
        ]

        for (tab, navTitle) in sequence {
            tabBar.buttons[tab].tap()
            XCTAssertTrue(
                app.navigationBars[navTitle].waitForExistence(timeout: 8),
                "After tapping \(tab) tab, navigation bar '\(navTitle)' must appear"
            )
        }
    }
}
