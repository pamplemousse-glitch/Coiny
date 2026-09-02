import XCTest
@testable import Coiny

/// Pure-logic tests for the Home surface derivations: creature condition,
/// the one action, the active rung block, and the journey rows.
final class HomePresentationTests: XCTestCase {

    // MARK: - Fixtures

    private func pet(
        mood: Int = 60,
        stage: Int? = 4,
        ladder: LadderSnapshot? = nil,
        reactions: [ReactionRecord] = [],
        dataAsOf: Date? = nil
    ) -> PetState {
        PetState(
            healthScore: 70,
            mood: mood,
            lastReactionAt: reactions.first?.at,
            reactionHistory: reactions,
            goals: PetGoals(weeklyBudgetByCategory: [:], savingsGoal: 0, paycheckMinAmount: 0, largePurchaseThreshold: 0),
            stage: stage,
            derived: nil,
            declarations: nil,
            ladder: ladder,
            dataAsOf: dataAsOf
        )
    }

    private func ladder(
        currentRung: Int,
        statuses: [Int: RungStatus],
        active: ActiveRung? = nil,
        reopened: [ReopenedRung] = []
    ) -> LadderSnapshot {
        var rungs: [String: LadderRungState] = [:]
        for (id, status) in statuses {
            rungs[String(id)] = LadderRungState(status: status)
        }
        return LadderSnapshot(currentRung: currentRung, rungs: rungs, activeRung: active, reopened: reopened)
    }

    private func activeRung(
        id: Int,
        name: String,
        progress: Double = 0.5,
        target: Double? = nil,
        gap: Double? = nil,
        indeterminate: Bool = false
    ) -> ActiveRung {
        ActiveRung(
            id: id, key: name.lowercased(), name: name, stage: "Stage", blurb: "Blurb for \(name).",
            progress: progress, target: target, gap: gap, indeterminate: indeterminate
        )
    }

    // MARK: - Creature condition

    func testNilPetIsIdleNotDisconnected() {
        // While loading or after an error we do not know; never beg for a
        // connection prematurely and never announce backend errors.
        XCTAssertEqual(HomePresentation.condition(for: nil), .idle)
        XCTAssertNil(HomePresentation.primaryAction(for: nil))
    }

    func testNoLadderMeansDisconnected() {
        XCTAssertEqual(HomePresentation.condition(for: pet(ladder: nil)), .disconnected)
    }

    func testActiveRungZeroMeansDisconnected() {
        let p = pet(ladder: ladder(currentRung: 0, statuses: [0: .active]))
        XCTAssertEqual(HomePresentation.condition(for: p), .disconnected)
    }

    func testConnectedIsIdle() {
        let p = pet(ladder: ladder(currentRung: 4, statuses: [0: .completed, 4: .active]))
        XCTAssertEqual(HomePresentation.condition(for: p), .idle)
    }

    func testLowMoodSleepsButDisconnectedNeverDoes() {
        let connected = pet(mood: 10, ladder: ladder(currentRung: 4, statuses: [0: .completed, 4: .active]))
        XCTAssertEqual(HomePresentation.condition(for: connected), .sleeping)
        // Disconnected wins: present, patient, never distressed.
        let disconnected = pet(mood: 10, ladder: nil)
        XCTAssertEqual(HomePresentation.condition(for: disconnected), .disconnected)
    }

    // MARK: - The one action

    func testDisconnectedGetsConnectActionOnly() {
        XCTAssertEqual(HomePresentation.primaryAction(for: pet(ladder: nil)), .connectAccount)
        let connected = pet(ladder: ladder(currentRung: 4, statuses: [0: .completed, 4: .active]))
        XCTAssertNil(HomePresentation.primaryAction(for: connected))
    }

    // MARK: - Speech

    func testSpeechIsNilWhenSleepingDisconnectedOrStale() {
        XCTAssertNil(HomePresentation.speechLine(for: pet(ladder: nil)))
        let sleeping = pet(mood: 5, ladder: ladder(currentRung: 4, statuses: [0: .completed, 4: .active]))
        XCTAssertNil(HomePresentation.speechLine(for: sleeping))

        let old = ReactionRecord(
            at: Date(timeIntervalSinceNow: -48 * 3600),
            eventType: "paycheck_received",
            reaction: Reaction(animation: "celebrate", sound: "s", led: "l", duration: 1, reason: "Paycheck landed.")
        )
        let stale = pet(ladder: ladder(currentRung: 4, statuses: [0: .completed, 4: .active]), reactions: [old])
        XCTAssertNil(HomePresentation.speechLine(for: stale))
    }

    func testSpeechShowsRecentReaction() {
        let recent = ReactionRecord(
            at: Date(timeIntervalSinceNow: -3600),
            eventType: "paycheck_received",
            reaction: Reaction(animation: "celebrate", sound: "s", led: "l", duration: 1, reason: "Paycheck landed.")
        )
        let p = pet(ladder: ladder(currentRung: 4, statuses: [0: .completed, 4: .active]), reactions: [recent])
        XCTAssertEqual(HomePresentation.speechLine(for: p), "Paycheck landed.")
    }

    // MARK: - Active rung block

    func testNoLadderFallsBackToRungZeroWithNoInventedNumbers() {
        let display = HomePresentation.activeRungDisplay(for: pet(ladder: nil))
        XCTAssertEqual(display?.code, "RUNG 0")
        XCTAssertEqual(display?.nameTag, "SIGHTED")
        XCTAssertNil(display?.progress)
        XCTAssertNil(display?.detailLine)
    }

    func testIndeterminateRungReadsTooEarlyToSayNeverZero() {
        let active = activeRung(id: 5, name: "Sheltered", progress: 0, indeterminate: true)
        let display = HomePresentation.display(for: active)
        XCTAssertNil(display.progress)
        XCTAssertNil(display.percentText)
        XCTAssertEqual(display.indeterminateText, "Too early to say. Connect your 401k and I can check this one.")
    }

    func testDeterminateRungShowsPercentAndCurrencyDetail() throws {
        let active = activeRung(id: 4, name: "Buffer", progress: 0.62, target: 12_000, gap: 4560)
        let display = HomePresentation.display(for: active)
        XCTAssertEqual(display.percentText, "62%")
        let detail = try XCTUnwrap(display.detailLine)
        XCTAssertEqual(detail, "\(HomePresentation.currency(7440)) of \(HomePresentation.currency(12_000))")
        XCTAssertNil(display.indeterminateText)
    }

    func testRungSixDetailIsMonthsNotCurrency() {
        let active = activeRung(id: 6, name: "Surplus", progress: 2.0 / 3.0, target: 3, gap: 1)
        let display = HomePresentation.display(for: active)
        XCTAssertEqual(display.detailLine, "2 of 3 months")
    }

    func testRungFiveDetailIsRatePercent() {
        let active = activeRung(id: 5, name: "Sheltered", progress: 0.6, target: 0.15, gap: 0.06)
        let display = HomePresentation.display(for: active)
        XCTAssertEqual(display.detailLine, "9% of 15% of take-home")
    }

    func testRungThreeDetailIsRemainingDebtOnly() {
        let active = activeRung(id: 3, name: "Bleeding stopped", progress: 0, target: 0, gap: 800)
        let display = HomePresentation.display(for: active)
        XCTAssertEqual(display.detailLine, "\(HomePresentation.currency(800)) left above 10% interest")
    }

    // MARK: - Journey rows

    func testJourneyAlwaysHasEightRowsInOrder() {
        XCTAssertEqual(HomePresentation.journeyRows(for: nil).map(\.id), Array(0...7))
        let p = pet(ladder: ladder(currentRung: 4, statuses: [0: .completed, 4: .active]))
        XCTAssertEqual(HomePresentation.journeyRows(for: p).map(\.id), Array(0...7))
    }

    func testJourneyRowsCarryStatuses() {
        let p = pet(ladder: ladder(
            currentRung: 4,
            statuses: [0: .completed, 1: .completed, 2: .notApplicable, 3: .skipped, 4: .active],
            active: activeRung(id: 4, name: "Buffer", progress: 0.62, target: 12_000, gap: 4560),
            reopened: [ReopenedRung(id: 1, key: "floor", name: "Floor")]
        ))
        let rows = HomePresentation.journeyRows(for: p)
        XCTAssertEqual(rows[0].detail, .done(reopened: false))
        XCTAssertEqual(rows[1].detail, .done(reopened: true))
        XCTAssertEqual(rows[2].detail, .notApplicable)
        XCTAssertEqual(rows[3].detail, .skipped(reason: nil))
        if case let .active(display) = rows[4].detail {
            XCTAssertEqual(display.percentText, "62%")
        } else {
            XCTFail("rung 4 should be active")
        }
        XCTAssertEqual(rows[5].detail, .pending)
        XCTAssertEqual(rows[7].detail, .pending)
    }

    func testFreedomRungReportsPercentAndNeverCompletes() {
        // Rung 7 is never marked done by the engine; the client renders its
        // percentage forever when active.
        let p = pet(ladder: ladder(
            currentRung: 7,
            statuses: [0: .completed, 1: .completed, 2: .completed, 3: .completed,
                       4: .completed, 5: .completed, 6: .completed, 7: .active],
            active: activeRung(id: 7, name: "Freedom", progress: 0.14, target: 720_000, gap: 619_200)
        ))
        let rows = HomePresentation.journeyRows(for: p)
        if case let .active(display) = rows[7].detail {
            XCTAssertEqual(display.percentText, "14%")
        } else {
            XCTFail("rung 7 should be active with a percentage")
        }
    }

    // MARK: - Accessibility label (R-11.2)

    func testWindowLabelStatesConditionAndRungInWords() {
        let p = pet(ladder: ladder(
            currentRung: 4,
            statuses: [0: .completed, 4: .active],
            active: activeRung(id: 4, name: "Buffer", progress: 0.62, target: 12_000, gap: 4560)
        ))
        XCTAssertEqual(
            HomePresentation.windowAccessibilityLabel(for: p),
            "Coiny is doing fine. Rung 4, Buffer, 62 percent complete."
        )
    }

    func testWindowLabelForIndeterminateRung() {
        let p = pet(ladder: ladder(
            currentRung: 5,
            statuses: [0: .completed, 5: .active],
            active: activeRung(id: 5, name: "Sheltered", indeterminate: true)
        ))
        XCTAssertEqual(
            HomePresentation.windowAccessibilityLabel(for: p),
            "Coiny is doing fine. Rung 5, Sheltered, too early to say."
        )
    }

    // MARK: - Staleness (R-8.2)
    //
    // Home shows real money in the rung detail line and carried no age
    // anywhere on the screen, while Wealth labelled every class. Home is the
    // default tab, so the surface most people look at was the one surface
    // where a month-old number looked exactly like a fresh one.

    private var moneyLadder: LadderSnapshot {
        ladder(
            currentRung: 4,
            statuses: [0: .completed, 4: .active],
            active: activeRung(id: 4, name: "Buffer", progress: 0.62, target: 12_000, gap: 4560)
        )
    }

    func testLabelsTheAgeOfTheMoneyOnScreen() throws {
        let now = Date(timeIntervalSince1970: 1_756_800_000)
        let p = pet(ladder: moneyLadder, dataAsOf: now.addingTimeInterval(-3600))
        let label = try XCTUnwrap(HomePresentation.dataAgeLabel(for: p, now: now))

        // Same phrasing Wealth uses, from the same formatter: two surfaces
        // saying one fact two ways is how a user learns to trust neither.
        XCTAssertEqual(label, WealthPresenter.asOfLabel(now.addingTimeInterval(-3600), now: now))
    }

    func testSaysAgeUnknownRatherThanNothingWhenTheServerHasNoTimestamp() {
        let p = pet(ladder: moneyLadder, dataAsOf: nil)

        // Silence would read as fresh, which is the exact failure being fixed.
        XCTAssertEqual(HomePresentation.dataAgeLabel(for: p), "age unknown")
    }

    func testNoLabelWhenThereIsNoFigureToLabel() {
        // An indeterminate rung states no number, so a date under it would be
        // a label attached to nothing.
        let indeterminate = ladder(
            currentRung: 2,
            statuses: [0: .completed, 2: .active],
            active: activeRung(id: 2, name: "Match", indeterminate: true)
        )
        let p = pet(ladder: indeterminate, dataAsOf: Date())

        XCTAssertNil(HomePresentation.dataAgeLabel(for: p))
    }

    func testNoLabelBeforeThePetLoads() {
        XCTAssertNil(HomePresentation.dataAgeLabel(for: nil))
    }

    func testNoLabelForANewUserWithNoLadderYet() {
        // Rung 0 from the catalog has no progress and no detail line.
        XCTAssertNil(HomePresentation.dataAgeLabel(for: pet(ladder: nil, dataAsOf: Date())))
    }

    func testOldMoneyIsLabelledWithADateRatherThanATime() throws {
        let now = Date(timeIntervalSince1970: 1_756_800_000)
        let p = pet(ladder: moneyLadder, dataAsOf: now.addingTimeInterval(-30 * 24 * 3600))
        let label = try XCTUnwrap(HomePresentation.dataAgeLabel(for: p, now: now))

        // A month-old figure must not read like something from this afternoon.
        XCTAssertFalse(label.contains(":"))
    }
}
