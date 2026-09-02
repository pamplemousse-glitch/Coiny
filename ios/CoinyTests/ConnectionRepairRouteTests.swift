import XCTest
@testable import Coiny

/// The Reconnect button's destination map.
///
/// The button was set-and-never-read: `NetWorthView` assigned
/// `reconnectTarget` and nothing observed it, so tapping Reconnect on the one
/// screen that names a broken connection did nothing. These tests hold the
/// replacement to the wire contract, because the failure mode of a lookup table
/// keyed by strings from another codebase is that it silently misses one and
/// the button goes back to doing nothing for that provider.
final class ConnectionRepairRouteTests: XCTestCase {
    /// Every provider string `backend/src/networth/read.ts` can emit, from the
    /// `pushIfUnhealthy` call sites. Plaid is deliberately not among them: it
    /// has Link update mode and its own prompt, and the server keeps its items
    /// out of `connectionHealth`.
    private let serverProviders = [
        "zerion",
        "chain",
        "nft",
        "hyperliquid",
        "polymarket",
        "kraken",
        "alpaca",
        "ynab",
        "discogs",
        "kalshi",
        "truelayer",
        "coinbase",
        "spinwheel",
    ]

    func testEveryServerProviderHasADestination() {
        for provider in serverProviders {
            XCTAssertNotNil(
                ConnectionRepairRoute.section(for: provider),
                "\(provider) can be reported unhealthy and has nowhere to send the user"
            )
        }
    }

    func testMapCoversExactlyTheServerProviders() {
        // An extra key is a provider the server never emits, which means a
        // destination nobody reaches and a rename nobody noticed.
        XCTAssertEqual(
            Set(ConnectionRepairRoute.sectionByProvider.keys),
            Set(serverProviders)
        )
    }

    // The three that do not repair a section named after themselves, because
    // the directory names its sections after the asset class the user sees.
    func testCoinbaseRepairsInsideCrypto() {
        XCTAssertEqual(ConnectionRepairRoute.section(for: "coinbase"), .crypto)
    }

    func testZerionRepairsInsideDefi() {
        XCTAssertEqual(ConnectionRepairRoute.section(for: "zerion"), .defi)
    }

    func testSpinwheelRepairsInsideDebts() {
        XCTAssertEqual(ConnectionRepairRoute.section(for: "spinwheel"), .debts)
    }

    // The three the runbook named: only Plaid had a repair path, and these
    // three showed "broken" with a button that did nothing.
    func testTheThreeNamedRepairPathsResolve() {
        XCTAssertEqual(ConnectionRepairRoute.section(for: "coinbase"), .crypto)
        XCTAssertEqual(ConnectionRepairRoute.section(for: "ynab"), .ynab)
        XCTAssertEqual(ConnectionRepairRoute.section(for: "truelayer"), .truelayer)
    }

    func testAnUnknownProviderHasNoDestination() {
        // Nil is a real answer: the server can ship a provider before the app
        // knows where to send it, and an old build opens the directory
        // unscrolled rather than scrolling somewhere arbitrary.
        XCTAssertNil(ConnectionRepairRoute.section(for: "some_future_vendor"))
    }

    func testPlaidIsNotRoutedHere() {
        // Plaid repairs through Link update mode (ConnectionRepairViewModel).
        // Sending it to the directory would replace a two-tap in-place repair
        // with a fresh link that loses the item's history.
        XCTAssertNil(ConnectionRepairRoute.section(for: "plaid"))
    }

    func testEveryDestinationIsADistinctSection() {
        // Two providers may legitimately share a section (none do today), but a
        // typo'd case would show up here as a collision nobody intended.
        let sections = ConnectionRepairRoute.sectionByProvider.values
        XCTAssertEqual(Set(sections).count, sections.count)
    }
}
