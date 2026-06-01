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

/**
 * Mirrors backend GET /api/net-worth.
 * Only fields used by the Android Wealth MVP are decoded; everything else is
 * permitted by [Json.ignoreUnknownKeys = true] on the API client.
 */
@Serializable
data class NetWorth(
    val total: Double = 0.0,
    val bank: Double = 0.0,
    val investments: Double = 0.0,
    val crypto: Double = 0.0,
    val defi: Double = 0.0,
    val chainWallets: Double = 0.0,
    val hyperliquid: Double = 0.0,
    val polymarket: Double = 0.0,
    val realEstate: Double = 0.0,
    val vehicles: Double = 0.0,
    val metals: Double = 0.0,
    val sneakers: Double = 0.0,
    val nft: Double = 0.0,
    val manual: Double = 0.0,
    val steam: Double = 0.0,
    val pokemonCards: Double = 0.0,
    val kalshi: Double = 0.0,
    val kraken: Double = 0.0,
    val alpaca: Double = 0.0,
    val snaptrade: Double = 0.0,
    val ynab: Double = 0.0,
    val vinyl: Double = 0.0,
    val truelayer: Double = 0.0,
    val energy: Double = 0.0,
    val farmland: Double = 0.0,
    val tradingCards: Double = 0.0,
    val coins: Double = 0.0,
    val debts: Double = 0.0,
    val liquidCashMonths: Double? = null,
)
