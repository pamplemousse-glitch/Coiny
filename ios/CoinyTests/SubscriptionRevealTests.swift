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

    // MARK: - Cadence mapping

    func testPlaidFrequencyMapping() {
        XCTAssertEqual(RevealBuilder.cadenceDays(forPlaidFrequency: "WEEKLY"), 7)
        XCTAssertEqual(RevealBuilder.cadenceDays(forPlaidFrequency: "BIWEEKLY"), 14)
        XCTAssertEqual(RevealBuilder.cadenceDays(forPlaidFrequency: "SEMI_MONTHLY"), 15)
        XCTAssertEqual(RevealBuilder.cadenceDays(forPlaidFrequency: "monthly"), 30)
        XCTAssertEqual(RevealBuilder.cadenceDays(forPlaidFrequency: "ANNUALLY"), 365)
        XCTAssertNil(RevealBuilder.cadenceDays(forPlaidFrequency: "UNKNOWN"))
    }

    // MARK: - Build

    // Was testMergeDedupesByLowercasedMerchantPreferringLocalDetector. The
    // local detector is gone, so there is nothing to prefer; what still has to
    // hold is that one merchant produces one row even when Plaid reports the
    // same merchant on two cadences.
    func testCollapsesTwoStreamsForTheSameMerchantKeepingTheLargerAnnualised() {
        let built = RevealBuilder.build(streams: [
            stream(merchant: "NETFLIX", average: "15.49"),
            stream(merchant: "Netflix", frequency: "ANNUALLY", average: "199.00"),
        ])
        XCTAssertEqual(built.count, 1)
        XCTAssertEqual(built[0].amountUSD, 199.00, accuracy: 0.001)
    }

    func testExcludesInflowInactiveAndUnknownFrequencyStreams() {
        let built = RevealBuilder.build(streams: [
            stream(merchant: "Payroll Inc", direction: "inflow"),
            stream(merchant: "Old Gym", active: false),
            stream(merchant: "Mystery", frequency: "UNKNOWN"),
        ])
        XCTAssertTrue(built.isEmpty)
    }

    func testFallsBackToStreamDescriptionWhenMerchantMissing() {
        let built = RevealBuilder.build(streams: [
            stream(merchant: nil, description: "SPOTIFY P0B"),
        ])
        XCTAssertEqual(built.map(\.merchantName), ["SPOTIFY P0B"])
    }

    func testSortsByAmountDescending() {
        let built = RevealBuilder.build(streams: [
            stream(merchant: "Small", average: "4.99"),
            stream(merchant: "Big", average: "59.99"),
        ])
        XCTAssertEqual(built.map(\.merchantName), ["Big", "Small"])
    }

    // MARK: - Annualisation

    func testAnnualTotalUsesAmountTimes365OverCadence() {
        let items = [
            RevealItem(merchantName: "A", cadenceDays: 30, amountUSD: 10),
            RevealItem(merchantName: "B", cadenceDays: 365, amountUSD: 100),
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
