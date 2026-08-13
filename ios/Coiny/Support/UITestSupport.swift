#if DEBUG
import Foundation

/// Deterministic pet fixture served when the app runs under `--ui-testing`.
/// UI tests bypass sign-in, so real API calls would 401 and Home would sit in
/// its silent no-data state forever; this makes the journey surface testable.
/// Debug-only: never compiled into a release build.
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
            ladder: LadderSnapshot(
                currentRung: 4,
                rungs: [
                    "0": LadderRungState(status: .completed),
                    "1": LadderRungState(status: .completed),
                    "2": LadderRungState(status: .completed),
                    "3": LadderRungState(status: .completed),
                    "4": LadderRungState(status: .active),
                    "5": LadderRungState(status: .pending),
                    "6": LadderRungState(status: .pending),
                    "7": LadderRungState(status: .pending),
                ],
                activeRung: ActiveRung(
                    id: 4,
                    key: "buffer",
                    name: "Buffer",
                    stage: "Adolescent",
                    blurb: "A full emergency fund, sized to how steady your income actually is.",
                    progress: 0.62,
                    target: 12_000,
                    gap: 4560,
                    indeterminate: false
                ),
                reopened: []
            )
        )
    }
}
#endif
