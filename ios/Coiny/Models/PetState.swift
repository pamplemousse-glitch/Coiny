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

    init(
        healthScore: Int,
        mood: Int,
        lastReactionAt: Date?,
        reactionHistory: [ReactionRecord],
        goals: PetGoals,
        stage: Int? = nil,
        derived: DerivedState? = nil,
        declarations: LadderDeclarations? = nil,
        ladder: LadderSnapshot? = nil
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
