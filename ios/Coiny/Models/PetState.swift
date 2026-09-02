import Foundation

/// Mirrors the backend `GET /api/pets` response shape.
/// Legacy scalars: `backend/src/store/pet.ts:PetState`.
/// Goal-system fields (additive, null until the first refresh has run):
/// `backend/src/api/pets.ts` assembles `{...legacy, stage, derived, declarations, ladder}`.
struct PetState: Codable, Hashable, Sendable {
    let healthScore: Int
    let mood: Int
    let lastReactionAt: Date?
    let reactionHistory: [ReactionRecord]
    let goals: PetGoals

    /// Monotonic creature stage 0 to 7, `backend/src/store/goals.ts:getPetStage`.
    /// Optional so pre-goal-system payloads and fixtures still decode.
    let stage: Int?
    /// Nightly-derived financial substrate; null until the pipeline has run.
    let derived: DerivedState?
    /// User-declared ladder target overrides.
    let declarations: LadderDeclarations?
    /// The Foundation Ladder; null until the pipeline has run.
    let ladder: LadderSnapshot?
    /// How old the money behind the ladder's figures is (R-8.2, backend
    /// `ladder_state.inputs_as_of`).
    ///
    /// NOT when the ladder was recomputed. A ladder recomputed five minutes ago
    /// from a bank that stopped syncing last week has a fresh recomputation and
    /// week-old money, and Home showed the second as if it were the first.
    ///
    /// Nil means UNKNOWN, never fresh: a contributing class carried no
    /// timestamp, or the row predates the column. Rendering nil as "just now"
    /// reintroduces exactly the unlabelled stale value R-8.2 forbids.
    let dataAsOf: Date?

    init(
        healthScore: Int,
        mood: Int,
        lastReactionAt: Date?,
        reactionHistory: [ReactionRecord],
        goals: PetGoals,
        stage: Int? = nil,
        derived: DerivedState? = nil,
        declarations: LadderDeclarations? = nil,
        ladder: LadderSnapshot? = nil,
        dataAsOf: Date? = nil
    ) {
        self.healthScore = healthScore
        self.mood = mood
        self.lastReactionAt = lastReactionAt
        self.reactionHistory = reactionHistory
        self.goals = goals
        self.stage = stage
        self.derived = derived
        self.declarations = declarations
        self.ladder = ladder
        self.dataAsOf = dataAsOf
    }
}

struct ReactionRecord: Codable, Hashable, Sendable, Identifiable {
    var id: String { at.ISO8601Format() + eventType }
    let at: Date
    let eventType: String
    let reaction: Reaction
}

struct Reaction: Codable, Hashable, Sendable {
    let animation: String
    let sound: String
    let led: String
    let duration: Int
    let reason: String
}

struct PetGoals: Codable, Hashable, Sendable {
    let weeklyBudgetByCategory: [String: Double]
    let savingsGoal: Int
    let paycheckMinAmount: Int
    let largePurchaseThreshold: Int
}
