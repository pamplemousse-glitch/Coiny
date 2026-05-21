import Foundation

/// Mirrors the backend `GET /api/pets` response shape.
/// Source of truth: `backend/src/store/pet.ts:PetState`.
struct PetState: Codable, Hashable, Sendable {
    let healthScore: Int
    let mood: Int
    let lastReactionAt: Date?
    let reactionHistory: [ReactionRecord]
    let goals: PetGoals
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
