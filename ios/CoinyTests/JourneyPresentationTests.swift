import XCTest
@testable import Coiny

/// Tests for the pure goal/guardrail presentation. The load-bearing block is
/// the null-pace behaviour: R-7.8's three deliberate null cases must read
/// "too early to say" (or the dateless line) and must NEVER render as zero or
/// as "Off pace".
final class JourneyPresentationTests: XCTestCase {

    private let now = Date(timeIntervalSince1970: 1_786_000_000) // 2026-08-06

    private func goal(
        targetDate: String? = "2027-03-14",
        achievedAt: Date? = nil,
        pace: GoalPace?
    ) -> TargetGoal {
        TargetGoal(
            id: 1,
            name: "Japan in March",
            emoji: nil,
            kind: .save,
            targetAmountUsd: 4000,
            targetDate: targetDate,
            fundingAccountId: "acct-1",
            countsExistingBalance: true,
            contributionRule: .recurringDefault,
            recurringAnnual: false,
            createdAt: Date(timeIntervalSince1970: 1_700_000_000),
            achievedAt: achievedAt,
            archivedAt: nil,
            pace: pace
        )
    }

    // MARK: - Null pace: never zero, never "Off pace"

    func testNoPaceRowYetReadsTooEarly() {
        let display = JourneyPresentation.display(for: goal(pace: nil), now: now)
        XCTAssertNil(display.bandLabel)
        XCTAssertNil(display.progress)
        XCTAssertEqual(display.statusLine, "Too early to say. The nightly check has not run yet.")
    }

    func testDatelessGoalRendersContributionsOnly() {
        let pace = GoalPace(currentAmountUsd: 500, actualRunRateUsd: 120)
        let display = JourneyPresentation.display(for: goal(targetDate: nil, pace: pace), now: now)
        XCTAssertNil(display.bandLabel, "A dateless goal must never carry a pace band (R-7.8)")
        XCTAssertEqual(display.statusLine, "No date set. $120 a month going in lately.")
        // The known current amount still renders honestly.
        XCTAssertEqual(display.amountLine, "$500 of $4,000")
    }

    func testDatelessGoalWithoutContributionsStaysQuiet() {
        let pace = GoalPace(currentAmountUsd: 500)
        let display = JourneyPresentation.display(for: goal(targetDate: nil, pace: pace), now: now)
        XCTAssertEqual(display.statusLine, "No date set. Contributions will show here as they arrive.")
    }

    func testUnknownBalanceReadsTooEarlyNotZero() {
        let pace = GoalPace(actualRunRateUsd: 120, contributionHistoryDays: 90)
        let display = JourneyPresentation.display(for: goal(pace: pace), now: now)
        XCTAssertNil(display.bandLabel)
        XCTAssertNil(display.progress, "An unknown balance must not render an empty (zero) bar")
        XCTAssertNil(display.amountLine)
        XCTAssertEqual(display.statusLine, "Too early to say. I cannot read this goal's balance yet.")
    }

    func testThinContributionHistoryReadsTooEarly() {
        let pace = GoalPace(currentAmountUsd: 900, contributionHistoryDays: 10)
        let display = JourneyPresentation.display(for: goal(pace: pace), now: now)
        XCTAssertNil(display.bandLabel)
        XCTAssertEqual(
            display.statusLine,
            "Too early to say. A few more weeks of activity and I can read the pace."
        )
    }

    func testNullPaceNeverReadsOffPace() {
        let nullCases: [TargetGoal] = [
            goal(pace: nil),
            goal(targetDate: nil, pace: GoalPace(currentAmountUsd: 100)),
            goal(pace: GoalPace(actualRunRateUsd: 50)),
            goal(pace: GoalPace(currentAmountUsd: 100, contributionHistoryDays: 5)),
        ]
        for candidate in nullCases {
            let display = JourneyPresentation.display(for: candidate, now: now)
            XCTAssertNil(display.bandLabel)
            XCTAssertNotEqual(display.statusLine?.contains("Off pace"), true)
            XCTAssertNotEqual(display.percentText, "0%")
        }
    }

    // MARK: - Bands

    func testBandsRenderTheirSpecNames() {
        XCTAssertEqual(JourneyPresentation.bandLabel(.ahead), "Ahead")
        XCTAssertEqual(JourneyPresentation.bandLabel(.onPace), "On pace")
        XCTAssertEqual(JourneyPresentation.bandLabel(.behind), "Behind")
        XCTAssertEqual(JourneyPresentation.bandLabel(.offPace), "Off pace")
    }

    func testOnPaceShowsProgressAndNoStatusSentence() {
        let pace = GoalPace(
            currentAmountUsd: 1240, actualRunRateUsd: 400,
            contributionHistoryDays: 120, pace: 1.0, paceBand: "on_pace"
        )
        let display = JourneyPresentation.display(for: goal(pace: pace), now: now)
        XCTAssertEqual(display.bandLabel, "On pace")
        XCTAssertEqual(display.percentText, "31%")
        XCTAssertEqual(display.amountLine, "$1,240 of $4,000")
        XCTAssertNil(display.statusLine)
    }

    // MARK: - Off pace copy (S-14)

    func testOffPaceWithAddMonthlySaysWhatGetsYouBack() {
        let pace = GoalPace(
            currentAmountUsd: 1240, actualRunRateUsd: 100,
            contributionHistoryDays: 120, pace: 0.3, paceBand: "off_pace",
            gapAction: .addMonthly(amountUsd: 61)
        )
        let display = JourneyPresentation.display(for: goal(pace: pace), now: now)
        XCTAssertEqual(display.bandLabel, "Off pace")
        XCTAssertEqual(display.statusLine, "+$61/month gets you back.")
    }

    func testOffPaceWithPushDateSaysTheDateMoved() {
        let pace = GoalPace(
            currentAmountUsd: 1240, actualRunRateUsd: 100,
            contributionHistoryDays: 120, pace: 0.3, paceBand: "off_pace",
            gapAction: .pushDate(weeks: 7)
        )
        let display = JourneyPresentation.display(for: goal(pace: pace), now: now)
        // 2027-03-14 plus 7 weeks is 2027-05-02; 2027 is not the current year.
        XCTAssertEqual(display.statusLine, "At this rate the date moves to May 2, 2027.")
    }

    func testOffPaceCopyNeverSaysYouAreBehind() {
        for action in [GoalGapAction.addMonthly(amountUsd: 61), .pushDate(weeks: 7)] {
            let pace = GoalPace(
                currentAmountUsd: 1240, actualRunRateUsd: 100,
                contributionHistoryDays: 120, pace: 0.3, paceBand: "off_pace",
                gapAction: action
            )
            let display = JourneyPresentation.display(for: goal(pace: pace), now: now)
            XCTAssertNotEqual(display.statusLine?.lowercased().contains("you are behind"), true)
        }
    }

    // MARK: - Achieved

    func testAchievedGoalReadsDone() {
        let pace = GoalPace(currentAmountUsd: 4200, paceBand: "ahead")
        let display = JourneyPresentation.display(for: goal(achievedAt: now, pace: pace), now: now)
        XCTAssertEqual(display.bandLabel, "Done")
        XCTAssertEqual(display.statusLine, "Fully funded.")
    }

    // MARK: - Guardrails

    private func guardrail(
        key: String = "contribution_streak",
        label: String = "Contribution streak",
        period: String = "week",
        reason: String? = nil,
        streak: Int = 0,
        tokens: Int = 2,
        latest: GuardrailLatestPeriod? = nil
    ) -> GuardrailStatus {
        GuardrailStatus(
            key: key, label: label, period: period,
            unavailableReason: reason, streak: streak, repairTokens: tokens, latest: latest
        )
    }

    private func period(_ outcome: String, repairUsed: Bool = false) -> GuardrailLatestPeriod {
        GuardrailLatestPeriod(
            periodStart: "2026-08-03", periodEnd: "2026-08-09",
            outcome: outcome, targetValue: nil, actualValue: nil, repairUsed: repairUsed
        )
    }

    func testSourcelessGuardrailNamesTheReasonNeverAFailure() {
        let display = JourneyPresentation.display(
            for: guardrail(key: "utilization_before_close", reason: "server reason")
        )
        XCTAssertTrue(display.isIndeterminate)
        XCTAssertEqual(
            display.outcomeText,
            "Not measurable yet. Needs statement dates and card limits no connection provides."
        )
        XCTAssertNil(display.streakText)
    }

    func testPassedPeriodReadsHeld() {
        let display = JourneyPresentation.display(
            for: guardrail(streak: 3, latest: period("passed"))
        )
        XCTAssertEqual(display.outcomeText, "Held this week.")
        XCTAssertEqual(display.streakText, "3 weeks running")
        XCTAssertEqual(display.repairText, "2 repair tokens banked")
        XCTAssertFalse(display.isIndeterminate)
    }

    func testMissedPeriodResetsTheCounterAndNothingElse() {
        let display = JourneyPresentation.display(for: guardrail(latest: period("missed")))
        XCTAssertEqual(display.outcomeText, "Missed last week. The counter reset, nothing else.")
    }

    func testRepairedMissKeepsTheStreak() {
        let display = JourneyPresentation.display(
            for: guardrail(streak: 4, tokens: 1, latest: period("missed", repairUsed: true))
        )
        XCTAssertEqual(display.outcomeText, "Missed last week. A repair token kept the streak.")
        XCTAssertEqual(display.streakText, "4 weeks running")
        XCTAssertEqual(display.repairText, "1 repair token banked")
    }

    func testIndeterminatePeriodReadsTooEarlyNeverMissed() {
        let display = JourneyPresentation.display(for: guardrail(latest: period("indeterminate")))
        XCTAssertEqual(display.outcomeText, "Too early to say for this week.")
        XCTAssertTrue(display.isIndeterminate)
    }

    func testStreaksAreWeeklyOrMonthlyNeverDaily() {
        let weekly = JourneyPresentation.display(for: guardrail(streak: 2, latest: period("passed")))
        XCTAssertEqual(weekly.periodNoun, "week")
        let monthly = JourneyPresentation.display(
            for: guardrail(key: "savings_rate_floor", period: "month", streak: 1, latest: period("passed"))
        )
        XCTAssertEqual(monthly.periodNoun, "month")
        XCTAssertEqual(monthly.streakText, "1 month running")
    }

    // MARK: - Skip reasons

    func testSkipReasonTokensRenderTheirCopy() {
        XCTAssertEqual(JourneyPresentation.skipReasonText("handled_elsewhere"), "Handled outside Coiny.")
        XCTAssertEqual(JourneyPresentation.skipReasonText("not_relevant"), "Not relevant to me.")
        XCTAssertEqual(JourneyPresentation.skipReasonText("not_now"), "Coming back to this later.")
    }

    func testUnknownSkipReasonRendersAsIs() {
        XCTAssertEqual(JourneyPresentation.skipReasonText("legacy free text"), "legacy free text")
        XCTAssertNil(JourneyPresentation.skipReasonText(nil))
    }
}
