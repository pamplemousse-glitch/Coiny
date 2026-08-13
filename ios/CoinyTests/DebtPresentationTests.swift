import XCTest
@testable import Coiny

/// Copy and math tests for the debt surface's presentation layer: the cost of
/// the strategy choice always renders in both directions, an assumed APR is
/// never presented as fact, never_pays_off never renders as a blank date, and
/// the minimum keeps its R-7.16 "the trap" label.
final class DebtPresentationTests: XCTestCase {

    // MARK: - Fixtures

    private func account(
        id: String = "d1",
        nickname: String? = nil,
        type: DebtAccount.Kind = .creditCard,
        balance: Double? = 4820,
        apr: Double? = 24.24,
        aprAssumed: Bool = false,
        aprOverride: Double? = nil,
        minPayment: Double? = 85,
        status: DebtAccount.Status = .open
    ) -> DebtAccount {
        DebtAccount(
            debtId: id, issuer: "Chase Bank", nickname: nickname, type: type,
            sourceIds: ["plaid:a"], sources: ["plaid"], balance: balance, apr: apr,
            aprAssumed: aprAssumed, aprOverride: aprOverride, minPayment: minPayment,
            creditLimit: nil, dueDay: nil, statementCloseDay: nil, isPromotional: false,
            promoEndDate: nil, promoApr: nil, status: status, payment36: 189.41
        )
    }

    private func summary(months: Int?, date: String?, interest: Double) -> DebtPlanSummary {
        DebtPlanSummary(months: months, debtFreeDate: date, totalInterest: interest, order: ["d1"])
    }

    private func plan(
        strategy: DebtStrategy = .blend,
        months: Int? = 34,
        debtFreeDate: String? = "2029-06-13",
        totalInterest: Double = 2140,
        blend: Double = 2140,
        avalanche: Double = 1926,
        snowball: Double = 2946,
        minimumsMonths: Int? = 96,
        minimumsInterest: Double = 5242,
        findings: [DebtPlanFinding] = []
    ) -> DebtPlanResponse {
        DebtPlanResponse(
            strategy: strategy, extraMonthly: 200, months: months, debtFreeDate: debtFreeDate,
            totalInterest: totalInterest, order: ["d1"], perDebt: [], findings: findings,
            comparison: DebtPlanResponse.Comparison(
                blend: summary(months: 34, date: "2029-06-13", interest: blend),
                avalanche: summary(months: 33, date: "2029-05-13", interest: avalanche),
                snowball: summary(months: 36, date: "2029-08-13", interest: snowball),
                minimumsOnly: summary(months: minimumsMonths, date: nil, interest: minimumsInterest)
            ),
            costVsAvalanche: totalInterest - avalanche,
            costVsSnowball: totalInterest - snowball
        )
    }

    private func dollars(_ value: Double) -> String {
        DebtPresentation.currency(value)
    }

    // MARK: - Assumed APR mirror

    func testAssumedAprMirrorsTheBackendConstants() {
        // ASSUMED_CREDIT_CARD_APR / ASSUMED_OTHER_APR in backend/src/debts/strategy.ts.
        XCTAssertEqual(DebtPresentation.assumedAprPercent(for: .creditCard), 24.99)
        XCTAssertEqual(DebtPresentation.assumedAprPercent(for: .studentLoan), 12)
        XCTAssertEqual(DebtPresentation.assumedAprPercent(for: .other), 12)
    }

    func testAprLineFlagsAnAssumptionAndOffersTheNextAction() {
        let line = DebtPresentation.aprLine(for: account(apr: nil, aprAssumed: true))
        XCTAssertTrue(line.contains("No rate reported"), line)
        XCTAssertTrue(line.contains("24.99%"), line)
        XCTAssertTrue(line.contains("until you enter the real one"), line)
    }

    func testAprLineStatesAReportedRateAsFact() {
        XCTAssertEqual(DebtPresentation.aprLine(for: account(apr: 24.24)), "24.24% APR")
    }

    func testAprLineCreditsAUserEnteredRate() {
        let line = DebtPresentation.aprLine(for: account(apr: 21.99, aprOverride: 21.99))
        XCTAssertEqual(line, "21.99% APR, entered by you")
    }

    // MARK: - The primary number (R-7.16)

    func testClears36LineUsesTheCalendarMonth36MonthsOut() {
        let now = DebtPresentation.parseDay("2026-08-13")!
        let line = DebtPresentation.clearsIn36Line(payment36: 189.41, now: now)
        XCTAssertTrue(line.contains(dollars(189.41)), line)
        XCTAssertTrue(line.contains("2029"), line)
        XCTAssertTrue(line.contains("clears this by"), line)
    }

    func testMinimumKeepsItsTrapLabelAndRendersNilWhenAbsent() {
        XCTAssertEqual(
            DebtPresentation.minimumLine(minPayment: 85),
            "minimum (the trap): \(dollars(85))"
        )
        XCTAssertNil(DebtPresentation.minimumLine(minPayment: nil))
        XCTAssertNil(DebtPresentation.minimumLine(minPayment: 0))
    }

    // MARK: - never_pays_off

    func testNeverPaysOffStatesTheMinimumTheInterestAndTheFix() {
        let finding = DebtPlanFinding(id: "d1", kind: "never_pays_off", monthlyInterest: 96.19, clearingPayment36: 189.41)
        let line = DebtPresentation.neverPaysOffLine(minPayment: 85, finding: finding)
        XCTAssertTrue(line.contains("At \(dollars(85)) a month this never pays off."), line)
        XCTAssertTrue(line.contains("Interest adds \(dollars(96.19)) a month."), line)
        XCTAssertTrue(line.contains("\(dollars(189.41)) a month clears it in 3 years."), line)
    }

    func testNeverPaysOffWithoutAKnownMinimumStillStatesTheFix() {
        let finding = DebtPlanFinding(id: "d1", kind: "never_pays_off", monthlyInterest: 40, clearingPayment36: 120)
        let line = DebtPresentation.neverPaysOffLine(minPayment: nil, finding: finding)
        XCTAssertTrue(line.contains("does not cover the interest"), line)
        XCTAssertTrue(line.contains("\(dollars(120)) a month clears it in 3 years."), line)
    }

    // MARK: - Plan headline

    func testPlanHeadlineStatesTheDateAndTotalInterest() {
        let headline = DebtPresentation.planHeadline(plan: plan())
        XCTAssertTrue(headline.contains("Debt-free June 2029."), headline)
        XCTAssertTrue(headline.contains(dollars(2140)), headline)
    }

    func testPlanWithAFindingNeverRendersABlankDate() {
        let finding = DebtPlanFinding(id: "d1", kind: "never_pays_off", monthlyInterest: 96, clearingPayment36: 189)
        let headline = DebtPresentation.planHeadline(
            plan: plan(months: nil, debtFreeDate: nil, findings: [finding])
        )
        XCTAssertEqual(headline, "No debt-free date at these payments.")
    }

    func testMinimumsOnlyComparisonStatesDollarsAndYears() {
        let line = DebtPresentation.minimumsOnlyLine(plan: plan())
        // 96 - 34 = 62 months later, 5242 - 2140 = 3102 more interest.
        XCTAssertEqual(line, "Minimums only: debt-free 5.2 years later and \(dollars(3102)) more interest.")
    }

    func testMinimumsOnlyThatNeverClearsSaysSo() {
        let line = DebtPresentation.minimumsOnlyLine(plan: plan(minimumsMonths: nil))
        XCTAssertEqual(line, "Minimums only never get there.")
    }

    // MARK: - The cost of the choice (R-7.14)

    func testBlendSentenceShowsBothDirections() {
        let sentence = DebtPresentation.strategyCostSentence(chosen: .blend, comparison: plan().comparison)
        XCTAssertEqual(
            sentence,
            "Blend costs you \(dollars(214)) more than pure avalanche and \(dollars(806)) less than pure snowball."
        )
    }

    func testAvalancheSentenceComparesAgainstBlendAndSnowball() {
        let sentence = DebtPresentation.strategyCostSentence(chosen: .avalanche, comparison: plan().comparison)
        XCTAssertEqual(
            sentence,
            "Avalanche costs \(dollars(214)) less than blend and \(dollars(1020)) less than pure snowball."
        )
    }

    func testSnowballSentenceOwnsItsCost() {
        let sentence = DebtPresentation.strategyCostSentence(chosen: .snowball, comparison: plan().comparison)
        XCTAssertEqual(
            sentence,
            "Snowball costs you \(dollars(806)) more than blend and \(dollars(1020)) more than pure avalanche."
        )
    }

    func testATiedStrategyReadsAsAMatchNotAsZeroDollars() {
        let comparison = plan(blend: 2000, avalanche: 2000, snowball: 2900).comparison
        let sentence = DebtPresentation.strategyCostSentence(chosen: .blend, comparison: comparison)
        XCTAssertEqual(
            sentence,
            "Blend matches pure avalanche and costs \(dollars(900)) less than pure snowball."
        )
    }

    // MARK: - Order rows

    func testOrderLineStatesTheDateInterestAndAssumedRate() {
        let entry = DebtPlanPerDebt(
            id: "d1", order: 2, payoffMonth: 7, payoffDate: "2027-03-13", interestPaid: 1204, aprAssumed: true
        )
        XCTAssertEqual(
            DebtPresentation.orderLine(entry: entry, name: "Chase Freedom"),
            "Chase Freedom, gone March 2027, \(dollars(1204)) interest (rate assumed)"
        )
    }

    func testOrderLineForADebtThatNeverClearsSaysItPlainly() {
        let entry = DebtPlanPerDebt(id: "d1", order: 1, payoffMonth: nil, payoffDate: nil, interestPaid: 0, aprAssumed: false)
        XCTAssertEqual(
            DebtPresentation.orderLine(entry: entry, name: "Store card"),
            "Store card: never at these payments"
        )
    }

    // MARK: - Names, tags and totals

    func testDisplayNamePrefersTheNickname() {
        XCTAssertEqual(DebtPresentation.displayName(for: account(nickname: "The old card")), "The old card")
        XCTAssertEqual(DebtPresentation.displayName(for: account()), "Chase Bank")
        XCTAssertEqual(DebtPresentation.displayName(for: account(nickname: "")), "Chase Bank")
    }

    func testStatusRendersAsAWordAndOpenRendersNothing() {
        XCTAssertNil(DebtPresentation.statusTag(.open))
        XCTAssertEqual(DebtPresentation.statusTag(.delinquent), "past due")
        XCTAssertEqual(DebtPresentation.statusTag(.closed), "closed")
    }

    func testTotalOwedSkipsClosedAccountsAndNilBalances() {
        let debts = [
            account(id: "a", balance: 1000),
            account(id: "b", balance: 500, status: .closed),
            account(id: "c", balance: nil),
            account(id: "d", balance: 250, status: .delinquent),
        ]
        XCTAssertEqual(DebtPresentation.totalOwed(debts: debts), 1250)
    }

    func testYearsPhraseCoversMonthsAndFractionalYears() {
        XCTAssertEqual(DebtPresentation.yearsPhrase(months: 1), "1 month")
        XCTAssertEqual(DebtPresentation.yearsPhrase(months: 11), "11 months")
        XCTAssertEqual(DebtPresentation.yearsPhrase(months: 12), "1 year")
        XCTAssertEqual(DebtPresentation.yearsPhrase(months: 24), "2 years")
        XCTAssertEqual(DebtPresentation.yearsPhrase(months: 30), "2.5 years")
    }

    func testMonthYearParsesServerDayStrings() {
        XCTAssertEqual(DebtPresentation.monthYear(from: "2028-03-01"), "March 2028")
        XCTAssertNil(DebtPresentation.monthYear(from: nil))
        XCTAssertNil(DebtPresentation.monthYear(from: "not-a-date"))
    }

    /// The copy rules with teeth (PRD 10): no shaming phrase, no emoji, no
    /// em dash in anything this surface generates.
    func testGeneratedCopyNeverShames() {
        let finding = DebtPlanFinding(id: "d1", kind: "never_pays_off", monthlyInterest: 96, clearingPayment36: 189)
        let lines = [
            DebtPresentation.neverPaysOffLine(minPayment: 85, finding: finding),
            DebtPresentation.planHeadline(plan: plan()),
            DebtPresentation.strategyCostSentence(chosen: .blend, comparison: plan().comparison),
            DebtPresentation.aprLine(for: account(apr: nil, aprAssumed: true)),
        ]
        for line in lines {
            XCTAssertFalse(line.lowercased().contains("you owe"), line)
            XCTAssertFalse(line.contains("\u{2014}"), "em dash in: \(line)")
        }
    }
}
