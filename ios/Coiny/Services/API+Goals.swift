import Foundation

// Target goals, guardrails and rung skips (`backend/src/api/goals.ts`).
// Appended as an extension file per the API client's convention.

/// Body for `POST /api/goals` (R-7.7 field list). Optionals encode as explicit
/// nulls so the server's `.strict()` schema sees a complete, unambiguous row.
struct GoalCreateBody: Encodable, Equatable, Sendable {
    let name: String
    let emoji: String?
    let kind: GoalKind
    let targetAmountUsd: Double
    let targetDate: String?
    let fundingAccountId: String?
    let countsExistingBalance: Bool
    let contributionRule: GoalContributionRule
    let recurringAnnual: Bool

    private enum CodingKeys: String, CodingKey {
        case name, emoji, kind, targetAmountUsd, targetDate
        case fundingAccountId, countsExistingBalance, contributionRule, recurringAnnual
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(name, forKey: .name)
        try container.encode(emoji, forKey: .emoji)
        try container.encode(kind, forKey: .kind)
        try container.encode(targetAmountUsd, forKey: .targetAmountUsd)
        try container.encode(targetDate, forKey: .targetDate)
        try container.encode(fundingAccountId, forKey: .fundingAccountId)
        try container.encode(countsExistingBalance, forKey: .countsExistingBalance)
        try container.encode(contributionRule, forKey: .contributionRule)
        try container.encode(recurringAnnual, forKey: .recurringAnnual)
    }
}

/// Body for `PATCH /api/goals/:id`. Sends the editable fields in full, with
/// explicit nulls for cleared optionals (the server treats an explicit null as
/// "clear this", absence as "leave it").
struct GoalPatchBody: Encodable, Equatable, Sendable {
    let name: String
    let emoji: String?
    let kind: GoalKind
    let targetAmountUsd: Double
    let targetDate: String?
    let countsExistingBalance: Bool
    let recurringAnnual: Bool

    private enum CodingKeys: String, CodingKey {
        case name, emoji, kind, targetAmountUsd, targetDate, countsExistingBalance, recurringAnnual
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(name, forKey: .name)
        try container.encode(emoji, forKey: .emoji)
        try container.encode(kind, forKey: .kind)
        try container.encode(targetAmountUsd, forKey: .targetAmountUsd)
        try container.encode(targetDate, forKey: .targetDate)
        try container.encode(countsExistingBalance, forKey: .countsExistingBalance)
        try container.encode(recurringAnnual, forKey: .recurringAnnual)
    }
}

private struct RungSkipBody: Encodable {
    let status: RungSkipStatus
    let reason: RungSkipReason?

    private enum CodingKeys: String, CodingKey {
        case status, reason
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(status, forKey: .status)
        try container.encode(reason, forKey: .reason)
    }
}

extension API {
    func getGoals() async throws -> GoalsListResponse {
        try await get("/api/goals")
    }

    /// Throws `APIError.http(status: 409, ...)` with `goal_limit_reached` in
    /// the body when a fourth active goal is refused (R-7.9). The store maps
    /// that to its own state; it is a rule, not a failure.
    @discardableResult
    func createGoal(_ body: GoalCreateBody) async throws -> TargetGoal {
        try await post("/api/goals", body: body)
    }

    @discardableResult
    func updateGoal(id: Int, body: GoalPatchBody) async throws -> TargetGoal {
        try await patch("/api/goals/\(id)", body: body)
    }

    /// Archive, not destroy: the row and its history stay, the slot frees.
    func archiveGoal(id: Int) async throws {
        try await deleteVoid("/api/goals/\(id)")
    }

    func getGuardrails() async throws -> GuardrailsResponse {
        try await get("/api/goals/guardrails")
    }

    /// R-7.4: mark a rung skipped (with a stated reason) or not applicable.
    /// Returns the updated ladder so the journey re-renders without a refetch.
    func skipLadderRung(
        _ rungId: Int,
        status: RungSkipStatus,
        reason: RungSkipReason?
    ) async throws -> LadderSnapshot {
        try await post(
            "/api/goals/ladder/rungs/\(rungId)/skip",
            body: RungSkipBody(status: status, reason: reason)
        )
    }

    /// Reverses a skip: the rung returns to pending and the next refresh
    /// re-judges it.
    func unskipLadderRung(_ rungId: Int) async throws -> LadderSnapshot {
        try await delete("/api/goals/ladder/rungs/\(rungId)/skip")
    }
}
