#if DEBUG
import Foundation

/// Shared mutable fixture state for `--ui-testing` runs, so a rung skipped
/// through the journey UI is reflected by the next pet fetch exactly as the
/// real backend would reflect it. Debug-only: never compiled into release.
actor UITestJourneyState {
    static let shared = UITestJourneyState()

    private(set) var optOuts: [Int: LadderRungState] = [:]

    func setOptOut(_ rungId: Int, status: RungStatus, reason: String?) {
        optOuts[rungId] = LadderRungState(status: status, skippedReason: reason)
    }

    func clearOptOut(_ rungId: Int) {
        optOuts[rungId] = nil
    }

    /// The fixture ladder (rungs 0 to 3 done, rung 4 active) with any recorded
    /// opt-outs applied and the active rung re-elected the way the server
    /// would: first rung neither completed, skipped, nor inapplicable.
    func ladder() -> LadderSnapshot {
        var rungs: [String: LadderRungState] = [
            "0": LadderRungState(status: .completed),
            "1": LadderRungState(status: .completed),
            "2": LadderRungState(status: .completed),
            "3": LadderRungState(status: .completed),
            "4": LadderRungState(status: .pending),
            "5": LadderRungState(status: .pending),
            "6": LadderRungState(status: .pending),
            "7": LadderRungState(status: .pending),
        ]
        for (id, state) in optOuts {
            rungs[String(id)] = state
        }

        let settled: Set<RungStatus> = [.completed, .skipped, .notApplicable]
        let activeId = (0...7).first { !settled.contains(rungs[String($0)]?.status ?? .pending) } ?? 7
        rungs[String(activeId)] = LadderRungState(status: .active)

        let activeRung: ActiveRung? =
            activeId == 4
            ? ActiveRung(
                id: 4,
                key: "buffer",
                name: "Buffer",
                stage: "Adolescent",
                blurb: "A full emergency fund, sized to how steady your income actually is.",
                progress: 0.62,
                target: 12_000,
                gap: 4560,
                indeterminate: false
            )
            : nil

        return LadderSnapshot(currentRung: activeId, rungs: rungs, activeRung: activeRung, reopened: [])
    }
}

/// Deterministic pet fixture served when the app runs under `--ui-testing`.
/// UI tests bypass sign-in, so real API calls would 401 and Home would sit in
/// its silent no-data state forever; this makes the journey surface testable.
struct UITestPetAPI: PetStoreAPI {
    func getPetState() async throws -> PetState {
        PetState(
            healthScore: 70,
            mood: 60,
            lastReactionAt: nil,
            reactionHistory: [],
            goals: PetGoals(
                weeklyBudgetByCategory: [:],
                savingsGoal: 1000,
                paycheckMinAmount: 500,
                largePurchaseThreshold: 200
            ),
            stage: 4,
            derived: DerivedState(
                takeHomeMonthly: 5200,
                incomeVolatility: 0.1,
                essentialMonthly: 2400,
                discretionaryMonthly: 1100,
                liquidCash: 7440,
                runwayMonths: 3.1,
                savingsRate: 0.18
            ),
            declarations: LadderDeclarations(shelteredTargetRate: nil, surplusTargetRate: nil),
            ladder: await UITestJourneyState.shared.ladder()
        )
    }
}

/// Deterministic goals-and-guardrails fixture for `--ui-testing`, covering the
/// states the journey must render honestly: a paced goal, a dateless goal
/// whose null pace reads "too early", and both sourceless guardrails.
struct UITestJourneyAPI: JourneyAPI {
    func getGoals() async throws -> GoalsListResponse {
        GoalsListResponse(
            goals: [
                TargetGoal(
                    id: 1,
                    name: "Japan in March",
                    emoji: nil,
                    kind: .save,
                    targetAmountUsd: 4000,
                    targetDate: "2027-03-14",
                    fundingAccountId: "acct-1",
                    countsExistingBalance: true,
                    contributionRule: .recurringDefault,
                    recurringAnnual: false,
                    createdAt: Date(timeIntervalSince1970: 1_700_000_000),
                    achievedAt: nil,
                    archivedAt: nil,
                    pace: GoalPace(
                        currentAmountUsd: 1240,
                        monthsRemaining: 7,
                        requiredRunRateUsd: 394,
                        actualRunRateUsd: 410,
                        contributionHistoryDays: 120,
                        pace: 1.04,
                        paceBand: "on_pace",
                        gapAction: nil,
                        computedAt: Date(timeIntervalSince1970: 1_700_000_000)
                    )
                ),
                TargetGoal(
                    id: 2,
                    name: "Rainy day",
                    emoji: nil,
                    kind: .save,
                    targetAmountUsd: 2000,
                    targetDate: nil,
                    fundingAccountId: nil,
                    countsExistingBalance: true,
                    contributionRule: .recurringDefault,
                    recurringAnnual: false,
                    createdAt: Date(timeIntervalSince1970: 1_700_000_000),
                    achievedAt: nil,
                    archivedAt: nil,
                    pace: GoalPace(computedAt: Date(timeIntervalSince1970: 1_700_000_000))
                ),
            ],
            maxActive: 3
        )
    }

    func getGuardrails() async throws -> GuardrailsResponse {
        func rail(
            _ key: String, _ label: String, _ period: String,
            reason: String? = nil, streak: Int = 0, outcome: String? = nil
        ) -> GuardrailStatus {
            GuardrailStatus(
                key: key,
                label: label,
                period: period,
                unavailableReason: reason,
                streak: streak,
                repairTokens: 2,
                latest: outcome.map {
                    GuardrailLatestPeriod(
                        periodStart: "2026-08-03",
                        periodEnd: "2026-08-09",
                        outcome: $0,
                        targetValue: nil,
                        actualValue: nil,
                        repairUsed: false
                    )
                }
            )
        }
        return GuardrailsResponse(guardrails: [
            rail("savings_rate_floor", "Savings rate floor", "month", outcome: "passed"),
            rail("discretionary_cap", "Discretionary cap", "week", streak: 3, outcome: "passed"),
            rail("bills_on_time", "Bills on time", "month", outcome: "indeterminate"),
            rail(
                "utilization_before_close", "Utilization before close", "month",
                reason: "Needs per-card statement close days and credit limits."
            ),
            rail("contribution_streak", "Contribution streak", "week", streak: 5, outcome: "passed"),
            rail("no_new_recurring", "No new recurring", "month", outcome: "missed"),
            rail(
                "debt_principal_paid", "Debt principal paid", "month",
                reason: "Needs payments matched to individual debts."
            ),
        ])
    }

    func createGoal(_ body: GoalCreateBody) async throws -> TargetGoal {
        TargetGoal(
            id: 99,
            name: body.name,
            emoji: body.emoji,
            kind: body.kind,
            targetAmountUsd: body.targetAmountUsd,
            targetDate: body.targetDate,
            fundingAccountId: body.fundingAccountId,
            countsExistingBalance: body.countsExistingBalance,
            contributionRule: body.contributionRule,
            recurringAnnual: body.recurringAnnual,
            createdAt: Date(timeIntervalSince1970: 1_700_000_000),
            achievedAt: nil,
            archivedAt: nil,
            pace: nil
        )
    }

    func updateGoal(id: Int, body: GoalPatchBody) async throws -> TargetGoal {
        TargetGoal(
            id: id,
            name: body.name,
            emoji: body.emoji,
            kind: body.kind,
            targetAmountUsd: body.targetAmountUsd,
            targetDate: body.targetDate,
            fundingAccountId: nil,
            countsExistingBalance: body.countsExistingBalance,
            contributionRule: .recurringDefault,
            recurringAnnual: body.recurringAnnual,
            createdAt: Date(timeIntervalSince1970: 1_700_000_000),
            achievedAt: nil,
            archivedAt: nil,
            pace: nil
        )
    }

    func archiveGoal(id: Int) async throws {}

    func skipLadderRung(
        _ rungId: Int,
        status: RungSkipStatus,
        reason: RungSkipReason?
    ) async throws -> LadderSnapshot {
        await UITestJourneyState.shared.setOptOut(
            rungId,
            status: status == .skipped ? .skipped : .notApplicable,
            reason: reason?.rawValue
        )
        return await UITestJourneyState.shared.ladder()
    }

    func unskipLadderRung(_ rungId: Int) async throws -> LadderSnapshot {
        await UITestJourneyState.shared.clearOptOut(rungId)
        return await UITestJourneyState.shared.ladder()
    }
}
#endif
