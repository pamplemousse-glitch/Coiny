import XCTest

// MARK: - Fixtures

private let netWorthLoaded = """
{
  "total": 12345.67, "bank": 10000, "investments": 0, "crypto": 2345.67, "defi": 0, "debts": 0,
  "accounts": {
    "bank": [{"accountId": "acc1", "name": "Checking", "type": "depository", "balance": 10000}],
    "investments": [], "crypto": [], "defi": {"totalUSD": 0}, "debts": []
  },
  "connections": {"coinbase": false, "zerion": false, "spinwheel": false}
}
"""

private let netWorthAllConnected = """
{
  "total": 15000, "bank": 10000, "investments": 0, "crypto": 3000, "defi": 2000, "debts": 0,
  "accounts": {
    "bank": [{"accountId": "acc1", "name": "Checking", "type": "depository", "balance": 10000}],
    "investments": [],
    "crypto": [{"id": "btc1", "name": "Bitcoin", "symbol": "BTC", "amount": 0.05, "valueUSD": 3000}],
    "defi": {"totalUSD": 2000}, "debts": []
  },
  "connections": {"coinbase": true, "zerion": true, "spinwheel": true}
}
"""

private let debugSession = "{\"token\": \"debug-tok-123\", \"user_id\": \"debug-user\"}"

private let petEmptyGoals = """
{
  "healthScore": 75, "mood": 80, "lastReactionAt": null, "reactionHistory": [],
  "goals": {"weeklyBudgetByCategory": {}, "savingsGoal": 5000,
            "paycheckMinAmount": 2000, "largePurchaseThreshold": 500}
}
"""

// MARK: - Helpers

private func stubsJSON(_ stubs: [String: (statusCode: Int, body: String)]) -> String {
    var dict: [String: [String: Any]] = [:]
    for (key, stub) in stubs {
        dict[key] = ["statusCode": stub.statusCode, "body": stub.body]
    }
    let data = try! JSONSerialization.data(withJSONObject: dict, options: [])
    return String(data: data, encoding: .utf8)!
}

// MARK: - WealthTabUITests

/// Tests for the Wealth tab (NetWorthView).
///
/// Each test launches its own app instance because NetWorthViewModel loads data
/// during .task and the stubs need to differ per scenario. Sharing a single
/// launch would require timing tricks to swap stubs between tests, which is
/// fragile. The tradeoff (slower run) is acceptable for correctness.
final class WealthTabUITests: XCTestCase {

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    // MARK: - Helpers

    private func launchWithNetWorthStub(
        netWorthStatusCode: Int,
        netWorthBody: String
    ) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--mock-network"]
        app.launchEnvironment["MOCK_STUBS"] = stubsJSON([
            "/api/debug/session": (200, debugSession),
            "/api/pets": (200, petEmptyGoals),
            "/api/net-worth": (netWorthStatusCode, netWorthBody)
        ])
        app.launch()
        _ = app.tabBars.firstMatch.waitForExistence(timeout: 20)
        app.tabBars.firstMatch.buttons["Wealth"].tap()
        _ = app.navigationBars["Wealth"].waitForExistence(timeout: 8)
        return app
    }

    // MARK: - Tests

    /// The formatted net worth total "$12,345.67" must appear in the header.
    func testWealthTabShowsNetWorthTotal() {
        let app = launchWithNetWorthStub(netWorthStatusCode: 200, netWorthBody: netWorthLoaded)
        defer { app.terminate() }

        // NetWorthView formats total with .currency(code: "USD"), which on en_US
        // produces "$12,345.67". We match on "12,345" to be locale-tolerant.
        let totalText = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "12,345")
        ).firstMatch
        XCTAssertTrue(
            totalText.waitForExistence(timeout: 10),
            "Net worth total containing '12,345' must appear in the Wealth header"
        )
    }

    /// The Bank section with account name "Checking" must be visible.
    func testWealthTabShowsBankSection() {
        let app = launchWithNetWorthStub(netWorthStatusCode: 200, netWorthBody: netWorthLoaded)
        defer { app.terminate() }

        // bankSection renders a GroupBox with a "Bank" label header.
        let bankLabel = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Bank")
        ).firstMatch
        XCTAssertTrue(bankLabel.waitForExistence(timeout: 10), "'Bank' section header must be visible")

        let checkingLabel = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Checking")
        ).firstMatch
        XCTAssertTrue(
            checkingLabel.waitForExistence(timeout: 10),
            "'Checking' account name must appear in the Bank section"
        )
    }

    /// When coinbase/zerion/spinwheel are all false, "not connected" prompts appear.
    func testWealthTabShowsNotConnectedPromptsWhenNoConnections() {
        let app = launchWithNetWorthStub(netWorthStatusCode: 200, netWorthBody: netWorthLoaded)
        defer { app.terminate() }

        // cryptoSection: "Connect Coinbase in the Crypto tab"
        let coinbasePrompt = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Connect Coinbase in the Crypto tab")
        ).firstMatch
        XCTAssertTrue(
            coinbasePrompt.waitForExistence(timeout: 10),
            "'Connect Coinbase in the Crypto tab' prompt must appear when coinbase not connected"
        )

        // defiSection: "Add wallets in the Crypto tab"
        let zerionPrompt = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Add wallets in the Crypto tab")
        ).firstMatch
        XCTAssertTrue(
            zerionPrompt.exists,
            "'Add wallets in the Crypto tab' prompt must appear when zerion not connected"
        )

        // debtsSection: "Connect via Debt tab"
        let spinwheelPrompt = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Connect via Debt tab")
        ).firstMatch
        XCTAssertTrue(
            spinwheelPrompt.exists,
            "'Connect via Debt tab' prompt must appear when spinwheel not connected"
        )
    }

    /// A 500 from /api/net-worth should show the ContentUnavailableView with a Retry button.
    func testWealthTabShowsRetryButtonOnError() {
        let app = launchWithNetWorthStub(netWorthStatusCode: 500, netWorthBody: "{\"error\":\"server error\"}")
        defer { app.terminate() }

        let retryButton = app.buttons["Retry"]
        XCTAssertTrue(
            retryButton.waitForExistence(timeout: 10),
            "'Retry' button must appear when /api/net-worth returns 500"
        )
    }

    /// Tapping Retry must not crash the app (second request also 500 is fine).
    func testWealthTabRetryButtonTappable() {
        let app = launchWithNetWorthStub(netWorthStatusCode: 500, netWorthBody: "{\"error\":\"server error\"}")
        defer { app.terminate() }

        let retryButton = app.buttons["Retry"]
        XCTAssertTrue(retryButton.waitForExistence(timeout: 10))
        retryButton.tap()

        // After tap, either loading or error state — just assert no crash.
        XCTAssertTrue(
            app.tabBars.firstMatch.waitForExistence(timeout: 10),
            "Tab bar must remain visible after tapping Retry"
        )
    }

    /// When all connections are true, crypto positions ("Bitcoin") and DeFi section appear.
    func testWealthTabShowsAllSectionsWhenAllConnected() {
        let app = launchWithNetWorthStub(netWorthStatusCode: 200, netWorthBody: netWorthAllConnected)
        defer { app.terminate() }

        // cryptoSection should show the "Bitcoin" CryptoPosition.
        let bitcoinText = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Bitcoin")
        ).firstMatch
        XCTAssertTrue(
            bitcoinText.waitForExistence(timeout: 10),
            "'Bitcoin' crypto position must appear when coinbase connected with holdings"
        )

        // defiSection header "DeFi" must appear.
        let defiText = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "DeFi")
        ).firstMatch
        XCTAssertTrue(
            defiText.exists,
            "'DeFi' section header must appear when zerion is connected"
        )
    }
}
