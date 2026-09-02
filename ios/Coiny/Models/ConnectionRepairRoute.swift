import Foundation

/// Where the "Reconnect" button on Wealth actually goes.
///
/// The button existed and went nowhere. `NetWorthView` set
/// `reconnectTarget = entry` and nothing in the app read that state: no sheet,
/// no navigation, no call. A user was told "Kraken needs you to sign in again",
/// tapped Reconnect, and watched nothing happen. Broken connections are the
/// category's top churn cause, and a dead button on the one screen that names
/// the broken thing is worse than no button, because it spends the user's trust
/// before it fails.
///
/// Plaid is deliberately absent. It is the one provider with a genuine repair
/// API (Link update mode, `ConnectionRepairViewModel`), and the server never
/// puts Plaid items in `connectionHealth`: they have their own lifecycle from
/// ITEM webhooks and their own prompt. Everything here repairs the only way it
/// can, by sending the user back to the screen that made the connection in the
/// first place. For an OAuth vendor that is a fresh grant; for a key-based one
/// it is fresh keys. Neither is Link update mode and neither pretends to be.
enum ConnectionRepairRoute {
    /// The `ManageAccountsView` section that can repair a given provider.
    ///
    /// Keys are the provider strings the server emits in `connectionHealth`
    /// (`backend/src/networth/read.ts`, the `pushIfUnhealthy` calls). They are a
    /// wire contract, not a display name: a rename on either side has to move
    /// both, and `ConnectionRepairRouteTests` asserts the full set so the
    /// mapping cannot quietly lose one.
    ///
    /// Three of them do not repair a section named after themselves, because
    /// the section is named after the asset class the user sees:
    ///   - `coinbase` lives inside Crypto
    ///   - `zerion` lives inside DeFi
    ///   - `spinwheel` lives inside Debts
    static let sectionByProvider: [String: ManageAccountsSection] = [
        "coinbase": .crypto,
        "zerion": .defi,
        "spinwheel": .debts,
        "chain": .chainWallets,
        "nft": .nft,
        "hyperliquid": .hyperliquid,
        "polymarket": .polymarket,
        "kraken": .kraken,
        "alpaca": .alpaca,
        "ynab": .ynab,
        "discogs": .discogs,
        "kalshi": .kalshi,
        "truelayer": .truelayer,
    ]

    /// The section to open for `provider`, or nil for one this build does not
    /// know about.
    ///
    /// Nil is a real answer, not a failure: the server can ship a new provider
    /// before the app that knows where to send it, and an old build must show
    /// the user the accounts screen rather than crash or scroll somewhere
    /// arbitrary. `NetWorthView` opens the directory unscrolled in that case.
    static func section(for provider: String) -> ManageAccountsSection? {
        sectionByProvider[provider]
    }
}

/// One anchored section of the connect-and-manage directory.
///
/// Exists so a repair destination is a value that can be tested rather than a
/// string typed twice: once at the `.id()` and once at the `scrollTo`.
enum ManageAccountsSection: String, CaseIterable, Hashable, Sendable {
    case bank
    case investments
    case crypto
    case defi
    case chainWallets
    case hyperliquid
    case nft
    case alpaca
    case manualAssets
    case metals
    case realEstate
    case vehicles
    case sneakers
    case discogs
    case kraken
    case ynab
    case kalshi
    case polymarket
    case truelayer
    case pokemonCards
    case energy
    case farmland
    case tradingCards
    case coins
    case debts
    case performance
}
