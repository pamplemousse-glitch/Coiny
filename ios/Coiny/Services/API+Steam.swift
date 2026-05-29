import Foundation

// MARK: - Steam DTOs

struct SteamAccount: Decodable, Identifiable {
    let id: Int
    let steamId64: String
    let label: String?
    let lastPortfolioUsd: Double?
    let lastSyncedAt: String?
    let createdAt: String
}

struct SteamSyncResult: Decodable {
    let synced: Int
    let errors: [String]
}

// MARK: - Steam API

extension API {
    func getSteamAccounts() async throws -> [SteamAccount] {
        try await get("/api/steam-accounts")
    }

    func addSteamAccount(steamId64: String, label: String?) async throws {
        struct Body: Encodable { let steamId64: String; let label: String? }
        let _: EmptyResponse = try await post("/api/steam-accounts", body: Body(steamId64: steamId64, label: label))
    }

    func removeSteamAccount(id: Int) async throws {
        try await deleteVoid("/api/steam-accounts/\(id)")
    }

    func syncSteam() async throws -> SteamSyncResult {
        try await post("/api/steam-accounts/sync")
    }
}
