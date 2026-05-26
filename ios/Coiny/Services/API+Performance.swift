import Foundation

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
