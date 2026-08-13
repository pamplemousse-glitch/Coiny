import Foundation
import Observation

/// Slice of the API surface the expanded journey depends on, extracted behind
/// a protocol so tests can drive the store without the network actor.
protocol JourneyAPI: Sendable {
    func getGoals() async throws -> GoalsListResponse
    func getGuardrails() async throws -> GuardrailsResponse
    func createGoal(_ body: GoalCreateBody) async throws -> TargetGoal
    func updateGoal(id: Int, body: GoalPatchBody) async throws -> TargetGoal
    func archiveGoal(id: Int) async throws
    func skipLadderRung(_ rungId: Int, status: RungSkipStatus, reason: RungSkipReason?) async throws -> LadderSnapshot
    func unskipLadderRung(_ rungId: Int) async throws -> LadderSnapshot
}

extension API: JourneyAPI {}

/// Editor state for one goal, create or edit. Pure value type so validation is
/// unit-testable.
struct GoalDraft: Equatable, Sendable, Identifiable {
    /// Nil while creating; the goal id while editing.
    var id: Int?
    var name = ""
    var emoji = ""
    var kind: GoalKind = .save
    var amountText = ""
    var hasTargetDate = false
    var targetDate = Date()
    var countsExistingBalance = true
    var recurringAnnual = false

    init(id: Int? = nil) {
        self.id = id
    }

    init(goal: TargetGoal) {
        id = goal.id
        name = goal.name
        emoji = goal.emoji ?? ""
        kind = goal.kind
        amountText = Self.amountText(goal.targetAmountUsd)
        if let day = goal.targetDate, let date = Self.parseDay(day) {
            hasTargetDate = true
            targetDate = date
        }
        countsExistingBalance = goal.countsExistingBalance
        recurringAnnual = goal.recurringAnnual
    }

    var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var amount: Double? {
        let cleaned = amountText.replacingOccurrences(of: ",", with: "")
        guard let value = Double(cleaned), value > 0, value.isFinite else { return nil }
        return value
    }

    /// A sinking fund is a save goal WITH a date (R-7.7); the server rejects
    /// `recurringAnnual` without one, so the draft does too.
    var isValid: Bool {
        !trimmedName.isEmpty && amount != nil && (!recurringAnnual || hasTargetDate)
    }

    var targetDateString: String? {
        hasTargetDate ? Self.dayString(targetDate) : nil
    }

    static func dayString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.string(from: date)
    }

    static func parseDay(_ day: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.date(from: day)
    }

    private static func amountText(_ value: Double) -> String {
        value.truncatingRemainder(dividingBy: 1) == 0
            ? String(Int(value))
            : String(value)
    }
}

/// Observable store for the expanded journey's goals and guardrails. Loaded
/// when the journey expands; the ladder itself stays with `PetStore`.
@Observable
@MainActor
final class JourneyStore {
    enum GoalsState: Equatable {
        case loading
        case loaded(GoalsListResponse)
        case failed
    }

    enum GuardrailsState: Equatable {
        case loading
        case loaded([GuardrailStatus])
        case failed
    }

    /// Save results the editor renders. `limitReached` is the server's R-7.9
    /// cap: a rule with its own copy, never a generic failure.
    enum SaveOutcome: Equatable {
        case saved
        case limitReached
        case failed
    }

    private(set) var goals: GoalsState = .loading
    private(set) var guardrails: GuardrailsState = .loading
    private let api: JourneyAPI

    init(api: JourneyAPI = JourneyStore.defaultAPI()) {
        self.api = api
    }

    nonisolated static func defaultAPI() -> JourneyAPI {
        #if DEBUG
        if CommandLine.arguments.contains("--ui-testing") { return UITestJourneyAPI() }
        #endif
        return API.shared
    }

    var activeGoals: [TargetGoal] {
        guard case let .loaded(response) = goals else { return [] }
        return response.goals.filter { $0.archivedAt == nil }
    }

    var maxActiveGoals: Int {
        guard case let .loaded(response) = goals else { return 3 }
        return response.maxActive
    }

    func load() async {
        async let goalsResult: GoalsListResponse? = try? api.getGoals()
        async let guardrailsResult: GuardrailsResponse? = try? api.getGuardrails()

        if let response = await goalsResult {
            goals = .loaded(response)
        } else if case .loading = goals {
            goals = .failed
        }
        if let response = await guardrailsResult {
            guardrails = .loaded(response.guardrails)
        } else if case .loading = guardrails {
            guardrails = .failed
        }
    }

    // MARK: - Goal CRUD

    func save(_ draft: GoalDraft) async -> SaveOutcome {
        guard let amount = draft.amount, draft.isValid else { return .failed }
        do {
            if let id = draft.id {
                _ = try await api.updateGoal(
                    id: id,
                    body: GoalPatchBody(
                        name: draft.trimmedName,
                        emoji: draft.emoji.isEmpty ? nil : draft.emoji,
                        kind: draft.kind,
                        targetAmountUsd: amount,
                        targetDate: draft.targetDateString,
                        countsExistingBalance: draft.countsExistingBalance,
                        recurringAnnual: draft.recurringAnnual
                    )
                )
            } else {
                _ = try await api.createGoal(
                    GoalCreateBody(
                        name: draft.trimmedName,
                        emoji: draft.emoji.isEmpty ? nil : draft.emoji,
                        kind: draft.kind,
                        targetAmountUsd: amount,
                        targetDate: draft.targetDateString,
                        fundingAccountId: nil,
                        countsExistingBalance: draft.countsExistingBalance,
                        contributionRule: .recurringDefault,
                        recurringAnnual: draft.recurringAnnual
                    )
                )
            }
            await reloadGoals()
            return .saved
        } catch let API.APIError.http(status, body) where status == 409 && body.contains("goal_limit_reached") {
            return .limitReached
        } catch {
            return .failed
        }
    }

    /// Archive, not destroy: the row stays, the slot frees (R-7.9).
    func archive(id: Int) async -> Bool {
        do {
            try await api.archiveGoal(id: id)
            await reloadGoals()
            return true
        } catch {
            return false
        }
    }

    private func reloadGoals() async {
        if let response = try? await api.getGoals() {
            goals = .loaded(response)
        }
    }

    // MARK: - Rung skips (R-7.4)

    /// Returns the updated ladder on success, nil on failure. The caller
    /// refreshes `PetStore` so the whole surface re-renders from one source.
    func skipRung(_ rungId: Int, status: RungSkipStatus, reason: RungSkipReason?) async -> LadderSnapshot? {
        try? await api.skipLadderRung(rungId, status: status, reason: reason)
    }

    func unskipRung(_ rungId: Int) async -> LadderSnapshot? {
        try? await api.unskipLadderRung(rungId)
    }
}
