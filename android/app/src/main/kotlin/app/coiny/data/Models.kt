package app.coiny.data

import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable

/** Mirrors backend GET /api/pets response. Source of truth: backend/src/store/pet.ts:PetState */
@Serializable
data class PetState(
    val healthScore: Int,
    val mood: Int,
    val lastReactionAt: Instant? = null,
    val reactionHistory: List<ReactionRecord> = emptyList(),
    val goals: PetGoals,
)

@Serializable
data class ReactionRecord(
    val at: Instant,
    val eventType: String,
    val reaction: Reaction,
)

@Serializable
data class Reaction(
    val animation: String,
    val sound: String,
    val led: String,
    val duration: Int,
    val reason: String,
)

@Serializable
data class PetGoals(
    val weeklyBudgetByCategory: Map<String, Double> = emptyMap(),
    val savingsGoal: Int,
    val paycheckMinAmount: Int,
    val largePurchaseThreshold: Int,
)
