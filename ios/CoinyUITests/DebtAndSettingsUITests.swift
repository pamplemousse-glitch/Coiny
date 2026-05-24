import XCTest

// MARK: - Fixtures

private let spinwheelNotConnected = "{\"connected\": false}"
private let spinwheelConnected    = "{\"connected\": true}"
private let spinwheelDebtsEmpty   = "{\"debts\": []}"
private let spinwheelDebtsOne     = "{\"debts\": [{\"id\": \"d1\", \"type\": \"credit_card\", \"balance\": 1500.00, \"monthlyPayment\": 50.00}]}"
private let debugSession          = "{\"token\": \"debug-tok-123\", \"user_id\": \"debug-user\"}"
private let emptyOk               = "{}"

private let petWithGoals = """
{
  "healthScore": 75, "mood": 80, "lastReactionAt": null, "reactionHistory": [],
  "goals": {"weeklyBudgetByCategory": {"groceries": 150, "dining": 100},
            "savingsGoal": 5000, "paycheckMinAmount": 2000, "largePurchaseThreshold": 500}
}
"""

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

// MARK: ─────────────────────────────────────────────────────────────────────
// MARK: SpinwheelTabUITests
// MARK: ─────────────────────────────────────────────────────────────────────

/// Tests for the Debt tab (SpinwheelView) in RootView.
///
/// SpinwheelView shows:
///   • ProgressView("Checking status…") during loadStatus()
///   • PhoneEntryView when !isConnected && !showOtpEntry
///   • OtpEntryView when showOtpEntry
///   • connectedContent (List of debts + Disconnect button) when isConnected
///
/// Each scenario needs distinct stubs so we launch per-test.
final class SpinwheelTabUITests: XCTestCase {

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    // MARK: - Launch helper

    private func launchDebtTab(
        spinwheelStatusBody: String = spinwheelNotConnected,
        spinwheelStatusCode: Int = 200,
        debtsBody: String = spinwheelDebtsEmpty,
        extraStubs: [String: (statusCode: Int, body: String)] = []
    ) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--mock-network"]
        var stubs: [String: (statusCode: Int, body: String)] = [
            "/api/debug/session":    (200, debugSession),
            "/api/pets":             (200, petEmptyGoals),
            "/api/spinwheel/status": (spinwheelStatusCode, spinwheelStatusBody),
            "/api/spinwheel/debts":  (200, debtsBody)
        ]
        for (k, v) in extraStubs { stubs[k] = v }
        app.launchEnvironment["MOCK_STUBS"] = stubsJSON(stubs)
        app.launch()
        _ = app.tabBars.firstMatch.waitForExistence(timeout: 20)
        app.tabBars.firstMatch.buttons["Debt"].tap()
        _ = app.navigationBars["Debt Tracker"].waitForExistence(timeout: 8)
        return app
    }

    // MARK: - Tests

    /// PhoneEntryView is shown when Spinwheel is not connected.
    func testDebtTabShowsPhoneEntryWhenNotConnected() {
        let app = launchDebtTab()
        defer { app.terminate() }

        // PhoneEntryView Form header is "Connect Spinwheel"
        let connectHeader = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Connect Spinwheel")
        ).firstMatch
        XCTAssertTrue(
            connectHeader.waitForExistence(timeout: 10),
            "'Connect Spinwheel' header must appear when Spinwheel is not connected"
        )

        // Phone TextField
        let phoneField = app.textFields.matching(
            NSPredicate(format: "placeholderValue CONTAINS[c] %@", "Phone")
        ).firstMatch
        XCTAssertTrue(
            phoneField.exists,
            "Phone TextField must be visible in PhoneEntryView"
        )
    }

    /// "Send code" button is disabled when phone and DOB fields are empty.
    func testDebtTabSendCodeButtonDisabledWhenFieldsEmpty() {
        let app = launchDebtTab()
        defer { app.terminate() }

        _ = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Connect Spinwheel")
        ).firstMatch.waitForExistence(timeout: 10)

        let sendCodeButton = app.buttons["Send code"]
        XCTAssertTrue(sendCodeButton.exists, "'Send code' button must exist in PhoneEntryView")
        XCTAssertFalse(
            sendCodeButton.isEnabled,
            "'Send code' must be disabled when phone and DOB fields are empty"
        )
    }

    /// "Send code" button becomes enabled when both phone and DOB are filled.
    func testDebtTabSendCodeButtonEnabledWhenBothFieldsFilled() {
        let app = launchDebtTab()
        defer { app.terminate() }

        _ = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Connect Spinwheel")
        ).firstMatch.waitForExistence(timeout: 10)

        let phoneField = app.textFields.matching(
            NSPredicate(format: "placeholderValue CONTAINS[c] %@", "Phone")
        ).firstMatch
        phoneField.tap()
        phoneField.typeText("+15550001234")

        let dobField = app.textFields.matching(
            NSPredicate(format: "placeholderValue CONTAINS[c] %@", "Date of birth")
        ).firstMatch
        dobField.tap()
        dobField.typeText("1990-01-01")

        let sendCodeButton = app.buttons["Send code"]
        XCTAssertTrue(
            sendCodeButton.isEnabled,
            "'Send code' must be enabled when both phone and DOB are filled"
        )
    }

    /// Tapping "Send code" (with fields filled) calls the API and shows OtpEntryView.
    func testDebtTabSendCodeTappable() {
        let app = launchDebtTab(
            extraStubs: ["/api/spinwheel/connect/sms": (200, emptyOk)]
        )
        defer { app.terminate() }

        _ = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Connect Spinwheel")
        ).firstMatch.waitForExistence(timeout: 10)

        let phoneField = app.textFields.matching(
            NSPredicate(format: "placeholderValue CONTAINS[c] %@", "Phone")
        ).firstMatch
        phoneField.tap()
        phoneField.typeText("+15550001234")

        let dobField = app.textFields.matching(
            NSPredicate(format: "placeholderValue CONTAINS[c] %@", "Date of birth")
        ).firstMatch
        dobField.tap()
        dobField.typeText("1990-01-01")

        app.buttons["Send code"].tap()

        // OtpEntryView header: "Enter verification code"
        let otpHeader = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Enter verification code")
        ).firstMatch
        XCTAssertTrue(
            otpHeader.waitForExistence(timeout: 10),
            "'Enter verification code' header must appear after Send code succeeds"
        )
    }

    // MARK: - OTP entry

    /// Helper: navigate to OtpEntryView by tapping "Send code" with valid inputs.
    private func navigateToOtpEntry(in app: XCUIApplication) {
        _ = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Connect Spinwheel")
        ).firstMatch.waitForExistence(timeout: 10)

        let phoneField = app.textFields.matching(
            NSPredicate(format: "placeholderValue CONTAINS[c] %@", "Phone")
        ).firstMatch
        phoneField.tap()
        phoneField.typeText("+15550001234")

        let dobField = app.textFields.matching(
            NSPredicate(format: "placeholderValue CONTAINS[c] %@", "Date of birth")
        ).firstMatch
        dobField.tap()
        dobField.typeText("1990-01-01")

        app.buttons["Send code"].tap()

        _ = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Enter verification code")
        ).firstMatch.waitForExistence(timeout: 10)
    }

    /// "Verify" button in OtpEntryView must be disabled when code field is empty.
    func testDebtTabVerifyButtonDisabledWhenCodeEmpty() {
        let app = launchDebtTab(
            extraStubs: ["/api/spinwheel/connect/sms": (200, emptyOk)]
        )
        defer { app.terminate() }

        navigateToOtpEntry(in: app)

        let verifyButton = app.buttons["Verify"]
        XCTAssertTrue(verifyButton.exists, "'Verify' button must exist in OtpEntryView")
        XCTAssertFalse(
            verifyButton.isEnabled,
            "'Verify' must be disabled when OTP field is empty"
        )
    }

    /// "Verify" button becomes enabled when a code is entered.
    func testDebtTabVerifyButtonEnabledWithCode() {
        let app = launchDebtTab(
            extraStubs: ["/api/spinwheel/connect/sms": (200, emptyOk)]
        )
        defer { app.terminate() }

        navigateToOtpEntry(in: app)

        let codeField = app.textFields.matching(
            NSPredicate(format: "placeholderValue CONTAINS[c] %@", "6-digit code")
        ).firstMatch
        XCTAssertTrue(codeField.waitForExistence(timeout: 8))
        codeField.tap()
        codeField.typeText("123456")

        let verifyButton = app.buttons["Verify"]
        XCTAssertTrue(
            verifyButton.isEnabled,
            "'Verify' must be enabled after entering a 6-digit code"
        )
    }

    // MARK: - Connected state

    /// When Spinwheel is connected and debts list is empty, "No debts found." appears.
    func testDebtTabConnectedShowsNoDebtsMessage() {
        let app = launchDebtTab(
            spinwheelStatusBody: spinwheelConnected,
            debtsBody: spinwheelDebtsEmpty
        )
        defer { app.terminate() }

        let noDebtsText = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "No debts found")
        ).firstMatch
        XCTAssertTrue(
            noDebtsText.waitForExistence(timeout: 10),
            "'No debts found.' must appear when connected with empty debts list"
        )
    }

    /// When Spinwheel is connected and has a debt, the debt type is shown.
    func testDebtTabConnectedShowsDebtRow() {
        let app = launchDebtTab(
            spinwheelStatusBody: spinwheelConnected,
            debtsBody: spinwheelDebtsOne
        )
        defer { app.terminate() }

        // SpinwheelDebt.debtType = "credit_card" → DebtRow shows it .capitalized
        // "credit_card".capitalized → "Credit_card" (Swift capitalizes first letter only)
        // But the view shows: debt.debtType?.capitalized ?? "Debt"
        // Swift's .capitalized on "credit_card" → "Credit_Card" (capitalizes after each non-letter)
        let debtText = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Credit")
        ).firstMatch
        XCTAssertTrue(
            debtText.waitForExistence(timeout: 10),
            "Debt type row containing 'Credit' must appear when connected with one debt"
        )
    }

    /// "Disconnect Spinwheel" button must be visible when connected.
    func testDebtTabDisconnectButtonVisible() {
        let app = launchDebtTab(
            spinwheelStatusBody: spinwheelConnected,
            debtsBody: spinwheelDebtsEmpty
        )
        defer { app.terminate() }

        let disconnectButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Disconnect Spinwheel")
        ).firstMatch
        XCTAssertTrue(
            disconnectButton.waitForExistence(timeout: 10),
            "'Disconnect Spinwheel' button must be visible in connected state"
        )
    }
}

// MARK: ─────────────────────────────────────────────────────────────────────
// MARK: SettingsTabUITests
// MARK: ─────────────────────────────────────────────────────────────────────

/// Tests for the Settings tab (SettingsView) in RootView.
///
/// SettingsView reads @AppStorage("bankLinked") — the --bank-linked launch
/// argument causes CoinyApp to set UserDefaults("bankLinked") = true before
/// the view renders.
final class SettingsTabUITests: XCTestCase {

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    // MARK: - Launch helper

    private func launchSettingsTab(
        bankLinked: Bool = false,
        petBody: String = petEmptyGoals
    ) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--mock-network"]
        if bankLinked {
            app.launchArguments.append("--bank-linked")
        }
        app.launchEnvironment["MOCK_STUBS"] = stubsJSON([
            "/api/debug/session": (200, debugSession),
            "/api/pets": (200, petBody)
        ])
        app.launch()
        _ = app.tabBars.firstMatch.waitForExistence(timeout: 20)
        app.tabBars.firstMatch.buttons["Settings"].tap()
        _ = app.navigationBars["Settings"].waitForExistence(timeout: 8)
        return app
    }

    // MARK: - Tests

    /// Without --bank-linked, "Not linked" status text must appear.
    func testSettingsTabShowsNotLinkedWhenNoBank() {
        let app = launchSettingsTab(bankLinked: false)
        defer { app.terminate() }

        let notLinkedText = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Not linked")
        ).firstMatch
        XCTAssertTrue(
            notLinkedText.waitForExistence(timeout: 10),
            "'Not linked' bank status must appear when bankLinked is false"
        )
    }

    /// With --bank-linked, "Linked" status label must appear.
    func testSettingsTabShowsLinkedWhenBankLinked() {
        let app = launchSettingsTab(bankLinked: true, petBody: petWithGoals)
        defer { app.terminate() }

        let linkedLabel = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Linked")
        ).firstMatch
        XCTAssertTrue(
            linkedLabel.waitForExistence(timeout: 10),
            "'Linked' status label must appear when bankLinked is true"
        )
    }

    /// "Unlink bank" button must be visible when bank is linked.
    func testSettingsTabShowsUnlinkButtonWhenLinked() {
        let app = launchSettingsTab(bankLinked: true)
        defer { app.terminate() }

        let unlinkButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Unlink bank")
        ).firstMatch
        XCTAssertTrue(
            unlinkButton.waitForExistence(timeout: 10),
            "'Unlink bank' button must appear when bank is linked"
        )
    }

    /// When pet has goals, "Savings target" row must appear in the goals section.
    func testSettingsTabShowsGoalsSectionWhenPetLoaded() {
        let app = launchSettingsTab(petBody: petWithGoals)
        defer { app.terminate() }

        let savingsTarget = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Savings target")
        ).firstMatch
        XCTAssertTrue(
            savingsTarget.waitForExistence(timeout: 10),
            "'Savings target' must appear in the Current goals section when pet has goals"
        )
    }

    /// "Sign out" button must exist in the Account section.
    func testSettingsTabSignOutButtonExists() {
        let app = launchSettingsTab()
        defer { app.terminate() }

        let signOutButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Sign out")
        ).firstMatch
        XCTAssertTrue(
            signOutButton.waitForExistence(timeout: 10),
            "'Sign out' button must exist in Settings"
        )
    }

    /// Tapping "Delete account" must show the confirmation alert.
    func testSettingsTabDeleteAccountButtonShowsAlert() {
        let app = launchSettingsTab()
        defer { app.terminate() }

        let deleteButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Delete account")
        ).firstMatch
        XCTAssertTrue(deleteButton.waitForExistence(timeout: 10))
        deleteButton.tap()

        let alert = app.alerts.firstMatch
        XCTAssertTrue(
            alert.waitForExistence(timeout: 5),
            "Confirmation alert must appear after tapping 'Delete account'"
        )
        XCTAssertTrue(
            alert.staticTexts.matching(
                NSPredicate(format: "label CONTAINS[c] %@", "Delete Account")
            ).firstMatch.exists,
            "Alert must be titled 'Delete Account?'"
        )
    }

    /// Tapping "Cancel" in the delete alert dismisses it and leaves Settings visible.
    func testSettingsTabDeleteAlertCancelDismissesAlert() {
        let app = launchSettingsTab()
        defer { app.terminate() }

        let deleteButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Delete account")
        ).firstMatch
        XCTAssertTrue(deleteButton.waitForExistence(timeout: 10))
        deleteButton.tap()

        let alert = app.alerts.firstMatch
        XCTAssertTrue(alert.waitForExistence(timeout: 5))

        // Tap "Cancel" inside the alert.
        alert.buttons["Cancel"].tap()

        // Alert gone — Settings nav bar must still be visible.
        XCTAssertTrue(
            app.navigationBars["Settings"].waitForExistence(timeout: 5),
            "Settings nav bar must be visible after dismissing the delete alert"
        )
        XCTAssertFalse(
            app.alerts.firstMatch.exists,
            "Alert must be dismissed after tapping Cancel"
        )
    }

    /// "Reset onboarding" debug button must exist in DEBUG builds.
    func testSettingsTabResetOnboardingButtonExists() {
        let app = launchSettingsTab()
        defer { app.terminate() }

        let resetButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Reset onboarding")
        ).firstMatch
        XCTAssertTrue(
            resetButton.waitForExistence(timeout: 10),
            "'Reset onboarding' debug button must exist in DEBUG builds"
        )
    }
}
