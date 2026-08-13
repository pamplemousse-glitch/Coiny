import Foundation
@testable import Coiny

/// Shared builders for net-worth fixtures so tests only spell out what they
/// assert on.
enum NetWorthFixtures {
    static func reading(
        value: Double?,
        asOf: Date? = nil,
        status: ClassStatus
    ) -> ClassReading {
        ClassReading(value: value, asOf: asOf, status: status)
    }

    // swiftlint:disable:next function_body_length
    static func response(
        total: Double = 0,
        classes: [String: ClassReading] = [:],
        excluded: ExcludedSummary = ExcludedSummary(count: 0, classes: []),
        generatedAt: Date = Date(timeIntervalSince1970: 1_700_000_000),
        bankRefresh: String? = nil,
        liquidCashMonths: Double? = nil,
        bankAccounts: [BankAccount] = []
    ) -> NetWorthResponse {
        NetWorthResponse(
            total: total,
            bank: 0,
            investments: 0,
            crypto: 0,
            defi: 0,
            chainWallets: 0,
            hyperliquid: 0,
            realEstate: 0,
            vehicles: 0,
            metals: 0,
            sneakers: 0,
            nft: nil,
            manual: nil,
            alpaca: nil,
            truelayer: nil,
            kraken: 0,
            ynab: 0,
            vinyl: nil,
            kalshi: nil,
            polymarket: nil,
            pokemonCards: nil,
            energy: nil,
            farmland: nil,
            tradingCards: nil,
            coins: nil,
            debts: 0,
            liquidCashMonths: liquidCashMonths,
            accounts: NetWorthAccounts(
                bank: bankAccounts,
                investments: [],
                crypto: [],
                defi: DefiTotal(totalUSD: 0),
                debts: []
            ),
            connections: NetWorthConnections(
                coinbase: false,
                zerion: false,
                spinwheel: false,
                kraken: false,
                ynab: false,
                kalshi: nil,
                alpaca: nil,
                truelayer: nil
            ),
            classes: classes,
            excluded: excluded,
            generatedAt: generatedAt,
            bankRefresh: bankRefresh
        )
    }

    static func item(
        id: String = "item-1",
        status: PlaidItemStatus = .reauthRequired,
        repairable: Bool = true
    ) -> PlaidItemHealth {
        PlaidItemHealth(
            itemId: id,
            status: status,
            statusChangedAt: nil,
            lastErrorCode: nil,
            newAccountsAvailable: false,
            disabled: false,
            repairable: repairable
        )
    }
}
