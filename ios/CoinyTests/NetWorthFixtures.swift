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

    /// The server's rule for what counts toward `total`, transcribed from
    /// `backend/src/networth/classes.ts` `includedInTotal`.
    ///
    /// This is the only copy of that rule on the client, and it deliberately
    /// lives in test code: production reads the server's `excluded` list
    /// instead, so a transcription that falls behind can break a test but can
    /// never reach a screen.
    static func serverIncludesInTotal(_ status: ClassStatus) -> Bool {
        status == .ok || status == .stale || status == .expiring || status == .reauthRequired
    }

    /// `excluded` exactly as the server builds it: every class that is neither
    /// included in the total nor `not_connected`.
    static func serverExcluded(_ classes: [String: ClassReading]) -> ExcludedSummary {
        let names = classes
            .filter { !serverIncludesInTotal($0.value.status) && $0.value.status != .notConnected }
            .keys
            .sorted()
        return ExcludedSummary(count: names.count, classes: Array(names))
    }

    /// `total` exactly as the server builds it: included classes summed, with
    /// debts subtracted rather than added.
    static func serverTotal(_ classes: [String: ClassReading]) -> Double {
        classes.reduce(0.0) { sum, entry in
            guard serverIncludesInTotal(entry.value.status) else { return sum }
            let value = entry.value.value ?? 0
            return entry.key == "debts" ? sum - value : sum + value
        }
    }

    // swiftlint:disable:next function_body_length
    static func response(
        total: Double = 0,
        classes: [String: ClassReading] = [:],
        excluded: ExcludedSummary? = nil,
        connectionHealth: [ConnectionHealthEntry] = [],
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
            declared: nil,
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
            excluded: excluded ?? serverExcluded(classes),
            connectionHealth: connectionHealth,
            generatedAt: generatedAt,
            bankRefresh: bankRefresh
        )
    }

    static func item(
        id: String = "item-1",
        institutionName: String? = nil,
        status: PlaidItemStatus = .reauthRequired,
        repairable: Bool = true
    ) -> PlaidItemHealth {
        PlaidItemHealth(
            itemId: id,
            institutionName: institutionName,
            status: status,
            statusChangedAt: nil,
            lastErrorCode: nil,
            newAccountsAvailable: false,
            disabled: false,
            repairable: repairable
        )
    }
}
