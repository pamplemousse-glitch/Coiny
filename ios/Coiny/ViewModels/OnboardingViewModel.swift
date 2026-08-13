import Foundation
import Observation

// MARK: - API seam

/// The slice of the API the onboarding flow needs, behind a protocol so tests
/// can drive the whole state machine without the network (same pattern as
/// `PetStoreAPI`).
protocol OnboardingAPI: Sendable {
    func createLinkToken() async throws -> String
    @discardableResult
    func exchangePublicToken(_ publicToken: String) async throws -> EmptyResponse
    func getSubscriptions() async throws -> [DetectedSubscription]
    func getPlaidRecurring() async throws -> PlaidRecurringResponse
    func getNetWorth() async throws -> NetWorthResponse
    func getOnboardingLadderSnapshot() async throws -> OnboardingLadderSnapshot
}

extension API: OnboardingAPI {}

// MARK: - View model

/// State machine for the PRD section 5.2 screen sequence. Screen 0 (sign in)
/// lives in `SignInView`; this flow owns screens 1 through 8.
///
/// R-5.1 budget notes: the assembled (declared) number renders on screen 4,
/// before any network dependency, so `first_number_shown` does not wait on
/// Plaid. The subscription reveal renders only when detection data arrived
/// within its small wait budget (R-5.6); otherwise it is skipped so it can
/// never push the hatch past the 3-minute target.
@Observable
@MainActor
final class OnboardingViewModel {
    enum Step: Equatable {
        case egg
        case declare
        case amounts
        case number
        case connect
        case reveal
        case hatch
        case notifications
    }

    enum ConnectionOutcome: Equatable {
        case notAttempted
        case connected
        case abandoned
        case failed
    }

    // MARK: State

    private(set) var step: Step = .egg
    private(set) var completed = false

    /// Chip selection on screen 2.
    var selectedClasses: Set<DeclaredAssetClass> = []
    /// The declaration built across screens 2 and 3.
    private(set) var sheet = DeclarationSheet()

    /// Plaid link progress.
    private(set) var isPreparingLink = false
    private(set) var isExchangingToken = false
    private(set) var linkErrorMessage: String?
    /// Offline is a dedicated screen with retry, never a dead end (R-8.8).
    private(set) var isOffline = false
    private(set) var connectionOutcome: ConnectionOutcome = .notAttempted

    /// Screen 6 data, assembled before the screen renders (never a live wait).
    private(set) var revealItems: [RevealItem] = []
    var revealAnnualTotalUSD: Double { RevealBuilder.annualTotalUSD(revealItems) }

    /// Hatch data. Nil fields simply drop out of the copy; never rendered as 0.
    private(set) var connectedAccountCount: Int?
    private(set) var connectedTotalUSD: Double?
    private(set) var activeRung: OnboardingActiveRung?

    // MARK: Dependencies

    private let api: OnboardingAPI
    private let telemetry: TelemetryClient
    private let store: DeclaredAssetsStore
    private let now: @Sendable () -> Date
    /// How long screen 6 may wait for detection data before being skipped.
    let revealWaitBudget: Duration

    private var signupAt: Date?
    private var emittedFirstNumber = false
    /// Monotonic position in the funnel, sent with every onboarding_step_completed.
    private var stepIndex = 0

    init(
        api: OnboardingAPI = API.shared,
        telemetry: TelemetryClient = .shared,
        store: DeclaredAssetsStore = DeclaredAssetsStore(),
        now: @escaping @Sendable () -> Date = { Date() },
        revealWaitBudget: Duration = .seconds(6)
    ) {
        self.api = api
        self.telemetry = telemetry
        self.store = store
        self.now = now
        self.revealWaitBudget = revealWaitBudget
    }

    // MARK: Flow

    /// Called once when the flow appears, immediately after sign-in. Starts the
    /// R-5.1 clock.
    ///
    /// Deliberately emits nothing: `signup_completed` is a server-only event
    /// (the backend emits it from findOrCreateUser) precisely so a device
    /// cannot forge the cohort's day 0. This only anchors the local clock that
    /// seconds_since_signup is measured against.
    func start() async {
        guard signupAt == nil else { return }
        signupAt = now()
    }

    func continueFromEgg() async {
        await completeStep("egg")
        step = .declare
    }

    /// Screen 2 submit. An empty selection is a legitimate "not now": the flow
    /// skips straight to the connection ask, because there is nothing to size
    /// and no number to assemble.
    func continueFromDeclare() async {
        await completeStep("declare")
        sheet = DeclarationSheet(assets: orderedSelection.map {
            DeclaredAsset(assetClass: $0, bucketedValueUSD: nil, declaredAt: now())
        })
        step = sheet.isEmpty ? .connect : .amounts
    }

    /// Ordered per the canonical chip order, not selection order.
    private var orderedSelection: [DeclaredAssetClass] {
        DeclaredAssetClass.allCases.filter { selectedClasses.contains($0) }
    }

    func setDeclaredValue(_ value: Double?, for assetClass: DeclaredAssetClass) {
        guard let index = sheet.assets.firstIndex(where: { $0.assetClass == assetClass }) else { return }
        sheet.assets[index].bucketedValueUSD = value
        sheet.assets[index].declaredAt = now()
    }

    /// Screen 3 submit: persist, emit, and show the number when there is one.
    func continueFromAmounts() async {
        store.save(sheet)
        await telemetry.emit("onboarding_declared", sheet.telemetryProperties)
        await completeStep("amounts")
        step = sheet.estimatedNetWorthUSD == nil ? .connect : .number
    }

    /// Screen 4 appeared: the first assembled number is on screen.
    func numberShown() async {
        await emitFirstNumberIfNeeded(classCount: sheet.classCount)
    }

    func continueFromNumber() async {
        await completeStep("number")
        step = .connect
    }

    // MARK: Plaid Link

    /// Creates a link token. A transport failure here is the offline case:
    /// a clear screen with retry, sign-in state untouched.
    func prepareLink() async -> String? {
        isPreparingLink = true
        isOffline = false
        linkErrorMessage = nil
        defer { isPreparingLink = false }
        await telemetry.emit("link_opened", [
            "provider": .string("plaid"),
            "source": .string("onboarding"),
        ])
        do {
            return try await api.createLinkToken()
        } catch let error as API.APIError {
            if case .transport = error {
                isOffline = true
            } else {
                linkErrorMessage = "Plaid could not start. Try again."
            }
            return nil
        } catch {
            linkErrorMessage = "Plaid could not start. Try again."
            return nil
        }
    }

    func retryAfterOffline() {
        isOffline = false
        linkErrorMessage = nil
    }

    func linkSucceeded(publicToken: String) async {
        isExchangingToken = true
        defer { isExchangingToken = false }
        do {
            try await api.exchangePublicToken(publicToken)
            connectionOutcome = .connected
            UserDefaults.standard.set(true, forKey: "bankLinked")
            await telemetry.emit("link_result", [
                "provider": .string("plaid"),
                "status": .string("success"),
            ])
            await completeStep("connect")
            await assembleAfterConnection()
        } catch {
            connectionOutcome = .failed
            await telemetry.emit("link_result", [
                "provider": .string("plaid"),
                "status": .string("error"),
            ])
            await goToHatch()
        }
    }

    /// Link exited without success. Abandonment is never terminal (R-8.8): the
    /// user lands on the hatch with the Disconnected creature and a persistent
    /// connect affordance.
    func linkExited(hadError: Bool, exitStatus: String?) async {
        connectionOutcome = hadError ? .failed : .abandoned
        var props: [String: TelemetryValue] = [
            "provider": .string("plaid"),
            "status": .string(hadError ? "error" : "abandoned"),
        ]
        if let exitStatus {
            props["exit_status"] = .string(exitStatus)
        }
        await telemetry.emit("link_result", props)
        await goToHatch()
    }

    /// User chose "Not now" on the connect screen.
    func skipConnection() async {
        connectionOutcome = .abandoned
        await completeStep("connect_skipped")
        await goToHatch()
    }

    /// Returns to the connect step from the disconnected hatch.
    func connectFromHatch() {
        step = .connect
    }

    // MARK: Post-connection assembly

    /// Fires the reveal fetch (hard-capped by `revealWaitBudget`) and the
    /// net worth and ladder fetches (which only enrich the hatch copy when
    /// they arrive; the hatch never waits for them).
    private func assembleAfterConnection() async {
        // Background enrichment: hatch copy improves if these land in time.
        Task { [weak self] in
            await self?.fetchHatchData()
        }

        let budget = revealWaitBudget
        let fetched = await withTimeout(budget) { [api] in
            async let localTask = api.getSubscriptions()
            async let streamsTask = api.getPlaidRecurring()
            let local = (try? await localTask) ?? []
            let streams = (try? await streamsTask)?.outflow ?? []
            return RevealBuilder.merge(local: local, streams: streams)
        }

        let items = fetched ?? []
        if items.isEmpty {
            // R-5.6: zero detected, or not detected in time. The screen does
            // not render; the deferred Activity-card reveal is backend work.
            await goToHatch()
        } else {
            revealItems = items
            step = .reveal
            await telemetry.emit("subscriptions_revealed", [
                "subscription_count_band": .string(Self.countBand(items.count)),
            ])
        }
    }

    func continueFromReveal() async {
        await completeStep("reveal")
        await goToHatch()
    }

    private func fetchHatchData() async {
        if let netWorth = try? await api.getNetWorth() {
            connectedTotalUSD = netWorth.total
            connectedAccountCount = netWorth.accounts.bank.count
            await emitFirstNumberIfNeeded(classCount: sheet.classCount)
        }
        // The net worth request triggers the goal refresh server-side, so the
        // ladder is only meaningful after it.
        if let snapshot = try? await api.getOnboardingLadderSnapshot() {
            activeRung = snapshot.ladder?.activeRung
        }
    }

    // MARK: Hatch

    private func goToHatch() async {
        guard step != .hatch else { return }
        step = .hatch
        await telemetry.emit("pet_hatched", ["seconds_since_signup": .int(secondsSinceSignup() ?? 0)])
    }

    var isDisconnectedHatch: Bool {
        connectionOutcome != .connected
    }

    /// The pet's greeting on the hatch (S-3 with computed numbers when the
    /// connection delivered them in time).
    var hatchGreeting: String {
        guard connectionOutcome == .connected else {
            return "Still dark in here. Connect an account and it wakes up."
        }
        if let count = connectedAccountCount, count > 0, let total = connectedTotalUSD {
            let accounts = count == 1 ? "1 account" : "\(count) accounts"
            return "Oh. Hello. I can see \(accounts) and \(MoneyText.usd(total)). Give me a minute."
        }
        return "Oh. Hello. Give me a minute while I look around."
    }

    /// The one specific instruction (PRD section 1.4, day-one variant). One
    /// sentence about what comes next, never a tour.
    var hatchInstruction: String {
        guard connectionOutcome == .connected else {
            return "Connect the account you spend from and Coiny wakes up."
        }
        if let rung = activeRung, !rung.indeterminate, let target = rung.target, target > 0 {
            let head = "Your next rung is \(rung.name): \(MoneyText.usd(target))."
            if let gap = rung.gap, gap > 0 {
                return head + " You are \(MoneyText.usd(gap)) away."
            }
            return head
        }
        // Fallback mirrors STARTER_BUFFER_USD (backend/src/goals/ladder.ts).
        return "Your next rung is a \(MoneyText.usd(2_000)) buffer. That is where we start."
    }

    func continueFromHatch() async {
        await completeStep("hatch")
        step = .notifications
    }

    // MARK: Notifications and finish

    func notificationPermissionResolved(granted: Bool) async {
        await telemetry.emit("push_permission_changed", ["granted": .bool(granted)])
        await finish()
    }

    func skipNotifications() async {
        // Recorded so the app shell honors the decline: CoinyApp checks this
        // before its own request on RootView appear. Without it a user who
        // tapped "Not now" here would be prompted anyway one screen later,
        // because declining our screen leaves the system status .notDetermined.
        UserDefaults.standard.set(true, forKey: "pushPromptDeclinedInOnboarding")
        await completeStep("notifications_skipped")
        await finish()
    }

    func finish() async {
        await completeStep("done")
        await telemetry.flush()
        completed = true
    }

    /// Flush hook for scene-phase changes so queued events survive an early exit.
    func flushTelemetry() async {
        await telemetry.flush()
    }

    // MARK: Helpers

    private func completeStep(_ name: String) async {
        // step_index is required by the server schema, and it is what makes the
        // funnel orderable without hard-coding the screen order in the query.
        await telemetry.emit("onboarding_step_completed", [
            "step": .string(name),
            "step_index": .int(stepIndex),
        ])
        stepIndex += 1
    }

    /// Bands the count so the event carries a magnitude, never an exact tally
    /// that could narrow down who a user is.
    static func countBand(_ count: Int) -> String {
        switch count {
        case ..<1: return "0"
        case ..<3: return "1-2"
        case ..<6: return "3-5"
        case ..<11: return "6-10"
        default: return "11+"
        }
    }

    private func emitFirstNumberIfNeeded(classCount: Int) async {
        guard !emittedFirstNumber else { return }
        emittedFirstNumber = true
        await telemetry.emit("first_number_shown", [
            "class_count": .int(classCount),
            "seconds_since_signup": .int(secondsSinceSignup() ?? 0),
        ])
    }

    private func secondsSinceSignup() -> Int? {
        guard let signupAt else { return nil }
        return Int(now().timeIntervalSince(signupAt).rounded())
    }
}

// MARK: - Timeout

/// Races an operation against a deadline; nil when the deadline wins. The
/// operation task is cancelled on timeout.
func withTimeout<T: Sendable>(
    _ duration: Duration,
    operation: @escaping @Sendable () async -> T
) async -> T? {
    await withTaskGroup(of: T?.self) { group in
        group.addTask { await operation() }
        group.addTask {
            try? await Task.sleep(for: duration)
            return nil
        }
        let first = await group.next() ?? nil
        group.cancelAll()
        return first
    }
}
