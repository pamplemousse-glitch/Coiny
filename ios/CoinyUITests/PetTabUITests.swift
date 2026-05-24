import XCTest

// MARK: - Fixtures

private let petLoadedEmptyHistory = """
{
  "healthScore": 75, "mood": 80, "lastReactionAt": null, "reactionHistory": [],
  "goals": {"weeklyBudgetByCategory": {"groceries": 150, "dining": 100},
            "savingsGoal": 5000, "paycheckMinAmount": 2000, "largePurchaseThreshold": 500}
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
private let syncResult = "{\"reacted\": 1}"
private let emptyOk = "{}"

// MARK: - Helpers

/// Serialises a stub dictionary to a JSON string suitable for MOCK_STUBS env var.
private func stubsJSON(_ stubs: [String: (statusCode: Int, body: String)]) -> String {
    var dict: [String: [String: Any]] = [:]
    for (key, stub) in stubs {
        dict[key] = ["statusCode": stub.statusCode, "body": stub.body]
    }
    let data = try! JSONSerialization.data(withJSONObject: dict, options: [])
    return String(data: data, encoding: .utf8)!
}

// MARK: - PetTabUITests

/// Tests for the Pet tab (PetView / PetLoadedView) in RootView.
///
/// Design: launch once per class with mock stubs that return the "loaded with
/// history" fixture. Individual tests that need a different stub state create
/// their own XCUIApplication instance and launch it inline, which is acceptable
/// because those tests are explicitly structured to exercise a distinct state.
final class PetTabUITests: XCTestCase {

    // MARK: - Class-level state (launched once)

    private static var app: XCUIApplication!

    override class func setUp() {
        super.setUp()
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--mock-network"]
        app.launchEnvironment["MOCK_STUBS"] = stubsJSON([
            "/api/debug/session": (200, debugSession),
            "/api/pets": (200, petLoadedWithHistory)
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
        // Return to Pet tab before each test.
        Self.app.tabBars.firstMatch.buttons["Pet"].tap()
    }

    private var app: XCUIApplication { Self.app }

    // MARK: - Tests

    /// Pet face image is shown via accessibilityLabel set in PetLoadedView.
    func testPetTabShowsLoadingThenFace() {
        // The class-level launch already loaded pet with mood=95.
        // The image's accessibilityLabel is "Pet mood: 95 out of 100".
        let faceImage = app.images.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Pet mood:")
        ).firstMatch
        XCTAssertTrue(
            faceImage.waitForExistence(timeout: 10),
            "Pet face image with accessibilityLabel containing 'Pet mood:' must exist after load"
        )
    }

    /// Two ProgressViews (health bar and mood bar) must appear in the loaded state.
    func testPetTabShowsHealthBar() {
        // Wait for the face image — confirms loaded state reached.
        let faceImage = app.images.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Pet mood:")
        ).firstMatch
        XCTAssertTrue(faceImage.waitForExistence(timeout: 10))

        // PetLoadedView renders statRow twice: Health + Mood, each with a ProgressView.
        // progressIndicators includes both.
        let bars = app.progressIndicators
        XCTAssertTrue(
            bars.count >= 2,
            "At least 2 progress indicators (health bar + mood bar) must exist in loaded state"
        )
    }

    /// Pull-to-refresh on the ScrollView must not crash the app.
    func testPetTabPullToRefreshTriggersReload() {
        let faceImage = app.images.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Pet mood:")
        ).firstMatch
        XCTAssertTrue(faceImage.waitForExistence(timeout: 10))

        // Simulate pull-to-refresh: swipe down from the centre of the scroll view.
        app.scrollViews.firstMatch.swipeDown()

        // No crash — the view should still be on screen.
        XCTAssertTrue(app.tabBars.firstMatch.exists, "Tab bar must still be visible after pull-to-refresh")
    }

    /// When pet has empty reactionHistory, WaitingForFirstReactionView is shown.
    /// We launch a fresh app instance with empty-history stub for this test.
    func testPetTabShowsWaitingViewWhenNoHistory() {
        let freshApp = XCUIApplication()
        freshApp.launchArguments = ["--ui-testing", "--mock-network"]
        freshApp.launchEnvironment["MOCK_STUBS"] = stubsJSON([
            "/api/debug/session": (200, debugSession),
            "/api/pets": (200, petLoadedEmptyHistory)
        ])
        freshApp.launch()
        defer { freshApp.terminate() }

        _ = freshApp.tabBars.firstMatch.waitForExistence(timeout: 20)
        freshApp.tabBars.firstMatch.buttons["Pet"].tap()

        // WaitingForFirstReactionView contains "Coiny is watching…"
        let waitingText = freshApp.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Coiny is watching")
        ).firstMatch
        XCTAssertTrue(
            waitingText.waitForExistence(timeout: 10),
            "'Coiny is watching…' text from WaitingForFirstReactionView must appear when history is empty"
        )
    }

    /// When pet has reaction history, the reason text of the last reaction is shown.
    func testPetTabShowsLastReactionCardWhenHistoryNonEmpty() {
        // Class-level launch uses petLoadedWithHistory — "Paycheck received: $2,400.00"
        let reasonText = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Paycheck received")
        ).firstMatch
        XCTAssertTrue(
            reasonText.waitForExistence(timeout: 10),
            "Last reaction reason 'Paycheck received: $2,400.00' must appear when history non-empty"
        )
    }

    /// The "Fire test transaction" debug button must exist in DEBUG builds.
    func testPetTabFireTransactionButtonExists() {
        let faceImage = app.images.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Pet mood:")
        ).firstMatch
        XCTAssertTrue(faceImage.waitForExistence(timeout: 10))

        let fireButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Fire test transaction")
        ).firstMatch
        XCTAssertTrue(
            fireButton.waitForExistence(timeout: 10),
            "'Fire test transaction' debug button must exist in DEBUG builds"
        )
    }

    /// Tapping "Fire test transaction" should not crash the app.
    /// We stub both the fire-transaction and debug/transactions endpoints.
    func testPetTabFireTransactionButtonTappable() {
        let freshApp = XCUIApplication()
        freshApp.launchArguments = ["--ui-testing", "--mock-network"]
        freshApp.launchEnvironment["MOCK_STUBS"] = stubsJSON([
            "/api/debug/session": (200, debugSession),
            "/api/pets": (200, petLoadedWithHistory),
            "/api/debug/fire-transaction": (200, emptyOk),
            "/api/debug/transactions": (200, """
            {"transactions":[{"id":"t1","date":"2026-05-21","merchant":"Grocery","amount":"42.00","category":"groceries","rule_matched":"overspent_in_category"}]}
            """)
        ])
        freshApp.launch()
        defer { freshApp.terminate() }

        _ = freshApp.tabBars.firstMatch.waitForExistence(timeout: 20)
        freshApp.tabBars.firstMatch.buttons["Pet"].tap()

        let fireButton = freshApp.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Fire test transaction")
        ).firstMatch
        XCTAssertTrue(fireButton.waitForExistence(timeout: 10))

        fireButton.tap()

        // After tap the button becomes "Firing…" and eventually returns.
        // Just assert no crash and the tab bar is still visible.
        XCTAssertTrue(
            freshApp.tabBars.firstMatch.waitForExistence(timeout: 15),
            "Tab bar must remain visible after tapping Fire test transaction"
        )
    }
}
