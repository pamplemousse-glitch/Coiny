import XCTest

/// Tests for the Home tab: the creature-and-journey surface (DR-27, R-4.1a).
/// Under `--ui-testing` the app serves a deterministic pet fixture (rung 4
/// active, rungs 0 to 3 done), so these assertions do not depend on a backend.
final class HomeTabUITests: XCTestCase {
    private static var app: XCUIApplication!

    override class func setUp() {
        super.setUp()
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launch()
        Self.app.tabBars.firstMatch.buttons["Home"].tap()
    }

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    /// Collapse before each test so ordering never leaks between tests.
    override func setUp() {
        super.setUp()
        let tabBar = Self.app.tabBars.firstMatch
        tabBar.buttons["Wealth"].tap()
        tabBar.buttons["Home"].tap()
    }

    private var window: XCUIElement {
        Self.app.descendants(matching: .any)["home.window"]
    }

    private var journey: XCUIElement {
        Self.app.descendants(matching: .any)["home.journey"]
    }

    func testHomeTabPassesTheAccessibilityAudit() throws {
        XCTAssertTrue(window.waitForExistence(timeout: 10))
        try auditAccessibility(Self.app)
    }

    func testCollapsedShowsWindowAndActiveRung() {
        XCTAssertTrue(window.waitForExistence(timeout: 10))
        XCTAssertTrue(Self.app.descendants(matching: .any)["home.rung.active"].exists)
        XCTAssertFalse(journey.exists, "Journey must not be visible while collapsed")
    }

    func testSettingsButtonExistsAndSheetPresents() {
        XCTAssertTrue(window.waitForExistence(timeout: 10))
        XCTAssertTrue(Self.app.buttons["Settings"].exists)
        Self.app.buttons["Settings"].tap()
        XCTAssertTrue(Self.app.navigationBars["Settings"].waitForExistence(timeout: 5))
        if Self.app.buttons["Done"].exists {
            Self.app.buttons["Done"].tap()
        } else {
            Self.app.swipeDown()
        }
    }

    /// R-4.1a verify: tap the creature, the ladder is on screen, the creature
    /// is still on screen, and no navigation push happened.
    func testTappingCreatureExpandsJourneyInPlace() {
        XCTAssertTrue(window.waitForExistence(timeout: 10))
        let navBarsBefore = Self.app.navigationBars.count

        window.tap()

        XCTAssertTrue(journey.waitForExistence(timeout: 5), "Ladder should be on screen after expansion")
        XCTAssertTrue(window.exists, "Creature should still be on screen, pinned as the Panel")
        XCTAssertTrue(Self.app.staticTexts["The Climb"].exists)
        // The expansion is a state change, not a push: same navigation depth.
        XCTAssertEqual(Self.app.navigationBars.count, navBarsBefore)
    }

    func testExpandedJourneyListsRungsWithStates() {
        XCTAssertTrue(window.waitForExistence(timeout: 10))
        window.tap()
        XCTAssertTrue(journey.waitForExistence(timeout: 5))
        // Fixture: rungs 0 to 3 done, rung 4 active.
        XCTAssertTrue(Self.app.staticTexts["Sighted"].exists)
        XCTAssertTrue(Self.app.staticTexts["Buffer"].exists)
        XCTAssertTrue(Self.app.staticTexts["ACTIVE"].exists)
        XCTAssertTrue(Self.app.staticTexts["Freedom"].exists)
    }

    func testTappingPanelCollapsesAgain() {
        XCTAssertTrue(window.waitForExistence(timeout: 10))
        window.tap()
        XCTAssertTrue(journey.waitForExistence(timeout: 5))

        window.tap()
        XCTAssertTrue(
            Self.app.descendants(matching: .any)["home.rung.active"].waitForExistence(timeout: 5),
            "Collapsed rung block should return"
        )
        XCTAssertFalse(journey.exists)
    }

    /// R-4.1a: tab switch returns to collapsed.
    func testTabSwitchResetsToCollapsed() {
        XCTAssertTrue(window.waitForExistence(timeout: 10))
        window.tap()
        XCTAssertTrue(journey.waitForExistence(timeout: 5))

        let tabBar = Self.app.tabBars.firstMatch
        tabBar.buttons["Wealth"].tap()
        tabBar.buttons["Home"].tap()

        XCTAssertTrue(window.waitForExistence(timeout: 5))
        XCTAssertFalse(journey.exists, "Returning to Home should land on the collapsed state")
    }
}
