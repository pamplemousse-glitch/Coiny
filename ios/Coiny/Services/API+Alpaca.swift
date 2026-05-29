import Foundation

// MARK: - Alpaca DTOs

struct AlpacaStatus: Decodable {
    let env: String
    let lastEquityUsd: Double?
    let lastSyncedAt: String?
}

struct AlpacaSyncResult: Decodable {
    let equity: Double
}

// MARK: - Alpaca API

extension API {
    func getAlpacaStatus() async throws -> AlpacaStatus {
        try await get("/api/alpaca/status")
    }

    func connectAlpaca(apiKeyId: String, apiSecretKey: String, env: String) async throws {
        struct Body: Encodable { let apiKeyId: String; let apiSecretKey: String; let env: String }
        let _: EmptyResponse = try await post("/api/alpaca/connect", body: Body(apiKeyId: apiKeyId, apiSecretKey: apiSecretKey, env: env))
    }

    func syncAlpaca() async throws -> AlpacaSyncResult {
        try await post("/api/alpaca/sync")
    }

    func disconnectAlpaca() async throws {
        try await deleteVoid("/api/alpaca/connect")
    }
}
