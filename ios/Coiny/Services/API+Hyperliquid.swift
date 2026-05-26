// MARK: - Hyperliquid DTOs

struct HyperliquidAccount: Decodable, Identifiable {
    let id: Int
    let address: String
    let label: String?
    let lastAccountValueUsd: Double?
    let lastSyncedAt: String?
    let createdAt: String
}

struct HyperliquidSyncResult: Decodable {
    let updated: Int
}

// MARK: - Hyperliquid API

extension API {
    func getHyperliquidAccounts() async throws -> [HyperliquidAccount] {
        try await get("/api/hyperliquid/accounts")
    }

    func addHyperliquidAccount(address: String, label: String?) async throws {
        struct Body: Encodable { let address: String; let label: String? }
        let _: EmptyResponse = try await post("/api/hyperliquid/accounts", body: Body(address: address, label: label))
    }

    func removeHyperliquidAccount(address: String) async throws {
        try await deleteVoid("/api/hyperliquid/accounts/\(address)")
    }

    func syncHyperliquid() async throws -> HyperliquidSyncResult {
        try await post("/api/hyperliquid/sync")
    }
}
