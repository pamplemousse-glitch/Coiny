// MARK: - Polymarket DTOs

struct PolymarketAccount: Decodable, Identifiable {
    let id: Int
    let walletAddress: String
    let label: String?
    let lastValueUsd: Double?
    let lastSyncedAt: String?
    let createdAt: String
}

struct PolymarketSyncResult: Decodable {
    let updated: Int
}

struct PolymarketStatus: Decodable {
    let connected: Bool
    let accounts: Int
}

// MARK: - Polymarket API

extension API {
    func getPolymarketAccounts() async throws -> [PolymarketAccount] {
        try await get("/api/polymarket/accounts")
    }

    func addPolymarketAccount(walletAddress: String, label: String?) async throws {
        struct Body: Encodable { let walletAddress: String; let label: String? }
        let _: EmptyResponse = try await post(
            "/api/polymarket/accounts",
            body: Body(walletAddress: walletAddress, label: label)
        )
    }

    func removePolymarketAccount(address: String) async throws {
        let encoded = address.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? address
        try await deleteVoid("/api/polymarket/accounts/\(encoded)")
    }

    func syncPolymarket() async throws -> PolymarketSyncResult {
        try await post("/api/polymarket/sync")
    }
}
