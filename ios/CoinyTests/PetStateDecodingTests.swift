import XCTest
@testable import Coiny

final class PetStateDecodingTests: XCTestCase {

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .custom { dec in
            let s = try dec.singleValueContainer().decode(String.self)
            let fmtFrac = ISO8601DateFormatter()
            fmtFrac.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let fmtPlain = ISO8601DateFormatter()
            fmtPlain.formatOptions = [.withInternetDateTime]
            if let date = fmtFrac.date(from: s) { return date }
            if let date = fmtPlain.date(from: s) { return date }
            throw DecodingError.dataCorruptedError(in: dec.singleValueContainer() as! SingleValueDecodingContainer,
                                                   debugDescription: "Cannot decode date: \(s)")
        }
        return d
    }()

    // MARK: - Happy path

    func testDecodesRealBackendResponse() throws {
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

        let pet = try decoder.decode(PetState.self, from: json)
        XCTAssertEqual(pet.healthScore, 50)
        XCTAssertEqual(pet.mood, 50)
        XCTAssertNil(pet.lastReactionAt)
        XCTAssertEqual(pet.reactionHistory.count, 0)
        XCTAssertEqual(pet.goals.savingsGoal, 7777)
        XCTAssertEqual(pet.goals.largePurchaseThreshold, 420)
        XCTAssertEqual(pet.goals.weeklyBudgetByCategory["groceries"], 150)
    }

    func testDecodesHealthScoreZero() throws {
        let json = """
        {
          "healthScore": 0,
          "mood": 0,
          "lastReactionAt": null,
          "reactionHistory": [],
          "goals": {"weeklyBudgetByCategory": {}, "savingsGoal": 0, "paycheckMinAmount": 0, "largePurchaseThreshold": 0}
        }
        """.data(using: .utf8)!
        let pet = try decoder.decode(PetState.self, from: json)
        XCTAssertEqual(pet.healthScore, 0)
        XCTAssertEqual(pet.mood, 0)
    }

    func testDecodesHealthScoreMaximum() throws {
        let json = """
        {
          "healthScore": 100,
          "mood": 100,
          "lastReactionAt": null,
          "reactionHistory": [],
          "goals": {"weeklyBudgetByCategory": {}, "savingsGoal": 1000000, "paycheckMinAmount": 0, "largePurchaseThreshold": 0}
        }
        """.data(using: .utf8)!
        let pet = try decoder.decode(PetState.self, from: json)
        XCTAssertEqual(pet.healthScore, 100)
        XCTAssertEqual(pet.goals.savingsGoal, 1_000_000)
    }

    func testDecodesReactionHistoryWithPopulatedEntries() throws {
        let json = """
        {
          "healthScore": 75,
          "mood": 80,
          "lastReactionAt": "2026-05-21T12:00:00Z",
          "reactionHistory": [
            {
              "at": "2026-05-21T12:00:00Z",
              "eventType": "paycheck_received",
              "reaction": {
                "animation": "celebrate",
                "sound": "fanfare",
                "led": "rainbow",
                "duration": 3000,
                "reason": "paycheck_received (Direct Deposit $2400.00)"
              }
            },
            {
              "at": "2026-05-20T08:00:00Z",
              "eventType": "large_purchase",
              "reaction": {
                "animation": "concerned",
                "sound": "warning",
                "led": "amber",
                "duration": 2000,
                "reason": "large_purchase ($500.00)"
              }
            }
          ],
          "goals": {"weeklyBudgetByCategory": {}, "savingsGoal": 1000, "paycheckMinAmount": 500, "largePurchaseThreshold": 200}
        }
        """.data(using: .utf8)!
        let pet = try decoder.decode(PetState.self, from: json)
        XCTAssertEqual(pet.reactionHistory.count, 2)
        XCTAssertEqual(pet.reactionHistory[0].reaction.animation, "celebrate")
        XCTAssertEqual(pet.reactionHistory[1].reaction.animation, "concerned")
        XCTAssertNotNil(pet.lastReactionAt)
    }

    func testDecodesEmptyWeeklyBudgetByCategory() throws {
        let json = """
        {
          "healthScore": 50,
          "mood": 50,
          "lastReactionAt": null,
          "reactionHistory": [],
          "goals": {"weeklyBudgetByCategory": {}, "savingsGoal": 500, "paycheckMinAmount": 500, "largePurchaseThreshold": 200}
        }
        """.data(using: .utf8)!
        let pet = try decoder.decode(PetState.self, from: json)
        XCTAssertTrue(pet.goals.weeklyBudgetByCategory.isEmpty)
    }

    // MARK: - Error cases

    func testMissingHealthScoreThrows() {
        let json = """
        {
          "mood": 50,
          "lastReactionAt": null,
          "reactionHistory": [],
          "goals": {"weeklyBudgetByCategory": {}, "savingsGoal": 0, "paycheckMinAmount": 0, "largePurchaseThreshold": 0}
        }
        """.data(using: .utf8)!
        XCTAssertThrowsError(try decoder.decode(PetState.self, from: json))
    }

    func testWrongTypeForHealthScoreThrows() {
        let json = """
        {
          "healthScore": "fifty",
          "mood": 50,
          "lastReactionAt": null,
          "reactionHistory": [],
          "goals": {"weeklyBudgetByCategory": {}, "savingsGoal": 0, "paycheckMinAmount": 0, "largePurchaseThreshold": 0}
        }
        """.data(using: .utf8)!
        XCTAssertThrowsError(try decoder.decode(PetState.self, from: json))
    }

    func testMissingGoalsThrows() {
        let json = """
        {
          "healthScore": 50,
          "mood": 50,
          "lastReactionAt": null,
          "reactionHistory": []
        }
        """.data(using: .utf8)!
        XCTAssertThrowsError(try decoder.decode(PetState.self, from: json))
    }

    func testCompletelyEmptyObjectThrows() {
        XCTAssertThrowsError(try decoder.decode(PetState.self, from: "{}".data(using: .utf8)!))
    }
}
