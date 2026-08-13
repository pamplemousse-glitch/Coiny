import XCTest
@testable import Coiny

final class WealthGroupsTests: XCTestCase {
    // MARK: - Class-to-group mapping

    func testEveryClassBelongsToExactlyOneGroup() {
        // 25 classes, mirroring backend NET_WORTH_CLASS_NAMES.
        XCTAssertEqual(WealthClass.allCases.count, 25)
        for cls in WealthClass.allCases {
            // group is total; assert each raw name is unique.
            XCTAssertEqual(WealthClass.allCases.filter { $0 == cls }.count, 1)
        }
    }

    func testClassNamesMatchBackendVocabulary() {
        let backendNames: Set<String> = [
            "bank", "investments", "crypto", "defi", "chainWallets", "hyperliquid",
            "polymarket", "kraken", "kalshi", "alpaca", "ynab", "truelayer", "nft",
            "debts", "sneakers", "pokemonCards", "tradingCards", "coins", "vinyl",
            "metals", "energy", "farmland", "realEstate", "vehicles", "manual",
        ]
        XCTAssertEqual(Set(WealthClass.allCases.map(\.rawValue)), backendNames)
    }

    func testDebtsIsTheOnlyOwedClass() {
        let owed = WealthClass.allCases.filter { $0.group == .owed }
        XCTAssertEqual(owed, [.debts])
    }

    // MARK: - Sections

    func testNotConnectedClassesAreNeverRendered() {
        let response = NetWorthFixtures.response(classes: [
            "bank": NetWorthFixtures.reading(value: 100, status: .ok),
            "crypto": NetWorthFixtures.reading(value: nil, status: .notConnected),
        ])
        let sections = WealthPresenter.sections(from: response)

        XCTAssertEqual(sections.count, 1)
        XCTAssertEqual(sections.first?.group, .liquid)
    }

    func testEmptyGroupsAreNotRendered() {
        let response = NetWorthFixtures.response(classes: [
            "realEstate": NetWorthFixtures.reading(value: 300_000, status: .ok),
        ])
        let sections = WealthPresenter.sections(from: response)

        XCTAssertEqual(sections.map(\.group), [.owned])
    }

    func testNoClassesMeansNoSections() {
        XCTAssertTrue(WealthPresenter.sections(from: NetWorthFixtures.response()).isEmpty)
    }

    func testGroupTotalExcludesFailedAndExpiredClasses() {
        let response = NetWorthFixtures.response(classes: [
            "crypto": NetWorthFixtures.reading(value: 1000, status: .ok),
            "defi": NetWorthFixtures.reading(value: 500, status: .error),
            "chainWallets": NetWorthFixtures.reading(value: 200, status: .staleExcluded),
            "kraken": NetWorthFixtures.reading(value: 300, status: .stale),
        ])
        let sections = WealthPresenter.sections(from: response)

        XCTAssertEqual(sections.count, 1)
        let cryptoGroup = sections[0]
        XCTAssertEqual(cryptoGroup.rows.count, 4, "excluded classes still render as rows")
        XCTAssertEqual(cryptoGroup.includedTotal, 1300, "a failed class contributes nothing, never a zero-that-hides")
    }

    func testGroupsRenderInFixedOrder() {
        let response = NetWorthFixtures.response(classes: [
            "debts": NetWorthFixtures.reading(value: 900, status: .ok),
            "bank": NetWorthFixtures.reading(value: 100, status: .ok),
            "kalshi": NetWorthFixtures.reading(value: 10, status: .ok),
            "investments": NetWorthFixtures.reading(value: 50, status: .ok),
        ])
        let groups = WealthPresenter.sections(from: response).map(\.group)

        XCTAssertEqual(groups, [.liquid, .invested, .speculative, .owed])
    }

    // MARK: - Composition bar

    func testCompositionExcludesOwedAndSumsToOne() {
        let response = NetWorthFixtures.response(classes: [
            "bank": NetWorthFixtures.reading(value: 600, status: .ok),
            "investments": NetWorthFixtures.reading(value: 400, status: .ok),
            "debts": NetWorthFixtures.reading(value: 500, status: .ok),
        ])
        let segments = WealthPresenter.compositionSegments(from: WealthPresenter.sections(from: response))

        XCTAssertEqual(segments.map(\.group), [.liquid, .invested])
        XCTAssertEqual(segments.reduce(0) { $0 + $1.fraction }, 1.0, accuracy: 0.0001)
        XCTAssertEqual(segments[0].fraction, 0.6, accuracy: 0.0001)
    }

    func testCompositionEmptyWhenNothingIncluded() {
        let response = NetWorthFixtures.response(classes: [
            "bank": NetWorthFixtures.reading(value: 600, status: .error),
        ])
        XCTAssertTrue(WealthPresenter.compositionSegments(from: WealthPresenter.sections(from: response)).isEmpty)
    }

    // MARK: - Row treatments (R-8.4 table)

    private func row(_ cls: WealthClass, value: Double?, asOf: Date?, status: ClassStatus) -> WealthRow {
        WealthRow(cls: cls, reading: ClassReading(value: value, asOf: asOf, status: status))
    }

    func testOkRendersPlain() {
        let treatment = WealthPresenter.treatment(for: row(.bank, value: 10, asOf: Date(), status: .ok))
        XCTAssertEqual(treatment, .plain)
    }

    func testStaleRendersAgeLabel() {
        let asOf = Date(timeIntervalSince1970: 1_700_000_000)
        let now = asOf.addingTimeInterval(3 * 3600)
        let treatment = WealthPresenter.treatment(for: row(.crypto, value: 10, asOf: asOf, status: .stale), now: now)
        if case let .aged(label) = treatment {
            XCTAssertTrue(label.hasPrefix("as of "), "got \(label)")
        } else {
            XCTFail("Expected .aged, got \(treatment)")
        }
    }

    func testErrorRendersProviderFailure() {
        let treatment = WealthPresenter.treatment(for: row(.crypto, value: nil, asOf: nil, status: .error))
        XCTAssertEqual(treatment, .failure(message: "Can't reach Coinbase right now."))
    }

    func testStaleExcludedRendersMuted() {
        let treatment = WealthPresenter.treatment(for: row(.defi, value: 40, asOf: nil, status: .staleExcluded))
        XCTAssertEqual(treatment, .mutedExcluded(label: "Stale. Refresh or reconnect."))
    }

    func testDisconnectedAndPendingAndExpiring() {
        XCTAssertEqual(WealthPresenter.treatment(for: row(.bank, value: nil, asOf: nil, status: .disconnected)), .disconnected)
        XCTAssertEqual(WealthPresenter.treatment(for: row(.bank, value: nil, asOf: nil, status: .pending)), .pending)
        XCTAssertEqual(WealthPresenter.treatment(for: row(.bank, value: 5, asOf: nil, status: .expiring)), .expiring)
    }

    func testManualIsAlwaysSelfReported() {
        let asOf = Date(timeIntervalSince1970: 1_700_000_000)
        let treatment = WealthPresenter.treatment(for: row(.manual, value: 100, asOf: asOf, status: .ok))
        if case let .selfReported(label) = treatment {
            XCTAssertTrue(label.hasPrefix("Self-reported "), "got \(label)")
        } else {
            XCTFail("Expected .selfReported, got \(treatment)")
        }
    }

    // MARK: - Labels

    private var utc: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        return calendar
    }

    private let en = Locale(identifier: "en_US")

    func testAsOfLabelSameDayShowsTimeOnly() {
        let now = Date(timeIntervalSince1970: 1_755_100_800) // 2025-08-13 16:00 UTC
        let date = now.addingTimeInterval(-2 * 3600)
        let label = WealthPresenter.asOfLabel(date, now: now, calendar: utc, locale: en)
        // Space before PM may be a narrow no-break space depending on ICU.
        XCTAssertTrue(label.hasPrefix("as of 2:00"), "got \(label)")
        XCTAssertTrue(label.contains("PM"), "got \(label)")
        XCTAssertFalse(label.contains("Aug"), "same-day label must not carry a date: \(label)")
    }

    func testAsOfLabelWithinWeekShowsWeekday() {
        let now = Date(timeIntervalSince1970: 1_755_100_800)
        let date = now.addingTimeInterval(-2 * 86400)
        let label = WealthPresenter.asOfLabel(date, now: now, calendar: utc, locale: en)
        XCTAssertTrue(label.contains("Mon"), "got \(label)")
    }

    func testAsOfLabelOlderShowsDate() {
        let now = Date(timeIntervalSince1970: 1_755_100_800)
        let date = now.addingTimeInterval(-30 * 86400)
        let label = WealthPresenter.asOfLabel(date, now: now, calendar: utc, locale: en)
        XCTAssertEqual(label, "as of Jul 14")
    }

    func testExcludedDisplayNamesMapToHumanNames() {
        let names = WealthPresenter.excludedDisplayNames(
            ExcludedSummary(count: 2, classes: ["crypto", "chainWallets"])
        )
        XCTAssertEqual(names, ["Coinbase", "On-chain wallets"])
    }

    func testExcludedDisplayNamesPassUnknownThrough() {
        let names = WealthPresenter.excludedDisplayNames(ExcludedSummary(count: 1, classes: ["newThing"]))
        XCTAssertEqual(names, ["newThing"])
    }
}
