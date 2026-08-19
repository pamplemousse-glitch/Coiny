import Foundation

// MARK: - Net Worth per-class status (PRD R-8.4)

/// The per-class status vocabulary from `backend/src/networth/classes.ts`.
/// `reauth_required` and `expiring` are in the R-8.4 vocabulary but not yet
/// emitted by the read path; they are decoded so the client is ready when the
/// item-lifecycle column starts driving them.
enum ClassStatus: String, Codable, Equatable, Sendable {
    case ok
    case stale
    case staleExcluded = "stale_excluded"
    case error
    case disconnected
    case reauthRequired = "reauth_required"
    case expiring
    case notConnected = "not_connected"
    case pending

    /// Unknown statuses (an additive server change) decode as `.stale`: the
    /// value renders with its age label and is never mistaken for fresh, and
    /// inclusion in the total is server-side so nothing double-counts.
    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = ClassStatus(rawValue: raw) ?? .stale
    }
}

/// One asset class as the server reads it: `{ value, asOf, status }`.
struct ClassReading: Codable, Equatable, Sendable {
    let value: Double?
    let asOf: Date?
    let status: ClassStatus
}

/// Classes excluded from `total` (failures, revocations, past never-show age).
struct ExcludedSummary: Codable, Equatable, Sendable {
    let count: Int
    let classes: [String]
}

// MARK: - Net Worth DTOs

struct NetWorthResponse: Codable {
    let total: Double
    let bank: Double
    let investments: Double
    let crypto: Double
    let defi: Double
    let chainWallets: Double
    let hyperliquid: Double
    let realEstate: Double
    let vehicles: Double
    let metals: Double
    let sneakers: Double
    let nft: Double?
    let manual: Double?
    let declared: Double?
    let alpaca: Double?
    let truelayer: Double?
    let kraken: Double
    let ynab: Double
    let vinyl: Double?
    let kalshi: Double?
    let polymarket: Double?
    let pokemonCards: Double?
    let energy: Double?
    let farmland: Double?
    let tradingCards: Double?
    let coins: Double?
    let debts: Double
    let liquidCashMonths: Double?
    let accounts: NetWorthAccounts
    let connections: NetWorthConnections
    /// Per-class `{ value, asOf, status }` readings, keyed by class name.
    let classes: [String: ClassReading]
    let excluded: ExcludedSummary
    let generatedAt: Date
    /// Present only on `POST /api/net-worth/refresh` responses:
    /// `refreshed | failed | not_connected | capped`.
    let bankRefresh: String?
}

struct NetWorthAccounts: Codable {
    let bank: [BankAccount]
    let investments: [InvestmentHolding]
    let crypto: [CryptoPosition]
    let defi: DefiTotal
    let debts: [DebtItem]
}

struct NetWorthConnections: Codable {
    let coinbase: Bool
    let zerion: Bool
    let spinwheel: Bool
    let kraken: Bool
    let ynab: Bool
    let kalshi: Bool?
    let alpaca: Bool?
    let truelayer: Bool?
}

struct BankAccount: Codable, Identifiable {
    let id: String
    let name: String
    let type: String
    /// Plaid's precise subtype (`401k`, `hsa`, `cash isa`, `cd`). Optional so a
    /// cached response written by an older build still decodes.
    let subtype: String?
    /// The coarse bucket the server derived: cash, retirement, education,
    /// health, investment, insurance, credit, loan, other.
    let category: String?
    /// Ready-to-display wrapper name: "Roth IRA", "Certificate of Deposit".
    /// Named by the server so the taxonomy lives in one place rather than being
    /// re-derived, and differently, on each client.
    let subtypeLabel: String?
    let taxAdvantaged: Bool?
    /// Whether this balance counts as spendable cash. False for a CD, an HSA,
    /// a GIC and an EBT balance.
    let liquid: Bool?
    let balance: Double
    let minPayment: Double?
    let nextDueDate: String?
    let asOf: Date?

    /// What to show under the account name. Falls back to the raw type for a
    /// response that predates the taxonomy, so the row is never blank.
    var displayKind: String {
        subtypeLabel ?? type.capitalized
    }

    enum CodingKeys: String, CodingKey {
        case id = "accountId"
        case name
        case type
        case subtype
        case category
        case subtypeLabel
        case taxAdvantaged
        case liquid
        case balance
        case minPayment
        case nextDueDate
        case asOf
    }
}

struct InvestmentHolding: Codable, Identifiable {
    let id: String
    let name: String?
    let ticker: String?
    let value: Double

    enum CodingKeys: String, CodingKey {
        case id = "securityId"
        case name
        case ticker
        case value
    }
}

struct CryptoPosition: Codable, Identifiable {
    let id: String
    let name: String
    let symbol: String
    let amount: Double
    let valueUSD: Double
}

struct DefiTotal: Codable {
    let totalUSD: Double
}

struct DebtItem: Codable, Identifiable {
    let id: String
    let type: String?
    let balance: Double
    let monthlyPayment: Double?
}

// MARK: - Test-friendly initializers

extension NetWorthResponse {
    /// Memberwise init with defaults for the additively-introduced fields, so
    /// fixtures written against the legacy shape keep compiling.
    init(
        total: Double,
        bank: Double,
        investments: Double,
        crypto: Double,
        defi: Double,
        chainWallets: Double,
        hyperliquid: Double,
        realEstate: Double,
        vehicles: Double,
        metals: Double,
        sneakers: Double,
        nft: Double?,
        manual: Double?,
        alpaca: Double?,
        truelayer: Double?,
        kraken: Double,
        ynab: Double,
        vinyl: Double?,
        kalshi: Double?,
        polymarket: Double?,
        pokemonCards: Double?,
        energy: Double?,
        farmland: Double?,
        tradingCards: Double?,
        coins: Double?,
        debts: Double,
        liquidCashMonths: Double?,
        accounts: NetWorthAccounts,
        connections: NetWorthConnections
    ) {
        self.init(
            total: total, bank: bank, investments: investments, crypto: crypto, defi: defi,
            chainWallets: chainWallets, hyperliquid: hyperliquid, realEstate: realEstate,
            vehicles: vehicles, metals: metals, sneakers: sneakers, nft: nft, manual: manual,
            declared: nil,
            alpaca: alpaca, truelayer: truelayer, kraken: kraken, ynab: ynab, vinyl: vinyl,
            kalshi: kalshi, polymarket: polymarket, pokemonCards: pokemonCards, energy: energy,
            farmland: farmland, tradingCards: tradingCards, coins: coins, debts: debts,
            liquidCashMonths: liquidCashMonths, accounts: accounts, connections: connections,
            classes: [:], excluded: ExcludedSummary(count: 0, classes: []),
            generatedAt: Date(timeIntervalSince1970: 0), bankRefresh: nil
        )
    }
}

extension BankAccount {
    /// Convenience initialiser for fixtures and previews. The taxonomy fields
    /// default to nil, which is the same shape a cached response from an older
    /// build decodes to, so callers exercise the fallback path rather than a
    /// privileged one.
    init(
        id: String,
        name: String,
        type: String,
        balance: Double,
        minPayment: Double?,
        nextDueDate: String?,
        subtype: String? = nil,
        category: String? = nil,
        subtypeLabel: String? = nil,
        taxAdvantaged: Bool? = nil,
        liquid: Bool? = nil
    ) {
        self.init(
            id: id, name: name, type: type,
            subtype: subtype, category: category, subtypeLabel: subtypeLabel,
            taxAdvantaged: taxAdvantaged, liquid: liquid,
            balance: balance, minPayment: minPayment, nextDueDate: nextDueDate, asOf: nil
        )
    }
}

// MARK: - Spending + Subscriptions + Net Worth API
// Moved from API.swift for SwiftLint's file_length; extensions on the actor
// still run on the actor.

extension API {
    func getSpendingSummary() async throws -> SpendingSummaryResponse {
        try await get("/api/spending/summary")
    }

    func getSpendingOverrides() async throws -> [SpendingOverride] {
        try await get("/api/spending/overrides")
    }

    @discardableResult
    func setSpendingOverride(merchantName: String, category: String) async throws -> EmptyResponse {
        struct Body: Encodable { let merchant_name: String; let category: String }
        return try await put("/api/spending/overrides", body: Body(merchant_name: merchantName, category: category))
    }

    func deleteSpendingOverride(merchantName: String) async throws {
        struct Body: Encodable { let merchant_name: String }
        let _: EmptyResponse = try await request(
            method: "DELETE",
            path: "/api/spending/overrides",
            body: Body(merchant_name: merchantName),
            requiresAuth: true
        )
    }

    func getSubscriptions() async throws -> RecurringSummary {
        try await get("/api/subscriptions")
    }

    /// Pure DB read (R-16.1): instant, never triggers a vendor call.
    func getNetWorth() async throws -> NetWorthResponse {
        try await get("/api/net-worth")
    }

    /// The explicit live path (the only user-drivable vendor call). The billed
    /// Plaid balance pull is capped server-side; `bankRefresh` says `capped`
    /// when the daily budget is spent.
    func refreshNetWorth() async throws -> NetWorthResponse {
        try await post("/api/net-worth/refresh")
    }
}

// MARK: - Performance DTOs

struct CoinbasePerformance: Decodable {
    let unrealizedPnl: Double?
    let totalCash: Double?
    let totalCrypto: Double?
}

struct ZerionPnl: Decodable {
    let unrealizedGain: Double
    let realizedGain: Double
    let totalGain: Double
}

struct DefiPosition: Decodable, Identifiable {
    let id: String
    let symbol: String
    let name: String
    let quantity: Double
    let valueUsd: Double
    let walletAddress: String
}

struct DefiPositionsResponse: Decodable {
    let positions: [DefiPosition]
}
