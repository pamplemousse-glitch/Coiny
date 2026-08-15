import Foundation

// Client mirror of the Foundation Ladder read shape.
//
// Source of truth: `backend/src/goals/refresh.ts` (`LadderView`, `ActiveRungView`)
// and `backend/src/goals/ladder.ts` (`RungStatus`, `RungState`). The Android
// client consumes the same API; nothing here may assume fields the server does
// not send.

/// `backend/src/goals/ladder.ts:RungStatus`. A rung can never be failed, only
/// satisfied, skipped, or not applicable. There is no losing state anywhere.
enum RungStatus: String, Codable, Hashable, Sendable {
    case pending
    case active
    case completed
    case notApplicable = "not_applicable"
    case skipped
}

/// `backend/src/goals/ladder.ts:RungState`.
struct LadderRungState: Codable, Hashable, Sendable {
    let status: RungStatus
    let completedAt: Date?
    let skippedReason: String?

    init(status: RungStatus, completedAt: Date? = nil, skippedReason: String? = nil) {
        self.status = status
        self.completedAt = completedAt
        self.skippedReason = skippedReason
    }
}

/// `backend/src/goals/refresh.ts:ActiveRungView`. The only rung the server
/// evaluates live; every other rung carries just its stored status.
struct ActiveRung: Codable, Hashable, Sendable {
    let id: Int
    let key: String
    let name: String
    /// The stage NAME ("Adolescent"), not the numeric stage.
    let stage: String
    let blurb: String
    /// 0 to 1 progress toward the rung's condition.
    let progress: Double
    /// Rung-specific unit: USD for rungs 1/3/4/7, a rate for 5, months for 6,
    /// null for 0 and 2. See `RUNGS` in ladder.ts before formatting.
    let target: Double?
    let gap: Double?
    /// True when the inputs to judge this rung are missing. The UI must read
    /// "too early to say", never zero and never a failure.
    let indeterminate: Bool
}

/// `backend/src/goals/refresh.ts:LadderView.reopened`: completed rungs whose
/// condition is currently violated. Surfaced as tasks, never as a demotion.
struct ReopenedRung: Codable, Hashable, Sendable {
    let id: Int
    let key: String
    let name: String
}

/// `backend/src/goals/refresh.ts:LadderView`.
struct LadderSnapshot: Codable, Hashable, Sendable {
    let currentRung: Int
    /// Keyed by rung id as a string ("0" through "7"), exactly as stored.
    let rungs: [String: LadderRungState]
    let activeRung: ActiveRung?
    let reopened: [ReopenedRung]

    func rungState(_ id: Int) -> LadderRungState? {
        rungs[String(id)]
    }

    func isReopened(_ id: Int) -> Bool {
        reopened.contains { $0.id == id }
    }
}

/// `backend/src/store/goals.ts:getDerivedState`. Null fields mean "we do not
/// know yet", which is different from zero and must never render as zero.
struct DerivedState: Codable, Hashable, Sendable {
    let takeHomeMonthly: Double?
    let incomeVolatility: Double?
    let essentialMonthly: Double?
    let discretionaryMonthly: Double?
    let liquidCash: Double?
    let runwayMonths: Double?
    let savingsRate: Double?
}

/// `backend/src/store/declarations.ts:Declarations`.
struct LadderDeclarations: Codable, Hashable, Sendable {
    let shelteredTargetRate: Double?
    let surplusTargetRate: Double?
}

// MARK: - Static rung catalog

/// Names and copy for all eight rungs. The server's `LadderView` carries full
/// detail only for the active rung, so the journey list needs this table for
/// the other seven. Mirrors `RUNGS` in `backend/src/goals/ladder.ts`; if that
/// table changes, this one changes in the same PR.
struct RungInfo: Hashable, Sendable {
    let id: Int
    let name: String
    let stageName: String
    let blurb: String
    /// What would resolve an indeterminate evaluation, appended after
    /// "Too early to say." (PRD S-15 pattern). Nil when the rung's inputs
    /// cannot be indeterminate (rungs 0 and 3 always evaluate).
    let indeterminateHint: String?
}

enum RungCatalog {
    static let all: [RungInfo] = [
        RungInfo(
            id: 0, name: "Sighted", stageName: "Egg",
            blurb: "Everything you own, in one number.",
            indeterminateHint: nil
        ),
        RungInfo(
            id: 1, name: "Floor", stageName: "Hatchling",
            blurb: "A starter buffer, so a flat tyre is not a crisis.",
            indeterminateHint: "Connect the account you spend from and I can size your floor."
        ),
        RungInfo(
            id: 2, name: "Free money", stageName: "Sprout",
            blurb: "Your employer match, taken in full. It is the only free money you get.",
            indeterminateHint: "Tell me whether your employer matches and I can check this one."
        ),
        RungInfo(
            id: 3, name: "Bleeding stopped", stageName: "Fledgling",
            blurb: "Nothing left above 10% interest.",
            indeterminateHint: nil
        ),
        RungInfo(
            id: 4, name: "Buffer", stageName: "Adolescent",
            blurb: "A full emergency fund, sized to how steady your income actually is.",
            indeterminateHint: "A few weeks of transactions and I can size your buffer."
        ),
        RungInfo(
            id: 5, name: "Sheltered", stageName: "Adult",
            blurb: "Retirement accounts funded at a rate you set.",
            indeterminateHint: "Connect your 401k and I can check this one."
        ),
        RungInfo(
            id: 6, name: "Surplus", stageName: "Elder",
            blurb: "Your target savings rate, held for three months running.",
            indeterminateHint: "A few months of activity and I can measure your savings rate."
        ),
        RungInfo(
            id: 7, name: "Freedom", stageName: "Ascendant",
            blurb: "Twenty-five times your annual essentials. Work becomes optional.",
            indeterminateHint: "Connect your investment accounts and I can measure this one."
        ),
    ]

    static func info(_ id: Int) -> RungInfo? {
        all.first { $0.id == id }
    }

    /// Rung 7 never completes by design: it reports a percentage forever.
    static let freedomRungId = 7
}
