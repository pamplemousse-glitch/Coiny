import Foundation
import Observation

/// Slice of the API surface the debt screen depends on, behind a protocol so
/// tests drive the store without the network actor.
protocol DebtAPI: Sendable {
    func getDebts() async throws -> DebtsResponse
    func syncDebts() async throws -> DebtSyncResponse
    func getDebtPlan(strategy: DebtStrategy?, extra: Double?) async throws -> DebtPlanResponse
    func saveDebtPlan(strategy: DebtStrategy, extraMonthly: Double?) async throws
    func setDebtAprOverride(id: String, apr: Double?) async throws -> DebtAccount
    func setDebtNickname(id: String, nickname: String?) async throws -> DebtAccount
    func setDebtStatementCloseDay(id: String, day: Int?) async throws -> DebtAccount
    func mergeDebts(id: String, otherDebtId: String) async throws -> DebtsResponse
    func splitDebt(id: String) async throws -> DebtsResponse
}

extension API: DebtAPI {}

/// Observable store for the debt surface: the merged list, the payoff plan,
/// and the user-owned edits (strategy, extra payment, APR override, merge and
/// split verdicts). Strategy changes persist immediately (R-7.14); every plan
/// number on screen comes from the server's math, never a local estimate.
@Observable
@MainActor
final class DebtStore {
    enum DebtsState: Equatable {
        case loading
        case loaded([DebtAccount])
        case failed
    }

    enum PlanState: Equatable {
        case loading
        case loaded(DebtPlanResponse)
        case failed
    }

    private(set) var debtsState: DebtsState = .loading
    private(set) var planState: PlanState = .loading
    /// True while a strategy/extra change is in flight; the plan block dims
    /// rather than flashing back to a skeleton.
    private(set) var isUpdatingPlan = false
    private(set) var isSyncing = false
    private let api: DebtAPI

    init(api: DebtAPI = API.shared) {
        self.api = api
    }

    var debts: [DebtAccount] {
        guard case let .loaded(list) = debtsState else { return [] }
        return list
    }

    /// Debts the plan simulates: open, positive balance. Mirrors the server's
    /// `toPlanInputs` filter so the list and the plan never disagree.
    var planDebts: [DebtAccount] {
        debts.filter { $0.status != .closed && ($0.balance ?? 0) > 0 }
    }

    var plan: DebtPlanResponse? {
        guard case let .loaded(plan) = planState else { return nil }
        return plan
    }

    func debt(id: String) -> DebtAccount? {
        debts.first { $0.debtId == id }
    }

    func debtName(id: String) -> String {
        debt(id: id).map(DebtPresentation.displayName(for:)) ?? "This debt"
    }

    // MARK: - Loading

    func load() async {
        async let debtsResult: DebtsResponse? = try? api.getDebts()
        async let planResult: DebtPlanResponse? = try? api.getDebtPlan(strategy: nil, extra: nil)

        if let response = await debtsResult {
            debtsState = .loaded(response.debts)
        } else if case .loading = debtsState {
            debtsState = .failed
        }
        if let response = await planResult {
            planState = .loaded(response)
        } else if case .loading = planState {
            planState = .failed
        }
    }

    /// Re-pulls both providers. Sources fail soft server-side; a dead bureau
    /// connection never blocks a bank refresh.
    func sync() async {
        isSyncing = true
        defer { isSyncing = false }
        if let response = try? await api.syncDebts() {
            debtsState = .loaded(response.debts)
            await refreshPlan()
        }
    }

    // MARK: - Plan controls (R-7.14, R-7.15)

    var selectedStrategy: DebtStrategy {
        plan?.strategy ?? .blend
    }

    var extraMonthly: Double {
        plan?.extraMonthly ?? 0
    }

    /// One tap selects a strategy: fetch the re-ordered plan, then persist
    /// the choice. On failure the previous plan stays on screen.
    func selectStrategy(_ strategy: DebtStrategy) async {
        guard strategy != selectedStrategy else { return }
        await updatePlan(strategy: strategy, extra: extraMonthly)
    }

    /// The extra-payment control. Values below zero are clamped, not errors.
    func setExtraMonthly(_ value: Double) async {
        let clamped = max(0, value)
        guard clamped != extraMonthly else { return }
        await updatePlan(strategy: selectedStrategy, extra: clamped)
    }

    private func updatePlan(strategy: DebtStrategy, extra: Double) async {
        isUpdatingPlan = true
        defer { isUpdatingPlan = false }
        guard let response = try? await api.getDebtPlan(strategy: strategy, extra: extra) else { return }
        planState = .loaded(response)
        // Persist after the fetch succeeded; a failed save loses nothing the
        // user can see, and the next PUT catches up.
        try? await api.saveDebtPlan(strategy: strategy, extraMonthly: extra)
    }

    private func refreshPlan() async {
        if let response = try? await api.getDebtPlan(strategy: nil, extra: nil) {
            planState = .loaded(response)
        }
    }

    // MARK: - Per-debt edits

    /// Sets (or clears with nil) the real APR over an assumed one. The plan
    /// re-runs because the rate drives every number on it.
    @discardableResult
    func saveAprOverride(id: String, apr: Double?) async -> Bool {
        guard let updated = try? await api.setDebtAprOverride(id: id, apr: apr) else { return false }
        replace(updated)
        await refreshPlan()
        return true
    }

    @discardableResult
    func saveNickname(id: String, nickname: String?) async -> Bool {
        let trimmed = nickname?.trimmingCharacters(in: .whitespacesAndNewlines)
        let value = (trimmed?.isEmpty ?? true) ? nil : trimmed
        guard let updated = try? await api.setDebtNickname(id: id, nickname: value) else { return false }
        replace(updated)
        return true
    }

    @discardableResult
    func saveStatementCloseDay(id: String, day: Int?) async -> Bool {
        guard let updated = try? await api.setDebtStatementCloseDay(id: id, day: day) else { return false }
        replace(updated)
        return true
    }

    // MARK: - Merge and split (R-7.13)

    /// "These are the same account." Returns true on success; the list and
    /// plan re-render from the rebuilt records.
    @discardableResult
    func merge(id: String, with otherDebtId: String) async -> Bool {
        guard let response = try? await api.mergeDebts(id: id, otherDebtId: otherDebtId) else { return false }
        debtsState = .loaded(response.debts)
        await refreshPlan()
        return true
    }

    /// The inverse: undo a wrong merge without disconnecting anything.
    @discardableResult
    func split(id: String) async -> Bool {
        guard let response = try? await api.splitDebt(id: id) else { return false }
        debtsState = .loaded(response.debts)
        await refreshPlan()
        return true
    }

    private func replace(_ updated: DebtAccount) {
        guard case var .loaded(list) = debtsState else { return }
        if let index = list.firstIndex(where: { $0.debtId == updated.debtId }) {
            list[index] = updated
            debtsState = .loaded(list)
        }
    }
}
