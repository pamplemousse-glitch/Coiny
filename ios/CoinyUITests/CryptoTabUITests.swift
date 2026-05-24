import XCTest

// MARK: - Fixtures

private let coinbaseNotConnected = "{\"connected\": false, \"mode\": null}"
private let coinbaseConnected    = "{\"connected\": true, \"mode\": \"dev-key\"}"
private let zerionWalletsEmpty   = "[]"
private let zerionWalletAdded    = "{\"id\": \"w1\", \"userId\": \"u1\", \"address\": \"0xDEADBEEF\", \"label\": \"My Wallet\", \"createdAt\": \"2026-05-21T12:00:00Z\"}"
private let zerionWalletsOne     = "[{\"id\": \"w1\", \"userId\": \"u1\", \"address\": \"0xDEADBEEF\", \"label\": \"My Wallet\", \"createdAt\": \"2026-05-21T12:00:00Z\"}]"
private let syncResult           = "{\"reacted\": 1}"
private let debugSession         = "{\"token\": \"debug-tok-123\", \"user_id\": \"debug-user\"}"

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

// MARK: - CryptoTabUITests

/// Tests for the Crypto tab (CryptoView → CoinbaseView + ZerionView).
///
/// Each test launches its own XCUIApplication because the stub set differs
/// per scenario. CryptoView runs CoinbaseViewModel.loadStatus() and
/// ZerionViewModel.loadWallets() concurrently in .task; the mock stubs must
/// cover both endpoints on every launch.
final class CryptoTabUITests: XCTestCase {

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    // MARK: - Launch helper

    private func launchApp(
        coinbaseBody: String = coinbaseNotConnected,
        coinbaseStatus: Int = 200,
        zerionBody: String = zerionWalletsEmpty,
        zerionStatus: Int = 200,
        extraStubs: [String: (statusCode: Int, body: String)] = [:]
    ) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--mock-network"]
        var stubs: [String: (statusCode: Int, body: String)] = [
            "/api/debug/session":   (200, debugSession),
            "/api/pets":            (200, petEmptyGoals),
            "/api/coinbase/status": (coinbaseStatus, coinbaseBody),
            "/api/zerion/wallets":  (zerionStatus, zerionBody)
        ]
        for (k, v) in extraStubs { stubs[k] = v }
        app.launchEnvironment["MOCK_STUBS"] = stubsJSON(stubs)
        app.launch()
        _ = app.tabBars.firstMatch.waitForExistence(timeout: 20)
        app.tabBars.firstMatch.buttons["Crypto"].tap()
        _ = app.navigationBars["Crypto"].waitForExistence(timeout: 8)
        return app
    }

    // MARK: - Coinbase tests

    /// "Not connected" label shown and "Connect via dev key" button exists when not connected.
    func testCoinbaseNotConnectedShowsConnectButton() {
        let app = launchApp()
        defer { app.terminate() }

        let connectButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Connect via dev key")
        ).firstMatch
        XCTAssertTrue(
            connectButton.waitForExistence(timeout: 10),
            "'Connect via dev key' button must exist when Coinbase is not connected"
        )

        let notConnectedLabel = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Not connected")
        ).firstMatch
        XCTAssertTrue(
            notConnectedLabel.exists,
            "'Not connected' label must appear when Coinbase status is disconnected"
        )
    }

    /// Tapping "Connect via dev key" should not crash.
    func testCoinbaseConnectDevKeyButtonTappable() {
        let app = launchApp(
            extraStubs: [
                "/api/coinbase/connect/dev-key": (200, "{}")
            ]
        )
        defer { app.terminate() }

        let connectButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Connect via dev key")
        ).firstMatch
        XCTAssertTrue(connectButton.waitForExistence(timeout: 10))
        connectButton.tap()

        // After tap, CoinbaseViewModel.connectDevKey() fires and then reloads
        // status. No crash is the assertion.
        XCTAssertTrue(
            app.tabBars.firstMatch.waitForExistence(timeout: 10),
            "Tab bar must be visible after tapping Connect via dev key"
        )
    }

    /// "Sync now" button must be visible when Coinbase is connected.
    func testCoinbaseConnectedShowsSyncButton() {
        let app = launchApp(coinbaseBody: coinbaseConnected)
        defer { app.terminate() }

        let syncButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Sync now")
        ).firstMatch
        XCTAssertTrue(
            syncButton.waitForExistence(timeout: 10),
            "'Sync now' button must appear when Coinbase is connected"
        )
    }

    /// "Disconnect Coinbase" button must be visible when connected.
    func testCoinbaseConnectedShowsDisconnectButton() {
        let app = launchApp(coinbaseBody: coinbaseConnected)
        defer { app.terminate() }

        let disconnectButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Disconnect Coinbase")
        ).firstMatch
        XCTAssertTrue(
            disconnectButton.waitForExistence(timeout: 10),
            "'Disconnect Coinbase' button must appear when Coinbase is connected"
        )
    }

    /// Tapping "Sync now" when connected should not crash.
    func testCoinbaseSyncButtonTappable() {
        let app = launchApp(
            coinbaseBody: coinbaseConnected,
            extraStubs: ["/api/coinbase/sync": (200, syncResult)]
        )
        defer { app.terminate() }

        let syncButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Sync now")
        ).firstMatch
        XCTAssertTrue(syncButton.waitForExistence(timeout: 10))
        syncButton.tap()

        XCTAssertTrue(
            app.tabBars.firstMatch.waitForExistence(timeout: 10),
            "Tab bar must remain visible after tapping Sync now"
        )
    }

    // MARK: - Zerion tests

    /// Tapping "Add wallet" opens the add-wallet sheet.
    func testZerionAddWalletButtonOpensSheet() {
        let app = launchApp()
        defer { app.terminate() }

        let addButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Add wallet")
        ).firstMatch
        XCTAssertTrue(addButton.waitForExistence(timeout: 10))
        addButton.tap()

        // The sheet contains a TextField with placeholder "0x…"
        let addressField = app.textFields.matching(
            NSPredicate(format: "placeholderValue CONTAINS[c] %@", "0x")
        ).firstMatch
        XCTAssertTrue(
            addressField.waitForExistence(timeout: 8),
            "Add-wallet sheet must appear with '0x…' address TextField"
        )
    }

    /// Tapping "Cancel" in the sheet dismisses it.
    func testZerionAddWalletSheetCancelDismissesSheet() {
        let app = launchApp()
        defer { app.terminate() }

        let addButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Add wallet")
        ).firstMatch
        XCTAssertTrue(addButton.waitForExistence(timeout: 10))
        addButton.tap()

        let cancelButton = app.buttons["Cancel"]
        XCTAssertTrue(cancelButton.waitForExistence(timeout: 8))
        cancelButton.tap()

        // Sheet dismissed — tab bar should be visible again.
        XCTAssertTrue(
            app.tabBars.firstMatch.waitForExistence(timeout: 8),
            "Tab bar must be visible after dismissing the Add Wallet sheet"
        )
    }

    /// "Add" button in sheet must be disabled when the address field is empty.
    func testZerionAddWalletSheetAddButtonDisabledWhenEmpty() {
        let app = launchApp()
        defer { app.terminate() }

        let addWalletButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Add wallet")
        ).firstMatch
        XCTAssertTrue(addWalletButton.waitForExistence(timeout: 10))
        addWalletButton.tap()

        // The toolbar "Add" confirmation button.
        let addConfirmButton = app.buttons["Add"]
        XCTAssertTrue(addConfirmButton.waitForExistence(timeout: 8))
        XCTAssertFalse(
            addConfirmButton.isEnabled,
            "'Add' button must be disabled when address field is empty"
        )
    }

    /// "Add" button becomes enabled once the address field has text.
    func testZerionAddWalletSheetAddButtonEnabledWithAddress() {
        let app = launchApp()
        defer { app.terminate() }

        let addWalletButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Add wallet")
        ).firstMatch
        XCTAssertTrue(addWalletButton.waitForExistence(timeout: 10))
        addWalletButton.tap()

        let addressField = app.textFields.matching(
            NSPredicate(format: "placeholderValue CONTAINS[c] %@", "0x")
        ).firstMatch
        XCTAssertTrue(addressField.waitForExistence(timeout: 8))
        addressField.tap()
        addressField.typeText("0xDEADBEEF")

        let addConfirmButton = app.buttons["Add"]
        XCTAssertTrue(
            addConfirmButton.isEnabled,
            "'Add' button must be enabled once address is typed"
        )
    }

    /// Typing an address and tapping "Add" submits the wallet and dismisses the sheet.
    func testZerionAddWalletSubmits() {
        let app = launchApp(
            extraStubs: [
                "/api/zerion/wallets": (200, zerionWalletsOne)
            ]
        )
        defer { app.terminate() }

        let addWalletButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Add wallet")
        ).firstMatch
        XCTAssertTrue(addWalletButton.waitForExistence(timeout: 10))
        addWalletButton.tap()

        let addressField = app.textFields.matching(
            NSPredicate(format: "placeholderValue CONTAINS[c] %@", "0x")
        ).firstMatch
        XCTAssertTrue(addressField.waitForExistence(timeout: 8))
        addressField.tap()
        addressField.typeText("0xDEADBEEF")

        let addConfirmButton = app.buttons["Add"]
        XCTAssertTrue(addConfirmButton.isEnabled)
        addConfirmButton.tap()

        // Sheet dismissed — Crypto nav bar should be visible again.
        XCTAssertTrue(
            app.navigationBars["Crypto"].waitForExistence(timeout: 10),
            "Crypto nav bar must be visible after wallet is added and sheet dismissed"
        )
    }
}
