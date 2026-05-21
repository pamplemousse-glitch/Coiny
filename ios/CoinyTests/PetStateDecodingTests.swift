import XCTest
@testable import Coiny

final class PetStateDecodingTests: XCTestCase {
    func testDecodesRealBackendResponse() throws {
        // Captured from production GET /api/pets on 2026-05-20.
        let json = """
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
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        // Match API.swift's date strategy for now — none needed since lastReactionAt is null.
        let pet = try decoder.decode(PetState.self, from: json)

        XCTAssertEqual(pet.healthScore, 50)
        XCTAssertEqual(pet.mood, 50)
        XCTAssertNil(pet.lastReactionAt)
        XCTAssertEqual(pet.reactionHistory.count, 0)
        XCTAssertEqual(pet.goals.savingsGoal, 7777)
        XCTAssertEqual(pet.goals.largePurchaseThreshold, 420)
        XCTAssertEqual(pet.goals.weeklyBudgetByCategory["groceries"], 150)
    }
}
