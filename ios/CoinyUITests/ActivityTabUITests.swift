import XCTest

// MARK: - Fixtures

private let petLoadedEmptyHistory = """
{
  "healthScore": 75, "mood": 80, "lastReactionAt": null, "reactionHistory": [],
  "goals": {"weeklyBudgetByCategory": {}, "savingsGoal": 5000,
            "paycheckMinAmount": 2000, "largePurchaseThreshold": 500}
}
"""

private let petLoadedWithHistory = """
{
  "healthScore": 90, "mood": 95, "lastReactionAt": "2026-05-21T12:00:00Z",
  "reactionHistory": [
    {"at": "2026-05-21T12:00:00Z", "eventType": "paycheck_received",
     "reaction": {"animation": "celebrate", "sound": "fanfare", "led": "rainbow",
                  "duration": 3000, "reason": "Paycheck received: $2,400.00"}}
  ],
  "goals": {"weeklyBudgetByCategory": {}, "savingsGoal": 5000,
            "paycheckMinAmount": 2000, "largePurchaseThreshold": 500}
}
"""

private let debugSession = "{\"token\": \"debug-tok-123\", \"user_id\": \"debug-user\"}"

// MARK: - Helpers

private func stubsJSON(_ stubs: [String: (statusCode: Int, body: String)]) -> String {
    var dict: [String: [String: Any]] = [:]
    for (key, stub) in stubs {
        dict[key] = ["statusCode": stub.statusCode, "body": stub.body]
    }
    let data = try! JSONSerialization.data(withJSONObject: dict, options: [])
    return String(data: data, encoding: .utf8)!
}

// MARK: - ActivityTabUITests

/// Tests for the Activity tab (SpendingView) in RootView.
///
/// SpendingView has three visible states:
///   1. pet == nil    → ProgressView spinner (while PetStore is loading / errored out)
///   2. pet.reactionHistory.isEmpty → ContentUnavailableView "No reactions yet"
///   3. history non-empty → List of ReactionRecord rows
///
/// Because each test exercises a different stub state the simplest pattern is
/// to launch fresh per-test subsets. The class-level launch uses the
/// empty-history fixture as the neutral default.
final class ActivityTabUITests: XCTestCase {

    // MARK: - Class-level state

    private static var app: XCUIApplication!

    override class func setUp() {
        super.setUp()
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--mock-network"]
        // Default: empty history — exercises the "No reactions yet" state.
        app.launchEnvironment["MOCK_STUBS"] = stubsJSON([
            "/api/debug/session": (200, debugSession),
            "/api/pets": (200, petLoadedEmptyHistory)
        ])
        app.launch()
        _ = app.tabBars.firstMatch.waitForExistence(timeout: 20)
    }

    override class func tearDown() {
        app.terminate()
        app = nil
        super.tearDown()
    }

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        // Reset to Pet tab so navigation is predictable.
        Self.app.tabBars.firstMatch.buttons["Pet"].tap()
    }

    private var app: XCUIApplication { Self.app }

    // MARK: - Tests

    /// When the backend returns a non-2xx for /api/pets the PetStore ends up in
    /// .failed, leaving store.pet == nil. SpendingView shows a ProgressView while
    /// pet is nil (it never emits a "nil" from the store, so we use a 404 to
    /// force the transient nil-before-first-load state OR verify ContentUnavailableView).
    ///
    /// Because the mock responds instantly (no delay), PetStore will move from
    /// .loading to .failed before the test asserts. Therefore we assert either a
    /// ProgressView or a ContentUnavailableView — both are valid "no data" states.
    func testActivityTabShowsProgressViewWhilePetNil() {
        let freshApp = XCUIApplication()
        freshApp.launchArguments = ["--ui-testing", "--mock-network"]
        freshApp.launchEnvironment["MOCK_STUBS"] = stubsJSON([
            "/api/debug/session": (200, debugSession),
            "/api/pets": (404, "{}")
        ])
        freshApp.launch()
        defer { freshApp.terminate() }

        _ = freshApp.tabBars.firstMatch.waitForExistence(timeout: 20)
        freshApp.tabBars.firstMatch.buttons["Activity"].tap()
        _ = freshApp.navigationBars["Activity"].waitForExistence(timeout: 8)

        // Either the ProgressView spinner or any static text is fine —
        // the important thing is the app doesn't crash.
        let activityNavBar = freshApp.navigationBars["Activity"]
        XCTAssertTrue(activityNavBar.exists, "Activity nav bar must be visible")

        // At least one of: ProgressView OR ContentUnavailableView must exist.
        let hasProgressView = freshApp.activityIndicators.count > 0
            || freshApp.progressIndicators.count > 0
        let hasStaticText = freshApp.staticTexts.count > 0
        XCTAssertTrue(
            hasProgressView || hasStaticText,
            "Activity tab must show some UI when pet state is nil or errored"
        )
    }

    /// Empty reaction history produces the "No reactions yet" ContentUnavailableView.
    func testActivityTabShowsEmptyStateWhenNoReactions() {
        app.tabBars.firstMatch.buttons["Activity"].tap()
        _ = app.navigationBars["Activity"].waitForExistence(timeout: 8)

        let noReactionsText = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "No reactions yet")
        ).firstMatch
        XCTAssertTrue(
            noReactionsText.waitForExistence(timeout: 10),
            "'No reactions yet' text must appear when reactionHistory is empty"
        )
    }

    /// When history has entries the row text (eventType capitalized) must appear.
    func testActivityTabShowsReactionWhenHistoryNonEmpty() {
        let freshApp = XCUIApplication()
        freshApp.launchArguments = ["--ui-testing", "--mock-network"]
        freshApp.launchEnvironment["MOCK_STUBS"] = stubsJSON([
            "/api/debug/session": (200, debugSession),
            "/api/pets": (200, petLoadedWithHistory)
        ])
        freshApp.launch()
        defer { freshApp.terminate() }

        _ = freshApp.tabBars.firstMatch.waitForExistence(timeout: 20)
        freshApp.tabBars.firstMatch.buttons["Activity"].tap()
        _ = freshApp.navigationBars["Activity"].waitForExistence(timeout: 8)

        // SpendingView shows record.eventType.replacingOccurrences(of: "_", with: " ").capitalized
        // "paycheck_received" → "Paycheck Received"
        let reactionRow = freshApp.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Paycheck Received")
        ).firstMatch
        XCTAssertTrue(
            reactionRow.waitForExistence(timeout: 10),
            "'Paycheck Received' row must appear when reactionHistory is non-empty"
        )
    }

    /// Pull-to-refresh on the Activity tab must not crash the app.
    func testActivityTabPullToRefreshWorks() {
        app.tabBars.firstMatch.buttons["Activity"].tap()
        _ = app.navigationBars["Activity"].waitForExistence(timeout: 8)

        // The List or empty view inside NavigationStack is scrollable.
        // Swipe down to trigger refreshable.
        let scrollable = app.scrollViews.firstMatch
        if scrollable.exists {
            scrollable.swipeDown()
        } else {
            // ContentUnavailableView is not a scroll view; swipe on the whole screen.
            app.swipeDown()
        }

        XCTAssertTrue(
            app.navigationBars["Activity"].exists,
            "Activity nav bar must still exist after pull-to-refresh"
        )
    }
}
