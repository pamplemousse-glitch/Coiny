import XCTest
@testable import Coiny

final class SubscriptionRevealTests: XCTestCase {
    private func stream(
        merchant: String?,
        description: String? = nil,
        frequency: String = "MONTHLY",
        average: String? = "17.99",
        direction: String = "outflow",
        active: Bool = true
    ) -> PlaidRecurringStream {
        PlaidRecurringStream(
            streamId: UUID().uuidString,
            direction: direction,
            merchantName: merchant,
            description: description,
            frequency: frequency,
            averageAmount: average,
            lastAmount: nil,
            isActive: active
        )
    }

    private func local(_ merchant: String, cadence: Int = 30, amount: Double) -> DetectedSubscription {
        DetectedSubscription(merchantName: merchant, cadenceDays: cadence, amount: amount, count: 4, lastDate: "2026-08-01")
    }

    // MARK: - Cadence mapping

    func testPlaidFrequencyMapping() {
        XCTAssertEqual(RevealBuilder.cadenceDays(forPlaidFrequency: "WEEKLY"), 7)
        XCTAssertEqual(RevealBuilder.cadenceDays(forPlaidFrequency: "BIWEEKLY"), 14)
        XCTAssertEqual(RevealBuilder.cadenceDays(forPlaidFrequency: "SEMI_MONTHLY"), 15)
        XCTAssertEqual(RevealBuilder.cadenceDays(forPlaidFrequency: "monthly"), 30)
        XCTAssertEqual(RevealBuilder.cadenceDays(forPlaidFrequency: "ANNUALLY"), 365)
        XCTAssertNil(RevealBuilder.cadenceDays(forPlaidFrequency: "UNKNOWN"))
    }

    // MARK: - Merge (R-5.5)

    func testMergeDedupesByLowercasedMerchantPreferringLocalDetector() {
        let merged = RevealBuilder.merge(
            local: [local("Netflix", amount: 17.99)],
            streams: [stream(merchant: "NETFLIX", average: "15.49")]
        )
        XCTAssertEqual(merged.count, 1)
        XCTAssertEqual(merged[0].source, .localDetector)
        XCTAssertEqual(merged[0].amountUSD, 17.99, accuracy: 0.001)
    }

    func testMergeExcludesInflowInactiveAndUnknownFrequencyStreams() {
        let merged = RevealBuilder.merge(local: [], streams: [
            stream(merchant: "Payroll Inc", direction: "inflow"),
            stream(merchant: "Old Gym", active: false),
            stream(merchant: "Mystery", frequency: "UNKNOWN"),
        ])
        XCTAssertTrue(merged.isEmpty)
    }

    func testMergeFallsBackToStreamDescriptionWhenMerchantMissing() {
        let merged = RevealBuilder.merge(local: [], streams: [
            stream(merchant: nil, description: "SPOTIFY P0B"),
        ])
        XCTAssertEqual(merged.map(\.merchantName), ["SPOTIFY P0B"])
    }

    func testMergeSortsByAmountDescending() {
        let merged = RevealBuilder.merge(
            local: [local("Small", amount: 4.99), local("Big", amount: 59.99)],
            streams: []
        )
        XCTAssertEqual(merged.map(\.merchantName), ["Big", "Small"])
    }

    // MARK: - Annualisation

    func testAnnualTotalUsesAmountTimes365OverCadence() {
        let items = [
            RevealItem(merchantName: "A", cadenceDays: 30, amountUSD: 10, source: .localDetector),
            RevealItem(merchantName: "B", cadenceDays: 365, amountUSD: 100, source: .plaidStream),
        ]
        // 10 * 365/30 + 100 = 121.666... + 100
        XCTAssertEqual(RevealBuilder.annualTotalUSD(items), 221.6, accuracy: 0.1)
    }

    func testHeadlineContainsCountAndAnnualTotal() {
        let headline = RevealBuilder.headline(count: 7, annualTotalUSD: 1_340)
        XCTAssertEqual(
            headline,
            "This account pays for 7 things on repeat. $1,340 a year. Worth a look before we start?"
        )
    }

    func testHeadlineSingular() {
        XCTAssertTrue(RevealBuilder.headline(count: 1, annualTotalUSD: 96).contains("1 thing on repeat"))
    }
}
