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

/// One open Alpaca position. The backend parses Alpaca's string-typed wire
/// fields into numbers, so everything here is already a Double.
struct AlpacaPosition: Decodable, Identifiable {
    let symbol: String
    /// `us_equity`, `crypto`, `us_option`, `treasury`, and so on.
    let assetClass: String
    let side: String
    let qty: Double
    let marketValueUsd: Double
    let costBasisUsd: Double
    let currentPriceUsd: Double
    let avgEntryPriceUsd: Double
    let unrealizedPlUsd: Double

    /// A symbol is unique within an account's open positions.
    var id: String { symbol }
}

struct AlpacaPositionsResponse: Decodable {
    let positions: [AlpacaPosition]
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

    /// The individual holdings behind the equity figure. Read live by the
    /// backend, so this is a network round trip to Alpaca and belongs on an
    /// explicit load rather than in the tab's initial fan-out.
    func getAlpacaPositions() async throws -> [AlpacaPosition] {
        let response: AlpacaPositionsResponse = try await get("/api/alpaca/positions")
        return response.positions
    }

    func disconnectAlpaca() async throws {
        try await deleteVoid("/api/alpaca/connect")
    }
}
