package app.coiny.data

import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable

/** Mirrors backend GET /api/pets response. Source of truth: backend/src/store/pet.ts:PetState */
@Serializable
data class PetState(
    val healthScore: Int = 0,
    val mood: Int = 0,
    val lastReactionAt: Instant? = null,
    val reactionHistory: List<ReactionRecord> = emptyList(),
    val goals: PetGoals? = null,
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
    val savingsGoal: Int = 0,
    val paycheckMinAmount: Int = 0,
    val largePurchaseThreshold: Int = 0,
)

/** Mirrors backend GET /api/spending/summary */
@Serializable
data class SpendingSummary(
    val monthlySpend: Double,
    val monthlyIncome: Double,
    val savingsRate: Int? = null,
    val spendByCategory: Map<String, Double>? = null,
)

/** Mirrors backend GET /api/spending/overrides */
@Serializable
data class SpendingOverride(
    val merchantName: String,
    val category: String,
)
