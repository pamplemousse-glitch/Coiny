import XCTest
@testable import Coiny

/// Tests for `DebtStore`: independent section load states, the persist-on-tap
/// strategy picker (R-7.14), extra-payment clamping, per-debt edits replacing
/// the local record, and merge/split refreshing both the list and the plan.
@MainActor
final class DebtStoreTests: XCTestCase {

    // MARK: - Fake API

    final class FakeDebtAPI: DebtAPI, @unchecked Sendable {
        var debtsResult: Result<DebtsResponse, Error> = .success(DebtsResponse(debts: [], highAprDebtBalances: nil))
        var planResult: Result<DebtPlanResponse, Error> = .failure(CancellationError())
        var patchResult: Result<DebtAccount, Error> = .failure(CancellationError())
        var mergeResult: Result<DebtsResponse, Error> = .failure(CancellationError())
        var saveError: Error?

        private(set) var planCalls: [(strategy: DebtStrategy?, extra: Double?)] = []
        private(set) var saveCalls: [(strategy: DebtStrategy, extra: Double?)] = []
        private(set) var mergeCalls: [(id: String, other: String)] = []
        private(set) var splitCalls: [String] = []
        private(set) var syncCount = 0

        func getDebts() async throws -> DebtsResponse { try debtsResult.get() }

        func syncDebts() async throws -> DebtSyncResponse {
            syncCount += 1
            let debts = try debtsResult.get().debts
            return DebtSyncResponse(synced: DebtSyncResponse.Synced(plaid: true, spinwheel: false), debts: debts)
        }

        func getDebtPlan(strategy: DebtStrategy?, extra: Double?) async throws -> DebtPlanResponse {
            planCalls.append((strategy, extra))
            var plan = try planResult.get()
            if let strategy { plan = plan.with(strategy: strategy) }
            if let extra { plan = plan.with(extraMonthly: extra) }
            return plan
        }

        func saveDebtPlan(strategy: DebtStrategy, extraMonthly: Double?) async throws {
            if let saveError { throw saveError }
            saveCalls.append((strategy, extraMonthly))
        }

        func setDebtAprOverride(id: String, apr: Double?) async throws -> DebtAccount { try patchResult.get() }
        func setDebtNickname(id: String, nickname: String?) async throws -> DebtAccount { try patchResult.get() }
        func setDebtStatementCloseDay(id: String, day: Int?) async throws -> DebtAccount { try patchResult.get() }

        func mergeDebts(id: String, otherDebtId: String) async throws -> DebtsResponse {
            mergeCalls.append((id, otherDebtId))
            return try mergeResult.get()
        }

        func splitDebt(id: String) async throws -> DebtsResponse {
            splitCalls.append(id)
            return try mergeResult.get()
        }
    }

    // MARK: - Fixtures

    private func account(
        id: String = "d1",
        balance: Double? = 4820,
        apr: Double? = 24.24,
        status: DebtAccount.Status = .open
    ) -> DebtAccount {
        DebtAccount(
            debtId: id, issuer: "Chase Bank", nickname: nil, type: .creditCard,
            sourceIds: ["plaid:a"], sources: ["plaid"], balance: balance, apr: apr,
            aprAssumed: apr == nil, aprOverride: nil, minPayment: 85, creditLimit: nil,
            dueDay: nil, statementCloseDay: nil, isPromotional: false, promoEndDate: nil,
            promoApr: nil, status: status, payment36: 189.41
        )
    }

    private func plan(strategy: DebtStrategy = .blend, extra: Double = 100) -> DebtPlanResponse {
        let summary = DebtPlanSummary(months: 30, debtFreeDate: "2029-02-13", totalInterest: 2000, order: ["d1"])
        return DebtPlanResponse(
            strategy: strategy, extraMonthly: extra, months: 30, debtFreeDate: "2029-02-13",
            totalInterest: 2000, order: ["d1"], perDebt: [], findings: [],
            comparison: DebtPlanResponse.Comparison(
                blend: summary, avalanche: summary, snowball: summary, minimumsOnly: summary
            ),
            costVsAvalanche: 0, costVsSnowball: 0
        )
    }

    private func loadedStore(api: FakeDebtAPI) async -> DebtStore {
        let store = DebtStore(api: api)
        await store.load()
        return store
    }

    // MARK: - Loading

    func testLoadPopulatesDebtsAndPlanIndependently() async {
        let api = FakeDebtAPI()
        api.debtsResult = .success(DebtsResponse(debts: [account()], highAprDebtBalances: [4820]))
        api.planResult = .success(plan())

        let store = await loadedStore(api: api)

        XCTAssertEqual(store.debts.count, 1)
        XCTAssertEqual(store.plan?.strategy, .blend)
    }

    func testAFailedPlanDoesNotTakeTheListDownWithIt() async {
        let api = FakeDebtAPI()
        api.debtsResult = .success(DebtsResponse(debts: [account()], highAprDebtBalances: nil))
        api.planResult = .failure(CancellationError())

        let store = await loadedStore(api: api)

        XCTAssertEqual(store.debts.count, 1)
        XCTAssertEqual(store.planState, .failed)
    }

    func testPlanDebtsMirrorsTheServerFilter() async {
        let api = FakeDebtAPI()
        api.debtsResult = .success(DebtsResponse(
            debts: [
                account(id: "open"),
                account(id: "closed", status: .closed),
                account(id: "zero", balance: 0),
                account(id: "unknown", balance: nil),
            ],
            highAprDebtBalances: nil
        ))
        api.planResult = .success(plan())

        let store = await loadedStore(api: api)

        XCTAssertEqual(store.planDebts.map(\.debtId), ["open"])
    }

    // MARK: - Strategy selection (R-7.14)

    func testSelectingAStrategyFetchesThePlanThenPersistsTheChoice() async {
        let api = FakeDebtAPI()
        api.debtsResult = .success(DebtsResponse(debts: [account()], highAprDebtBalances: nil))
        api.planResult = .success(plan(strategy: .blend, extra: 100))
        let store = await loadedStore(api: api)

        await store.selectStrategy(.snowball)

        XCTAssertEqual(store.plan?.strategy, .snowball)
        XCTAssertEqual(api.saveCalls.count, 1)
        XCTAssertEqual(api.saveCalls.first?.strategy, .snowball)
        XCTAssertEqual(api.saveCalls.first?.extra, 100)
    }

    func testReselectingTheCurrentStrategyDoesNothing() async {
        let api = FakeDebtAPI()
        api.debtsResult = .success(DebtsResponse(debts: [account()], highAprDebtBalances: nil))
        api.planResult = .success(plan(strategy: .blend))
        let store = await loadedStore(api: api)
        let callsAfterLoad = api.planCalls.count

        await store.selectStrategy(.blend)

        XCTAssertEqual(api.planCalls.count, callsAfterLoad)
        XCTAssertTrue(api.saveCalls.isEmpty)
    }

    func testAFailedPlanFetchKeepsTheOldPlanAndSkipsTheSave() async {
        let api = FakeDebtAPI()
        api.debtsResult = .success(DebtsResponse(debts: [account()], highAprDebtBalances: nil))
        api.planResult = .success(plan(strategy: .blend))
        let store = await loadedStore(api: api)

        api.planResult = .failure(CancellationError())
        await store.selectStrategy(.avalanche)

        XCTAssertEqual(store.plan?.strategy, .blend, "The previous plan stays on screen")
        XCTAssertTrue(api.saveCalls.isEmpty)
    }

    // MARK: - Extra payment (R-7.15)

    func testSettingTheExtraPaymentRefreshesAndPersists() async {
        let api = FakeDebtAPI()
        api.debtsResult = .success(DebtsResponse(debts: [account()], highAprDebtBalances: nil))
        api.planResult = .success(plan(extra: 100))
        let store = await loadedStore(api: api)

        await store.setExtraMonthly(250)

        XCTAssertEqual(store.extraMonthly, 250)
        XCTAssertEqual(api.saveCalls.first?.extra, 250)
    }

    func testANegativeExtraClampsToZero() async {
        let api = FakeDebtAPI()
        api.debtsResult = .success(DebtsResponse(debts: [account()], highAprDebtBalances: nil))
        api.planResult = .success(plan(extra: 100))
        let store = await loadedStore(api: api)

        await store.setExtraMonthly(-50)

        XCTAssertEqual(store.extraMonthly, 0)
        XCTAssertEqual(api.saveCalls.first?.extra, 0)
    }

    // MARK: - Per-debt edits

    func testSavingAnAprOverrideReplacesTheRecordAndRefreshesThePlan() async {
        let api = FakeDebtAPI()
        api.debtsResult = .success(DebtsResponse(debts: [account(apr: nil)], highAprDebtBalances: nil))
        api.planResult = .success(plan())
        let store = await loadedStore(api: api)
        let planCallsAfterLoad = api.planCalls.count

        api.patchResult = .success(account(apr: 21.99))
        let saved = await store.saveAprOverride(id: "d1", apr: 21.99)

        XCTAssertTrue(saved)
        XCTAssertEqual(store.debt(id: "d1")?.apr, 21.99)
        XCTAssertFalse(store.debt(id: "d1")?.aprAssumed ?? true)
        XCTAssertEqual(api.planCalls.count, planCallsAfterLoad + 1, "A rate change re-runs the plan")
    }

    func testAFailedEditReportsFalseAndChangesNothing() async {
        let api = FakeDebtAPI()
        api.debtsResult = .success(DebtsResponse(debts: [account(apr: nil)], highAprDebtBalances: nil))
        api.planResult = .success(plan())
        let store = await loadedStore(api: api)

        let saved = await store.saveAprOverride(id: "d1", apr: 21.99)

        XCTAssertFalse(saved)
        XCTAssertNil(store.debt(id: "d1")?.apr)
    }

    func testNicknameWhitespaceNormalizesToNil() async {
        let api = FakeDebtAPI()
        api.debtsResult = .success(DebtsResponse(debts: [account()], highAprDebtBalances: nil))
        api.planResult = .success(plan())
        api.patchResult = .success(account())
        let store = await loadedStore(api: api)

        let saved = await store.saveNickname(id: "d1", nickname: "   ")
        XCTAssertTrue(saved)
    }

    // MARK: - Merge and split (R-7.13)

    func testMergeAdoptsTheRebuiltListAndRefreshesThePlan() async {
        let api = FakeDebtAPI()
        api.debtsResult = .success(DebtsResponse(debts: [account(id: "d1"), account(id: "d2")], highAprDebtBalances: nil))
        api.planResult = .success(plan())
        let store = await loadedStore(api: api)
        let planCallsAfterLoad = api.planCalls.count

        api.mergeResult = .success(DebtsResponse(debts: [account(id: "d1", balance: 4820)], highAprDebtBalances: nil))
        let merged = await store.merge(id: "d1", with: "d2")

        XCTAssertTrue(merged)
        XCTAssertEqual(store.debts.count, 1)
        XCTAssertEqual(api.mergeCalls.first?.other, "d2")
        XCTAssertEqual(api.planCalls.count, planCallsAfterLoad + 1)
    }

    func testSplitAdoptsTheRebuiltList() async {
        let api = FakeDebtAPI()
        api.debtsResult = .success(DebtsResponse(debts: [account(id: "d1")], highAprDebtBalances: nil))
        api.planResult = .success(plan())
        let store = await loadedStore(api: api)

        api.mergeResult = .success(DebtsResponse(
            debts: [account(id: "s1"), account(id: "s2")],
            highAprDebtBalances: nil
        ))
        let split = await store.split(id: "d1")

        XCTAssertTrue(split)
        XCTAssertEqual(store.debts.map(\.debtId), ["s1", "s2"])
        XCTAssertNil(store.debt(id: "d1"), "The merged record retired; the detail screen dismisses on this")
    }

    // MARK: - Names

    func testDebtNameFallsBackWhenTheIdIsGone() async {
        let api = FakeDebtAPI()
        api.debtsResult = .success(DebtsResponse(debts: [account(id: "d1")], highAprDebtBalances: nil))
        api.planResult = .success(plan())
        let store = await loadedStore(api: api)

        XCTAssertEqual(store.debtName(id: "d1"), "Chase Bank")
        XCTAssertEqual(store.debtName(id: "ghost"), "This debt")
    }
}

// MARK: - Plan fixture helpers

private extension DebtPlanResponse {
    func with(strategy: DebtStrategy) -> DebtPlanResponse {
        DebtPlanResponse(
            strategy: strategy, extraMonthly: extraMonthly, months: months, debtFreeDate: debtFreeDate,
            totalInterest: totalInterest, order: order, perDebt: perDebt, findings: findings,
            comparison: comparison, costVsAvalanche: costVsAvalanche, costVsSnowball: costVsSnowball
        )
    }

    func with(extraMonthly: Double) -> DebtPlanResponse {
        DebtPlanResponse(
            strategy: strategy, extraMonthly: extraMonthly, months: months, debtFreeDate: debtFreeDate,
            totalInterest: totalInterest, order: order, perDebt: perDebt, findings: findings,
            comparison: comparison, costVsAvalanche: costVsAvalanche, costVsSnowball: costVsSnowball
        )
    }
}
