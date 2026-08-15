import XCTest
@testable import Coiny

// MARK: - Fake API

/// Scriptable fake for the onboarding API slice. `@unchecked Sendable` behind
/// an NSLock, matching the other test fakes in this target.
final class FakeOnboardingAPI: OnboardingAPI, @unchecked Sendable {
    private let lock = NSLock()

    private var _linkTokenResult: Result<String, Error> = .success("link-sandbox-token")
    private var _subscriptions: [DetectedSubscription] = []
    private var _recurring = PlaidRecurringResponse(inflow: [], outflow: [])
    private var _netWorthJSON: String?
    private var _ladder: OnboardingLadderSnapshot = OnboardingLadderSnapshot(ladder: nil)
    private var _exchangeCalls = 0

    var exchangeCalls: Int {
        lock.lock(); defer { lock.unlock() }
        return _exchangeCalls
    }

    func setLinkTokenFailure(_ error: Error) {
        lock.lock(); defer { lock.unlock() }
        _linkTokenResult = .failure(error)
    }

    func setSubscriptions(_ subs: [DetectedSubscription]) {
        lock.lock(); defer { lock.unlock() }
        _subscriptions = subs
    }

    func setNetWorthJSON(_ json: String) {
        lock.lock(); defer { lock.unlock() }
        _netWorthJSON = json
    }

    func setLadder(_ snapshot: OnboardingLadderSnapshot) {
        lock.lock(); defer { lock.unlock() }
        _ladder = snapshot
    }

    func createLinkToken() async throws -> String {
        lock.lock(); defer { lock.unlock() }
        return try _linkTokenResult.get()
    }

    @discardableResult
    func exchangePublicToken(_ publicToken: String) async throws -> EmptyResponse {
        lock.lock(); defer { lock.unlock() }
        _exchangeCalls += 1
        return try JSONDecoder().decode(EmptyResponse.self, from: Data("{}".utf8))
    }

    func getSubscriptions() async throws -> [DetectedSubscription] {
        lock.lock(); defer { lock.unlock() }
        return _subscriptions
    }

    func getPlaidRecurring() async throws -> PlaidRecurringResponse {
        lock.lock(); defer { lock.unlock() }
        return _recurring
    }

    func getNetWorth() async throws -> NetWorthResponse {
        lock.lock(); defer { lock.unlock() }
        guard let json = _netWorthJSON else { throw URLError(.timedOut) }
        let decoder = JSONDecoder()
        // The response now carries ISO dates (generatedAt, per-class asOf).
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(NetWorthResponse.self, from: Data(json.utf8))
    }

    func getOnboardingLadderSnapshot() async throws -> OnboardingLadderSnapshot {
        lock.lock(); defer { lock.unlock() }
        return _ladder
    }

    private var _serverDeclaredLines: [DeclaredAssetLineDTO] = []
    private var _putDeclaredSheets: [DeclarationSheet] = []
    private var _putDeclaredShouldHang = false

    var putDeclaredSheets: [DeclarationSheet] {
        lock.lock(); defer { lock.unlock() }
        return _putDeclaredSheets
    }

    func setServerDeclaredLines(_ lines: [DeclaredAssetLineDTO]) {
        lock.lock(); defer { lock.unlock() }
        _serverDeclaredLines = lines
    }

    /// Simulates a server write that never completes, to prove the flow does
    /// not sit on the critical path behind it.
    func setPutDeclaredHangs() {
        lock.lock(); defer { lock.unlock() }
        _putDeclaredShouldHang = true
    }

    func getDeclaredAssets() async throws -> DeclaredSheetResponse {
        lock.lock(); defer { lock.unlock() }
        return DeclaredSheetResponse(assets: _serverDeclaredLines, nudge: nil)
    }

    @discardableResult
    func putDeclaredAssets(_ sheet: DeclarationSheet) async throws -> DeclaredSheetResponse {
        let hang: Bool
        do {
            lock.lock(); defer { lock.unlock() }
            _putDeclaredSheets.append(sheet)
            hang = _putDeclaredShouldHang
        }
        if hang {
            try await Task.sleep(for: .seconds(60))
        }
        return DeclaredSheetResponse(assets: [], nudge: nil)
    }
}

// MARK: - Tests

@MainActor
final class OnboardingViewModelTests: XCTestCase {
    private var api = FakeOnboardingAPI()
    private var transport = RecordingTelemetryTransport()

    override func setUp() {
        super.setUp()
        api = FakeOnboardingAPI()
        transport = RecordingTelemetryTransport()
    }

    private func makeViewModel() -> OnboardingViewModel {
        let defaults = UserDefaults(suiteName: "OnboardingViewModelTests")!
        defaults.removePersistentDomain(forName: "OnboardingViewModelTests")
        return OnboardingViewModel(
            api: api,
            telemetry: TelemetryClient(transport: transport),
            store: DeclaredAssetsStore(defaults: defaults),
            revealWaitBudget: .milliseconds(200)
        )
    }

    private func flushedEventNames(_ viewModel: OnboardingViewModel) async -> [String] {
        await viewModel.flushTelemetry()
        return transport.events.map(\.event)
    }

    private func waitUntil(
        timeout: Duration = .seconds(2),
        _ condition: () -> Bool
    ) async {
        let deadline = ContinuousClock.now.advanced(by: timeout)
        while !condition() && ContinuousClock.now < deadline {
            try? await Task.sleep(for: .milliseconds(10))
        }
    }

    private static let minimalNetWorthJSON = """
    {
      "total": 342880, "bank": 342880, "investments": 0, "crypto": 0, "defi": 0,
      "chainWallets": 0, "hyperliquid": 0, "realEstate": 0, "vehicles": 0,
      "metals": 0, "sneakers": 0, "kraken": 0, "ynab": 0, "debts": 0,
      "accounts": {
        "bank": [
          {"accountId": "a1", "name": "Checking", "type": "depository", "balance": 342880},
          {"accountId": "a2", "name": "Savings", "type": "depository", "balance": 0},
          {"accountId": "a3", "name": "Card", "type": "credit", "balance": 0},
          {"accountId": "a4", "name": "Brokerage", "type": "investment", "balance": 0}
        ],
        "investments": [], "crypto": [], "defi": {"totalUSD": 0}, "debts": []
      },
      "connections": {
        "coinbase": false, "zerion": false, "spinwheel": false, "kraken": false, "ynab": false
      },
      "classes": {
        "bank": {"value": 342880, "asOf": "2026-08-13T04:00:00Z", "status": "ok"}
      },
      "excluded": {"count": 0, "classes": []},
      "generatedAt": "2026-08-13T05:00:00Z"
    }
    """

    // MARK: Step flow

    // signup_completed is a server-only event, emitted by the backend from
    // findOrCreateUser so a device cannot forge a cohort's day 0. start() only
    // anchors the local clock that seconds_since_signup is measured against.
    func testStartNeverEmitsTheServerOnlySignupEvent() async {
        let viewModel = makeViewModel()
        await viewModel.start()
        await viewModel.start()
        let names = await flushedEventNames(viewModel)
        XCTAssertFalse(names.contains("signup_completed"))
    }

    func testEmptyDeclarationSkipsAmountsAndNumber() async {
        let viewModel = makeViewModel()
        await viewModel.continueFromEgg()
        viewModel.selectedClasses = []
        await viewModel.continueFromDeclare()
        XCTAssertEqual(viewModel.step, .connect)
    }

    func testDeclarationWithValuesReachesTheNumberScreen() async {
        let viewModel = makeViewModel()
        await viewModel.start()
        await viewModel.continueFromEgg()
        viewModel.selectedClasses = [.checking, .studentLoans]
        await viewModel.continueFromDeclare()
        XCTAssertEqual(viewModel.step, .amounts)

        viewModel.setDeclaredValue(10_000, for: .checking)
        viewModel.setDeclaredValue(4_000, for: .studentLoans)
        await viewModel.continueFromAmounts()
        XCTAssertEqual(viewModel.step, .number)
        XCTAssertEqual(viewModel.sheet.estimatedNetWorthUSD, 6_000)
    }

    func testAllAmountsSkippedGoesStraightToConnect() async {
        let viewModel = makeViewModel()
        await viewModel.continueFromEgg()
        viewModel.selectedClasses = [.crypto]
        await viewModel.continueFromDeclare()
        await viewModel.continueFromAmounts()
        XCTAssertEqual(viewModel.step, .connect, "no valued line means no number to show")
    }

    func testNumberShownEmitsFirstNumberOnce() async {
        let viewModel = makeViewModel()
        await viewModel.start()
        await viewModel.numberShown()
        await viewModel.numberShown()
        let names = await flushedEventNames(viewModel)
        XCTAssertEqual(names.filter { $0 == "first_number_shown" }.count, 1)
    }

    // MARK: Connection outcomes

    func testSkipConnectionLandsOnDisconnectedHatch() async {
        let viewModel = makeViewModel()
        await viewModel.skipConnection()
        XCTAssertEqual(viewModel.step, .hatch)
        XCTAssertTrue(viewModel.isDisconnectedHatch)
        XCTAssertTrue(viewModel.hatchInstruction.contains("Connect the account you spend from"))
    }

    func testLinkAbandonmentIsNeverTerminal() async {
        let viewModel = makeViewModel()
        await viewModel.linkExited(hadError: false, exitStatus: "requiresCredentials")
        XCTAssertEqual(viewModel.step, .hatch)
        XCTAssertTrue(viewModel.isDisconnectedHatch)
        let names = await flushedEventNames(viewModel)
        XCTAssertTrue(names.contains("link_result"))
        XCTAssertTrue(names.contains("pet_hatched"))
    }

    func testOfflineLinkTokenFailureSetsOfflineNotDeadEnd() async {
        api.setLinkTokenFailure(API.APIError.transport(underlying: URLError(.notConnectedToInternet)))
        let viewModel = makeViewModel()
        let token = await viewModel.prepareLink()
        XCTAssertNil(token)
        XCTAssertTrue(viewModel.isOffline)
        viewModel.retryAfterOffline()
        XCTAssertFalse(viewModel.isOffline)
    }

    func testSuccessfulLinkWithZeroSubscriptionsSkipsRevealEntirely() async {
        let viewModel = makeViewModel()
        await viewModel.linkSucceeded(publicToken: "public-token")
        XCTAssertEqual(viewModel.step, .hatch, "R-5.6: empty reveal must never render")
        XCTAssertFalse(viewModel.isDisconnectedHatch)
        XCTAssertEqual(api.exchangeCalls, 1)
        let names = await flushedEventNames(viewModel)
        XCTAssertFalse(names.contains("subscriptions_revealed"))
    }

    func testSuccessfulLinkWithSubscriptionsShowsReveal() async {
        api.setSubscriptions([
            DetectedSubscription(merchantName: "Netflix", cadenceDays: 30, amount: 17.99, count: 5, lastDate: "2026-08-01"),
        ])
        let viewModel = makeViewModel()
        await viewModel.linkSucceeded(publicToken: "public-token")
        XCTAssertEqual(viewModel.step, .reveal)
        XCTAssertEqual(viewModel.revealItems.map(\.merchantName), ["Netflix"])

        await viewModel.continueFromReveal()
        XCTAssertEqual(viewModel.step, .hatch)
        let names = await flushedEventNames(viewModel)
        XCTAssertTrue(names.contains("subscriptions_revealed"))
    }

    // MARK: Hatch copy

    func testHatchGreetingUsesConnectedNumbersWhenAvailable() async {
        api.setNetWorthJSON(Self.minimalNetWorthJSON)
        let viewModel = makeViewModel()
        await viewModel.linkSucceeded(publicToken: "public-token")
        await waitUntil { viewModel.connectedTotalUSD != nil }
        XCTAssertEqual(
            viewModel.hatchGreeting,
            "Oh. Hello. I can see 4 accounts and $342,880. Give me a minute."
        )
    }

    func testHatchInstructionUsesActiveRungWhenPresent() async {
        api.setNetWorthJSON(Self.minimalNetWorthJSON)
        api.setLadder(OnboardingLadderSnapshot(ladder: OnboardingLadderView(
            currentRung: 1,
            activeRung: OnboardingActiveRung(
                id: 1,
                name: "Floor",
                stage: "Hatchling",
                blurb: "A starter buffer, so a flat tyre is not a crisis.",
                target: 2_000,
                gap: 1_340,
                indeterminate: false
            )
        )))
        let viewModel = makeViewModel()
        await viewModel.linkSucceeded(publicToken: "public-token")
        await waitUntil { viewModel.hatchInstruction.contains("Floor") }
        XCTAssertEqual(
            viewModel.hatchInstruction,
            "Your next rung is Floor: $2,000. You are $1,340 away."
        )
    }

    func testHatchInstructionFallsBackToStarterBuffer() async {
        let viewModel = makeViewModel()
        await viewModel.linkSucceeded(publicToken: "public-token")
        XCTAssertEqual(
            viewModel.hatchInstruction,
            "Your next rung is a $2,000 buffer. That is where we start."
        )
    }

    // MARK: Finish

    func testFinishFlushesAndCompletes() async {
        let viewModel = makeViewModel()
        await viewModel.start()
        await viewModel.skipNotifications()
        XCTAssertTrue(viewModel.completed)
        // Flushing is what is under test: the queue must reach the transport
        // rather than sit there when the flow ends.
        XCTAssertTrue(transport.events.map(\.event).contains("onboarding_step_completed"))
    }

    func testNotificationResolutionEmitsPermissionChange() async {
        let viewModel = makeViewModel()
        await viewModel.notificationPermissionResolved(granted: true)
        XCTAssertTrue(viewModel.completed)
        let permissionEvents = transport.events.filter { $0.event == "push_permission_changed" }
        XCTAssertEqual(permissionEvents.count, 1)
        XCTAssertEqual(permissionEvents.first?.properties["granted"], .bool(true))
    }

    // MARK: Declared-assets server sync (R-5.3)

    func testAmountsSubmitPushesTheSheetToTheServer() async {
        let viewModel = makeViewModel()
        await viewModel.continueFromEgg()
        viewModel.selectedClasses = [.checking, .creditCards]
        await viewModel.continueFromDeclare()
        viewModel.setDeclaredValue(5_000, for: .checking)
        viewModel.setDeclaredValue(2_000, for: .creditCards)
        await viewModel.continueFromAmounts()

        await waitUntil { !self.api.putDeclaredSheets.isEmpty }
        let pushed = api.putDeclaredSheets.first
        XCTAssertEqual(pushed?.assets.map(\.assetClass), [.checking, .creditCards])
    }

    func testNumberNeverWaitsOnTheServerWrite() async {
        api.setPutDeclaredHangs()
        let viewModel = makeViewModel()
        await viewModel.continueFromEgg()
        viewModel.selectedClasses = [.savings]
        await viewModel.continueFromDeclare()
        viewModel.setDeclaredValue(10_000, for: .savings)
        await viewModel.continueFromAmounts()
        // The hung PUT must not stop screen 4 from being the current step.
        XCTAssertEqual(viewModel.step, .number)
    }

    func testFreshInstallRestoresTheServerSheetIntoTheFlow() async {
        let declaredAt = Date(timeIntervalSince1970: 1_700_000_000)
        api.setServerDeclaredLines([
            DeclaredAssetLineDTO(
                assetClass: "checking",
                bucketedValueUsd: 5_000,
                confidence: "declared",
                declaredAt: declaredAt,
                refreshedAt: declaredAt
            ),
            DeclaredAssetLineDTO(
                assetClass: "student_loans",
                bucketedValueUsd: 20_000,
                confidence: "declared",
                declaredAt: declaredAt,
                refreshedAt: declaredAt
            ),
        ])
        let viewModel = makeViewModel()
        await viewModel.start()

        await waitUntil { !viewModel.selectedClasses.isEmpty }
        XCTAssertEqual(viewModel.selectedClasses, [.checking, .studentLoans])
        XCTAssertEqual(viewModel.sheet.estimatedNetWorthUSD, -15_000)
    }

    func testRestoreNeverOverwritesAnInProgressDeclaration() async {
        let declaredAt = Date(timeIntervalSince1970: 1_700_000_000)
        api.setServerDeclaredLines([
            DeclaredAssetLineDTO(
                assetClass: "home",
                bucketedValueUsd: 300_000,
                confidence: "declared",
                declaredAt: declaredAt,
                refreshedAt: declaredAt
            ),
        ])
        let viewModel = makeViewModel()
        await viewModel.continueFromEgg()
        viewModel.selectedClasses = [.crypto]
        // The user is already choosing; a late server response must not clobber.
        await viewModel.start()
        await waitUntil(timeout: .milliseconds(300)) { false }
        XCTAssertEqual(viewModel.selectedClasses, [.crypto])
    }

    func testReselectingAChipKeepsItsRestoredValue() async {
        let viewModel = makeViewModel()
        await viewModel.continueFromEgg()
        viewModel.selectedClasses = [.car]
        await viewModel.continueFromDeclare()
        viewModel.setDeclaredValue(12_000, for: .car)
        // Going back to the chips and re-confirming must not wipe the amount.
        viewModel.selectedClasses = [.car, .savings]
        await viewModel.continueFromDeclare()
        XCTAssertEqual(viewModel.sheet.assets.first { $0.assetClass == .car }?.bucketedValueUSD, 12_000)
    }
}
