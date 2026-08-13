import Foundation

// MARK: - Plaid recurring streams (GET /api/plaid/recurring)

/// One recurring stream row as served by `backend/src/api/plaid-recurring.ts`
/// (raw `plaid_recurring_streams` rows; amounts are stringified numerics).
struct PlaidRecurringStream: Decodable, Sendable {
    let streamId: String
    let direction: String
    let merchantName: String?
    let description: String?
    let frequency: String
    let averageAmount: String?
    let lastAmount: String?
    let isActive: Bool

    /// Merchant name when Plaid supplies one, otherwise the stream description.
    var displayName: String? {
        if let merchantName, !merchantName.isEmpty { return merchantName }
        if let description, !description.isEmpty { return description }
        return nil
    }

    /// Average amount preferred over last amount; both arrive as strings.
    var bestAmountUSD: Double? {
        if let averageAmount, let value = Double(averageAmount) { return abs(value) }
        if let lastAmount, let value = Double(lastAmount) { return abs(value) }
        return nil
    }
}

struct PlaidRecurringResponse: Decodable, Sendable {
    let inflow: [PlaidRecurringStream]
    let outflow: [PlaidRecurringStream]
}

// MARK: - Ladder snapshot (GET /api/pets, additive fields)

/// Minimal decode of the goal-system fields `GET /api/pets` now carries, used
/// by the onboarding hatch to phrase the one instruction (PRD section 1.4).
/// Prefixed "Onboarding" to avoid colliding with the fuller ladder models the
/// Pet tab rebuild will own.
struct OnboardingLadderSnapshot: Decodable, Sendable {
    let ladder: OnboardingLadderView?
}

struct OnboardingLadderView: Decodable, Sendable {
    let currentRung: Int
    let activeRung: OnboardingActiveRung?
}

struct OnboardingActiveRung: Decodable, Sendable {
    let id: Int
    let name: String
    let stage: String
    let blurb: String
    let target: Double?
    let gap: Double?
    let indeterminate: Bool
}

// MARK: - API

extension API {
    func getPlaidRecurring() async throws -> PlaidRecurringResponse {
        try await get("/api/plaid/recurring")
    }

    func getOnboardingLadderSnapshot() async throws -> OnboardingLadderSnapshot {
        try await get("/api/pets")
    }
}
