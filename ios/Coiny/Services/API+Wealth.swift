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


// MARK: - YNAB DTOs

struct YnabOAuthUrlResponse: Decodable {
    let url: String
}

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


// MARK: - YNAB API

extension API {
    func ynabOAuthUrl(codeChallenge: String) async throws -> YnabOAuthUrlResponse {
        try await get("/api/ynab/connect/oauth/url?codeChallenge=\(codeChallenge)")
    }

    func ynabOAuthCallback(code: String, codeVerifier: String) async throws {
        struct Body: Encodable { let code: String; let codeVerifier: String }
        let _: EmptyResponse = try await post("/api/ynab/connect/oauth/callback", body: Body(code: code, codeVerifier: codeVerifier))
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

// MARK: - TrueLayer DTOs

struct TruelayerStatus: Decodable {
    let connected: Bool
}

struct TruelayerSyncResult: Decodable {
    let balanceUsd: Double
}

// MARK: - TrueLayer API

extension API {
    func getTruelayerStatus() async throws -> TruelayerStatus {
        try await get("/api/truelayer/status")
    }

    func syncTruelayer() async throws -> TruelayerSyncResult {
        try await post("/api/truelayer/sync")
    }

    func disconnectTruelayer() async throws {
        try await deleteVoid("/api/truelayer/connect")
    }
}

// MARK: - Pokemon Cards DTOs

struct PokemonCardHolding: Decodable, Identifiable {
    let id: Int
    let cardName: String
    let setName: String?
    let variant: String?
    let quantity: Int
    let label: String?
    let lastPriceUsd: Double?
    let valueUsd: Double?
    let lastSyncedAt: String?
}

struct PokemonCardsSyncResult: Decodable {
    let updated: Int
    let errors: Int
}

// MARK: - Pokemon Cards API

extension API {
    func getPokemonCards() async throws -> [PokemonCardHolding] {
        try await get("/api/pokemon-cards")
    }

    func addPokemonCard(cardName: String, setName: String?, variant: String?, quantity: Int, label: String?) async throws {
        struct Body: Encodable { let cardName: String; let setName: String?; let variant: String?; let quantity: Int; let label: String? }
        let _: EmptyResponse = try await post("/api/pokemon-cards",
            body: Body(cardName: cardName, setName: setName, variant: variant, quantity: quantity, label: label))
    }

    func removePokemonCard(id: Int) async throws {
        try await deleteVoid("/api/pokemon-cards/\(id)")
    }

    func syncPokemonCards() async throws -> PokemonCardsSyncResult {
        try await post("/api/pokemon-cards/sync")
    }
}

// MARK: - Energy Positions DTOs

struct EnergyPosition: Decodable, Identifiable {
    let id: Int
    let commodity: String
    let quantityUnit: String
    let quantity: Double
    let label: String?
    let lastSpotPriceUsd: Double?
    let valueUsd: Double?
    let lastSyncedAt: String?
    let createdAt: String
}

struct EnergySyncResult: Decodable {
    let updated: Int
}

// MARK: - Energy API

extension API {
    func getEnergy() async throws -> [EnergyPosition] {
        try await get("/api/energy")
    }

    func addEnergy(commodity: String, quantity: Double, label: String?) async throws {
        struct Body: Encodable { let commodity: String; let quantity: Double; let label: String? }
        let _: EmptyResponse = try await post("/api/energy", body: Body(commodity: commodity, quantity: quantity, label: label))
    }

    func removeEnergy(id: Int) async throws {
        try await deleteVoid("/api/energy/\(id)")
    }

    func syncEnergy() async throws -> EnergySyncResult {
        try await post("/api/energy/sync")
    }
}

// MARK: - Farmland Parcels DTOs

struct FarmlandParcel: Decodable, Identifiable {
    let id: Int
    let stateCode: String
    let acres: Double
    let label: String?
    let lastPricePerAcreUsd: Double?
    let valueUsd: Double?
    let lastSyncedAt: String?
    let createdAt: String
}

struct FarmlandSyncResult: Decodable {
    let updated: Int
}

// MARK: - Farmland API

extension API {
    func getFarmland() async throws -> [FarmlandParcel] {
        try await get("/api/farmland")
    }

    func addFarmland(stateCode: String, acres: Double, label: String?) async throws {
        struct Body: Encodable { let stateCode: String; let acres: Double; let label: String? }
        let _: EmptyResponse = try await post("/api/farmland", body: Body(stateCode: stateCode, acres: acres, label: label))
    }

    func removeFarmland(id: Int) async throws {
        try await deleteVoid("/api/farmland/\(id)")
    }

    func syncFarmland() async throws -> FarmlandSyncResult {
        try await post("/api/farmland/sync")
    }
}

// MARK: - Trading Card Holdings DTOs

struct TradingCardHolding: Decodable, Identifiable {
    let id: Int
    let game: String
    let cardName: String
    let setName: String?
    let isFoil: Bool
    let quantity: Int
    let label: String?
    let lastPriceUsd: Double?
    let valueUsd: Double?
    let lastSyncedAt: String?
    let createdAt: String
}

struct TradingCardsSyncResult: Decodable {
    let updated: Int
    let errors: Int
}

// MARK: - Trading Cards API

extension API {
    func getTradingCards() async throws -> [TradingCardHolding] {
        try await get("/api/trading-cards")
    }

    // swiftlint:disable:next function_parameter_count
    func addTradingCard(game: String, cardName: String, setName: String?, isFoil: Bool, quantity: Int, label: String?) async throws {
        struct Body: Encodable {
            let game: String; let cardName: String; let setName: String?; let isFoil: Bool; let quantity: Int; let label: String?
        }
        let _: EmptyResponse = try await post("/api/trading-cards",
            body: Body(game: game, cardName: cardName, setName: setName, isFoil: isFoil, quantity: quantity, label: label))
    }

    func removeTradingCard(id: Int) async throws {
        try await deleteVoid("/api/trading-cards/\(id)")
    }

    func syncTradingCards() async throws -> TradingCardsSyncResult {
        try await post("/api/trading-cards/sync")
    }
}

// MARK: - Graded Coin Holdings DTOs

struct CoinHolding: Decodable, Identifiable {
    let id: Int
    let pcgsNo: Int
    let gradeNo: Int
    let plusGrade: Bool
    let quantity: Int
    let coinName: String?
    let label: String?
    let lastPriceGuideUsd: Double?
    let valueUsd: Double?
    let lastSyncedAt: String?
    let createdAt: String
}

struct CoinsSyncResult: Decodable {
    let updated: Int
    let errors: Int
}

// MARK: - Coins API

extension API {
    func getCoins() async throws -> [CoinHolding] {
        try await get("/api/coins")
    }

    func addCoin(pcgsNo: Int, gradeNo: Int, plusGrade: Bool, label: String?, quantity: Int) async throws {
        struct Body: Encodable { let pcgsNo: Int; let gradeNo: Int; let plusGrade: Bool; let label: String?; let quantity: Int }
        let _: EmptyResponse = try await post("/api/coins",
            body: Body(pcgsNo: pcgsNo, gradeNo: gradeNo, plusGrade: plusGrade, label: label, quantity: quantity))
    }

    func removeCoin(id: Int) async throws {
        try await deleteVoid("/api/coins/\(id)")
    }

    func syncCoins() async throws -> CoinsSyncResult {
        try await post("/api/coins/sync")
    }
}
