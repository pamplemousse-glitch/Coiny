package app.coiny.data

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

// Mirror of ios/CoinyTests/PetStateDecodingTests.swift. Asserts that the
// Kotlin Models.kt schema stays in sync with the backend's GET /api/pets
// response shape. Captured from production on 2026-05-20.
class PetStateDecodingTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun decodesRealBackendResponse() {
        val payload = """
            {
              "healthScore": 50,
              "mood": 50,
              "lastReactionAt": null,
              "reactionHistory": [],
              "goals": {
                "weeklyBudgetByCategory": {
                  "groceries": 150,
                  "restaurants": 150,
                  "food_and_drink": 150
                },
                "savingsGoal": 7777,
                "paycheckMinAmount": 500,
                "largePurchaseThreshold": 420
              }
            }
        """.trimIndent()

        val pet = json.decodeFromString<PetState>(payload)

        assertEquals(50, pet.healthScore)
        assertEquals(50, pet.mood)
        assertNull(pet.lastReactionAt)
        assertTrue(pet.reactionHistory.isEmpty())
        assertEquals(7777, pet.goals.savingsGoal)
        assertEquals(420, pet.goals.largePurchaseThreshold)
        assertEquals(150.0, pet.goals.weeklyBudgetByCategory["groceries"]!!, 0.0)
    }
}
