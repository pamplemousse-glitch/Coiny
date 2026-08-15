import Foundation

// MARK: - Entitlements API

extension API {
    /// Reads the server-resolved entitlement. The server is the authority on
    /// tier; the client never decides from local receipt state.
    func getEntitlements() async throws -> EntitlementsResponse {
        try await get("/api/entitlements")
    }

    /// Reports an Apple signed transaction (purchase, background renewal seen
    /// by Transaction.updates, or restore). The server verifies the JWS chain
    /// itself and returns the updated entitlement.
    func reportAppStoreTransaction(jws: String) async throws -> EntitlementsResponse {
        struct Body: Encodable { let jws: String }
        return try await post("/api/entitlements/transaction", body: Body(jws: jws))
    }
}

// MARK: - DTOs

struct EntitlementsResponse: Decodable, Equatable {
    let tier: String
    let status: String
    let entitledUntil: Date?
    let autoRenew: Bool
    let source: String?
    let appAccountToken: String
    let limits: EntitlementLimits

    var isPaid: Bool { tier != "free" }
}

/// Tier limits as enforced server-side; nil means unlimited.
struct EntitlementLimits: Decodable, Equatable {
    let liveConnections: Int?
    let activeGoals: Int?
    let guardrails: Int?
    let historyDays: Int?
}
