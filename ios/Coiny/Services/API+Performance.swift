import Foundation

// MARK: - Net Worth DTOs

struct NetWorthResponse: Decodable {
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
}

struct NetWorthAccounts: Decodable {
    let bank: [BankAccount]
    let investments: [InvestmentHolding]
    let crypto: [CryptoPosition]
    let defi: DefiTotal
    let debts: [DebtItem]
}

struct NetWorthConnections: Decodable {
    let coinbase: Bool
    let zerion: Bool
    let spinwheel: Bool
    let kraken: Bool
    let ynab: Bool
    let kalshi: Bool?
    let alpaca: Bool?
    let truelayer: Bool?
}

struct BankAccount: Decodable, Identifiable {
    let id: String
    let name: String
    let type: String
    let balance: Double
    let minPayment: Double?
    let nextDueDate: String?

    enum CodingKeys: String, CodingKey {
        case id = "accountId"
        case name
        case type
        case balance
        case minPayment
        case nextDueDate
    }
}

struct InvestmentHolding: Decodable, Identifiable {
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

struct CryptoPosition: Decodable, Identifiable {
    let id: String
    let name: String
    let symbol: String
    let amount: Double
    let valueUSD: Double
}

struct DefiTotal: Decodable {
    let totalUSD: Double
}

struct DebtItem: Decodable, Identifiable {
    let id: String
    let type: String?
    let balance: Double
    let monthlyPayment: Double?
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
