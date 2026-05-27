// MARK: - Metals DTOs

struct MetalHolding: Decodable, Identifiable {
    let id: Int
    let metal: String
    let weightOz: Double
    let label: String?
    let lastValueUsd: Double?
    let lastSyncedAt: String?
    let createdAt: String
}

struct MetalsSyncResult: Decodable {
    let synced: Int
    let errors: Int
}

// MARK: - Sneakers DTOs

struct SneakerHolding: Decodable, Identifiable {
    let id: Int
    let sku: String
    let description: String?
    let size: String?
    let quantity: Int
    let lastPriceUsd: Double?
    let lastSyncedAt: String?
    let createdAt: String
}

struct SneakersSyncResult: Decodable {
    let synced: Int
    let errors: Int
}

// MARK: - Real Estate DTOs

struct RealEstateAsset: Decodable, Identifiable {
    let id: Int
    let address: String
    let label: String?
    let lastValueUsd: Double?
    let lastSyncedAt: String?
    let createdAt: String
}

struct RealEstateSyncResult: Decodable {
    let synced: Int
    let errors: Int
}

// MARK: - Vehicles DTOs

struct VehicleAsset: Decodable, Identifiable {
    let id: Int
    let vin: String
    let label: String?
    let lastValueUsd: Double?
    let lastSyncedAt: String?
    let createdAt: String
}

struct VehiclesSyncResult: Decodable {
    let synced: Int
    let errors: Int
}

// MARK: - Kraken DTOs

struct KrakenSyncResult: Decodable {
    let total: Double
}

// MARK: - SnapTrade DTOs

struct SnapTradeConnectResult: Decodable {
    let redirectUrl: String
}

struct SnapTradeAccount: Decodable, Identifiable {
    let id: String
    let name: String
    let institution: String
    let totalUsd: Double
    let currency: String
}

struct SnapTradeSyncResult: Decodable {
    let total: Double
    let accounts: Int
}

// MARK: - YNAB DTOs

struct YnabSyncResult: Decodable {
    let total: Double
}

// MARK: - Kalshi DTOs

struct KalshiStatusResponse: Decodable {
    let connected: Bool
}

struct KalshiSyncResult: Decodable {
    let portfolioUsd: Double
}

// MARK: - Discogs DTOs

struct DiscogsStatus: Decodable {
    let connected: Bool
    let username: String?
    let lastCollectionUsd: Double?
}

struct DiscogsRequestToken: Decodable {
    let oauthToken: String
    let oauthTokenSecret: String
    let authorizeUrl: String
}

// MARK: - Metals API

extension API {
    func getMetals() async throws -> [MetalHolding] {
        try await get("/api/metals")
    }

    func addMetal(metal: String, weightOz: Double, label: String?) async throws {
        struct Body: Encodable { let metal: String; let weightOz: Double; let label: String? }
        let _: EmptyResponse = try await post("/api/metals", body: Body(metal: metal, weightOz: weightOz, label: label))
    }

    func removeMetal(id: Int) async throws {
        try await deleteVoid("/api/metals/\(id)")
    }

    func syncMetals() async throws -> MetalsSyncResult {
        try await post("/api/metals/sync")
    }
}

// MARK: - Sneakers API

extension API {
    func getSneakers() async throws -> [SneakerHolding] {
        try await get("/api/sneakers")
    }

    func addSneaker(sku: String, size: String?, description: String?, quantity: Int) async throws {
        struct Body: Encodable { let sku: String; let size: String?; let description: String?; let quantity: Int }
        let _: EmptyResponse = try await post(
            "/api/sneakers",
            body: Body(sku: sku, size: size, description: description, quantity: quantity)
        )
    }

    func removeSneaker(id: Int) async throws {
        try await deleteVoid("/api/sneakers/\(id)")
    }

    func syncSneakers() async throws -> SneakersSyncResult {
        try await post("/api/sneakers/sync")
    }
}

// MARK: - Real Estate API

extension API {
    func getRealEstate() async throws -> [RealEstateAsset] {
        try await get("/api/real-estate")
    }

    func addRealEstate(address: String, label: String?) async throws {
        struct Body: Encodable { let address: String; let label: String? }
        let _: EmptyResponse = try await post("/api/real-estate", body: Body(address: address, label: label))
    }

    func removeRealEstate(id: Int) async throws {
        try await deleteVoid("/api/real-estate/\(id)")
    }

    func syncRealEstate() async throws -> RealEstateSyncResult {
        try await post("/api/real-estate/sync")
    }
}

// MARK: - Vehicles API

extension API {
    func getVehicles() async throws -> [VehicleAsset] {
        try await get("/api/vehicles")
    }

    func addVehicle(vin: String, label: String?) async throws {
        struct Body: Encodable { let vin: String; let label: String? }
        let _: EmptyResponse = try await post("/api/vehicles", body: Body(vin: vin, label: label))
    }

    func removeVehicle(id: Int) async throws {
        try await deleteVoid("/api/vehicles/\(id)")
    }

    func syncVehicles() async throws -> VehiclesSyncResult {
        try await post("/api/vehicles/sync")
    }
}

// MARK: - Kraken API

extension API {
    func connectKraken(apiKey: String, privateKey: String) async throws {
        struct Body: Encodable { let apiKey: String; let privateKey: String }
        let _: EmptyResponse = try await post("/api/kraken/connect", body: Body(apiKey: apiKey, privateKey: privateKey))
    }

    func disconnectKraken() async throws {
        try await deleteVoid("/api/kraken/connect")
    }

    func syncKraken() async throws -> KrakenSyncResult {
        try await post("/api/kraken/sync")
    }
}

// MARK: - SnapTrade API

extension API {
    func connectSnapTrade() async throws -> SnapTradeConnectResult {
        try await post("/api/snaptrade/connect")
    }

    func disconnectSnapTrade() async throws {
        try await deleteVoid("/api/snaptrade/connect")
    }

    func syncSnapTrade() async throws -> SnapTradeSyncResult {
        try await post("/api/snaptrade/sync")
    }
}

// MARK: - YNAB API

extension API {
    func connectYnab(apiKey: String) async throws {
        struct Body: Encodable { let apiKey: String }
        let _: EmptyResponse = try await post("/api/ynab/connect", body: Body(apiKey: apiKey))
    }

    func disconnectYnab() async throws {
        try await deleteVoid("/api/ynab/connect")
    }

    func syncYnab() async throws -> YnabSyncResult {
        try await post("/api/ynab/sync")
    }
}

// MARK: - Kalshi API

extension API {
    func getKalshiStatus() async throws -> KalshiStatusResponse {
        try await get("/api/kalshi/status")
    }

    func connectKalshi(keyId: String, privateKeyBase64: String) async throws {
        struct Body: Encodable { let keyId: String; let privateKeyBase64: String }
        let _: EmptyResponse = try await post("/api/kalshi/connect", body: Body(keyId: keyId, privateKeyBase64: privateKeyBase64))
    }

    func disconnectKalshi() async throws {
        try await deleteVoid("/api/kalshi/connect")
    }

    func syncKalshi() async throws -> KalshiSyncResult {
        try await post("/api/kalshi/sync")
    }
}

// MARK: - Discogs API

extension API {
    func getDiscogsStatus() async throws -> DiscogsStatus {
        try await get("/api/discogs/status")
    }

    func requestDiscogsToken() async throws -> DiscogsRequestToken {
        try await post("/api/discogs/connect/request")
    }

    func verifyDiscogsToken(oauthToken: String, oauthVerifier: String) async throws {
        struct Body: Encodable { let oauthToken: String; let oauthVerifier: String }
        let _: EmptyResponse = try await post(
            "/api/discogs/connect/verify",
            body: Body(oauthToken: oauthToken, oauthVerifier: oauthVerifier)
        )
    }

    func syncDiscogs() async throws {
        let _: EmptyResponse = try await post("/api/discogs/sync")
    }

    func disconnectDiscogs() async throws {
        try await deleteVoid("/api/discogs/connect")
    }
}
