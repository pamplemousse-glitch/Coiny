#if DEBUG

// MARK: - Debug DTOs

struct DebugTransaction: Decodable, Identifiable {
    let id: String
    let date: String
    let merchant: String?
    let amount: String
    let category: String?
    let ruleMatched: String?

    enum CodingKeys: String, CodingKey {
        case id, date, merchant, amount, category
        case ruleMatched = "rule_matched"
    }
}

struct DebugTransactionsResponse: Decodable { let transactions: [DebugTransaction] }

struct ResetCursorResponse: Decodable {
    let ok: Bool
    let itemsReset: Int
    let eventsCleared: Int
    enum CodingKeys: String, CodingKey {
        case ok
        case itemsReset = "items_reset"
        case eventsCleared = "events_cleared"
    }
}

// MARK: - Debug API

extension API {
    @discardableResult
    func fireTestTransaction() async throws -> EmptyResponse {
        try await post("/api/debug/fire-transaction")
    }

    func debugTransactions() async throws -> DebugTransactionsResponse {
        try await get("/api/debug/transactions")
    }

    @discardableResult
    func resetCursor() async throws -> ResetCursorResponse {
        try await post("/api/debug/reset-cursor")
    }

    /// Creates a real backend session for the fixed simulator test user and
    /// stores the token in memory. Bypasses Sign In with Apple, which doesn't
    /// work in the Simulator. Token is lost on app restart (no Keychain write).
    func injectDebugSession() async throws {
        struct DebugSessionResponse: Decodable { let token: String }
        let response: DebugSessionResponse = try await request(
            method: "POST", path: "/api/debug/session",
            body: Optional<String>.none, requiresAuth: false
        )
        sessionToken = response.token
    }
}

#endif
