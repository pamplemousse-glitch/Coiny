import XCTest

/// Tests for the expanded journey's goals, guardrails, and rung-skip flow
/// (R-7.4, R-7.7 to R-7.12). Under `--ui-testing` the app serves deterministic
/// fixtures: two goals (one paced, one dateless with a null pace) and all
/// seven guardrails, with skip state shared between the journey and pet APIs.
/// See `ActivityTabUITests` for why this is `@MainActor` and why the lifecycle
/// hooks opt in with `MainActor.assumeIsolated` rather than inheriting it.
///
/// Both hooks are kept as they were, in the same relative order. Converting
/// `setUpWithError()` into `setUp() async throws`, which is the usual Swift 6
/// migration, would put two setup methods in this class with a different
/// ordering than they have now, and the second one exists precisely to stop
/// state leaking between tests.
@MainActor
final class JourneyUITests: XCTestCase {
    private static var app: XCUIApplication!

    override class func setUp() {
        super.setUp()
        MainActor.assumeIsolated {
            app = XCUIApplication()
            app.launchArguments = ["--ui-testing"]
            app.launch()
            Self.app.tabBars.firstMatch.buttons["Home"].tap()
        }
    }

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    /// Collapse before each test so ordering never leaks between tests.
    override func setUp() {
        super.setUp()
        MainActor.assumeIsolated {
            let tabBar = Self.app.tabBars.firstMatch
            tabBar.buttons["Wealth"].tap()
            tabBar.buttons["Home"].tap()
        }
    }

    private var window: XCUIElement {
        Self.app.descendants(matching: .any)["home.window"]
    }

    private var journey: XCUIElement {
        Self.app.descendants(matching: .any)["home.journey"]
    }

    private func expand() {
        XCTAssertTrue(window.waitForExistence(timeout: 10))
        window.tap()
        XCTAssertTrue(journey.waitForExistence(timeout: 5))
    }

    /// Swipes the journey until `element` is hittable (rows below the fold in
    /// the non-lazy VStack exist immediately but cannot be tapped until
    /// scrolled on screen).
    private func scrollTo(_ element: XCUIElement, maxSwipes: Int = 5) {
        var swipes = 0
        while !element.isHittable, swipes < maxSwipes {
            journey.swipeUp()
            swipes += 1
        }
    }

    /// Every audit type but Dynamic Type. The expanded journey reports every
    /// rung name as only partially supporting it, one row at a time, and the
    /// fix is a layout pass over the whole ladder rather than a modifier:
    /// accessibility rows 6.2.4 and 6.2.7 own it. The other five screens run
    /// the full audit including Dynamic Type, so this is the one known gap and
    /// it is written down rather than silently absent. Delete this argument
    /// when the ladder handles the accessibility sizes.
    func testExpandedJourneyPassesTheAccessibilityAudit() throws {
        expand()
        try auditAccessibility(Self.app, types: XCUIAccessibilityAuditType.all.subtracting(.dynamicType))
    }

    func testExpandedJourneyShowsGoalsWithHonestNullPace() {
        expand()

        XCTAssertTrue(Self.app.staticTexts["GOALS"].waitForExistence(timeout: 5))

        let japan = Self.app.buttons["journey.goal.1"]
        XCTAssertTrue(japan.waitForExistence(timeout: 5))
        XCTAssertTrue(japan.label.contains("Japan in March"))
        XCTAssertTrue(japan.label.contains("On pace"))
        XCTAssertTrue(japan.label.contains("31%"))

        // The dateless goal's null pace reads as the dateless line, and is
        // never rendered as a band and never as zero (R-7.8).
        let rainy = Self.app.buttons["journey.goal.2"]
        XCTAssertTrue(rainy.exists)
        XCTAssertTrue(rainy.label.contains("No date set. Contributions will show here as they arrive."))
        XCTAssertFalse(rainy.label.contains("Off pace"))
        XCTAssertFalse(rainy.label.contains("0%"))

        XCTAssertTrue(Self.app.buttons["journey.goals.add"].exists)
    }

    func testGoalEditorOpensFromAddButton() {
        expand()

        let add = Self.app.buttons["journey.goals.add"]
        XCTAssertTrue(add.waitForExistence(timeout: 5))
        scrollTo(add)
        add.tap()

        XCTAssertTrue(Self.app.navigationBars["New goal"].waitForExistence(timeout: 5))
        // Save is disabled until the draft is valid.
        let save = Self.app.buttons["goal.editor.save"]
        XCTAssertTrue(save.exists)
        XCTAssertFalse(save.isEnabled)
        Self.app.buttons["Cancel"].tap()
    }

    func testExpandedJourneyShowsGuardrailsWithReasons() {
        expand()

        XCTAssertTrue(Self.app.staticTexts["GUARDRAILS"].waitForExistence(timeout: 5))

        let rows = Self.app.descendants(matching: .any)
        XCTAssertTrue(rows["journey.guardrail.savings_rate_floor"].exists)

        // Streaks are weekly or monthly, never daily (R-7.12), with tokens on
        // display.
        let streakRow = rows["journey.guardrail.contribution_streak"]
        XCTAssertTrue(streakRow.exists)
        XCTAssertTrue(streakRow.label.contains("5 weeks running"))
        XCTAssertTrue(streakRow.label.contains("2 repair tokens banked"))
        XCTAssertFalse(streakRow.label.contains("days running"))

        // The two sourceless guardrails render their reason, never a failure.
        let utilization = rows["journey.guardrail.utilization_before_close"]
        XCTAssertTrue(utilization.exists)
        XCTAssertTrue(utilization.label.contains("Not measurable yet."))

        // A missed period resets the counter and says only that.
        let missed = rows["journey.guardrail.no_new_recurring"]
        XCTAssertTrue(missed.label.contains("Missed last month. The counter reset, nothing else."))
    }

    /// R-7.4 end to end: skip a rung with a stated reason via the context
    /// menu, see the skip and its reason on the row, then take it back.
    func testSkipRungWithReasonAndReverse() {
        expand()

        let sheltered = Self.app.staticTexts["Sheltered"]
        XCTAssertTrue(sheltered.waitForExistence(timeout: 5))
        sheltered.press(forDuration: 1.2)

        let reasonButton = Self.app.buttons["Not relevant to me"]
        XCTAssertTrue(reasonButton.waitForExistence(timeout: 5))
        reasonButton.tap()

        // The stated reason renders on the row, with the way back beside it.
        XCTAssertTrue(Self.app.staticTexts["Not relevant to me."].waitForExistence(timeout: 5))
        XCTAssertTrue(Self.app.staticTexts["skipped"].exists)

        let takeBack = Self.app.buttons["journey.rung.5.unskip"]
        XCTAssertTrue(takeBack.waitForExistence(timeout: 5))
        takeBack.tap()

        // The row returns to its quiet pending state.
        let gone = NSPredicate(format: "exists == false")
        expectation(for: gone, evaluatedWith: Self.app.staticTexts["skipped"])
        waitForExpectations(timeout: 5)
    }
}
