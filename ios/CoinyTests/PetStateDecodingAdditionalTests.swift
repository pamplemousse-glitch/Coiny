import XCTest
@testable import Coiny

final class PetStateDecodingAdditionalTests: XCTestCase {

    // MARK: - Shared decoder (mirrors API.makeDecoder)

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .custom { dec in
            let container = try dec.singleValueContainer()
            let s = try container.decode(String.self)
            let fmtFrac = ISO8601DateFormatter()
            fmtFrac.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let fmtPlain = ISO8601DateFormatter()
            fmtPlain.formatOptions = [.withInternetDateTime]
            if let date = fmtFrac.date(from: s) { return date }
            if let date = fmtPlain.date(from: s) { return date }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Cannot decode date: \(s)"
            )
        }
        return d
    }()

    // MARK: - ReactionRecord full decode

    func testDecodesFullReactionRecord() throws {
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
            }
          ],
          "goals": {
            "weeklyBudgetByCategory": {},
            "savingsGoal": 1000,
            "paycheckMinAmount": 500,
            "largePurchaseThreshold": 200
          }
        }
        """.data(using: .utf8)!

        let pet = try decoder.decode(PetState.self, from: json)
        let record = try XCTUnwrap(pet.reactionHistory.first)

        XCTAssertEqual(record.eventType, "paycheck_received")
        XCTAssertEqual(record.reaction.animation, "celebrate")
        XCTAssertEqual(record.reaction.sound, "fanfare")
        XCTAssertEqual(record.reaction.led, "rainbow")
        XCTAssertEqual(record.reaction.duration, 3000)
        XCTAssertEqual(record.reaction.reason, "paycheck_received (Direct Deposit $2400.00)")
    }

    // MARK: - Goals with budget categories

    func testDecodesGoalsWithBudgetCategories() throws {
        let json = """
        {
          "healthScore": 60,
          "mood": 55,
          "lastReactionAt": null,
          "reactionHistory": [],
          "goals": {
            "weeklyBudgetByCategory": {
              "groceries": 150.0,
              "restaurants": 80.0,
              "entertainment": 50.0
            },
            "savingsGoal": 2000,
            "paycheckMinAmount": 500,
            "largePurchaseThreshold": 300
          }
        }
        """.data(using: .utf8)!

        let pet = try decoder.decode(PetState.self, from: json)

        XCTAssertEqual(pet.goals.weeklyBudgetByCategory.count, 3)
        XCTAssertEqual(pet.goals.weeklyBudgetByCategory["groceries"], 150.0)
        XCTAssertEqual(pet.goals.weeklyBudgetByCategory["restaurants"], 80.0)
        XCTAssertEqual(pet.goals.weeklyBudgetByCategory["entertainment"], 50.0)
    }

    // MARK: - healthScore and mood presence

    func testHealthScoreAndMoodPresent() throws {
        let json = """
        {
          "healthScore": 82,
          "mood": 73,
          "lastReactionAt": null,
          "reactionHistory": [],
          "goals": {
            "weeklyBudgetByCategory": {},
            "savingsGoal": 1000,
            "paycheckMinAmount": 500,
            "largePurchaseThreshold": 200
          }
        }
        """.data(using: .utf8)!

        let pet = try decoder.decode(PetState.self, from: json)

        XCTAssertEqual(pet.healthScore, 82)
        XCTAssertEqual(pet.mood, 73)
    }

    // MARK: - lastReactionAt null

    func testLastReactionAtNullDecodes() throws {
        let json = """
        {
          "healthScore": 50,
          "mood": 50,
          "lastReactionAt": null,
          "reactionHistory": [],
          "goals": {
            "weeklyBudgetByCategory": {},
            "savingsGoal": 500,
            "paycheckMinAmount": 500,
            "largePurchaseThreshold": 200
          }
        }
        """.data(using: .utf8)!

        let pet = try decoder.decode(PetState.self, from: json)

        XCTAssertNil(pet.lastReactionAt)
    }

    // MARK: - ReactionRecord computed id stability

    func testReactionHistoryIdIsStable() throws {
        let json = """
        {
          "healthScore": 50,
          "mood": 50,
          "lastReactionAt": null,
          "reactionHistory": [
            {
              "at": "2026-05-21T12:00:00Z",
              "eventType": "paycheck_received",
              "reaction": {
                "animation": "celebrate",
                "sound": "fanfare",
                "led": "rainbow",
                "duration": 3000,
                "reason": "test"
              }
            },
            {
              "at": "2026-05-21T12:00:00Z",
              "eventType": "paycheck_received",
              "reaction": {
                "animation": "celebrate",
                "sound": "fanfare",
                "led": "rainbow",
                "duration": 3000,
                "reason": "test"
              }
            }
          ],
          "goals": {
            "weeklyBudgetByCategory": {},
            "savingsGoal": 1000,
            "paycheckMinAmount": 500,
            "largePurchaseThreshold": 200
          }
        }
        """.data(using: .utf8)!

        let pet = try decoder.decode(PetState.self, from: json)
        XCTAssertEqual(pet.reactionHistory.count, 2)

        // Both records have the same at + eventType, so their computed ids must be equal.
        let id1 = pet.reactionHistory[0].id
        let id2 = pet.reactionHistory[1].id
        XCTAssertEqual(id1, id2)
        XCTAssertFalse(id1.isEmpty)
    }

    // MARK: - Missing required field throws DecodingError

    func testDecodeFailsOnMissingRequiredField() {
        let json = """
        {
          "mood": 50,
          "lastReactionAt": null,
          "reactionHistory": [],
          "goals": {
            "weeklyBudgetByCategory": {},
            "savingsGoal": 0,
            "paycheckMinAmount": 0,
            "largePurchaseThreshold": 0
          }
        }
        """.data(using: .utf8)!

        XCTAssertThrowsError(try decoder.decode(PetState.self, from: json)) { error in
            XCTAssertTrue(error is DecodingError,
                          "Expected DecodingError, got \(type(of: error))")
        }
    }

    // MARK: - SpinwheelDebt CodingKeys rename

    func testSpinwheelDebtCodingKeys() throws {
        // The JSON field is "type" but the Swift property is "debtType".
        let json = """
        {
          "id": "debt-1",
          "type": "credit_card",
          "balance": 500.0,
          "monthlyPayment": 25.0
        }
        """.data(using: .utf8)!

        let debt = try JSONDecoder().decode(SpinwheelDebt.self, from: json)

        XCTAssertEqual(debt.id, "debt-1")
        XCTAssertEqual(debt.debtType, "credit_card")
        XCTAssertEqual(debt.balance, 500.0)
        XCTAssertEqual(debt.monthlyPayment, 25.0)
    }

    // MARK: - BankAccount CodingKeys rename

    func testBankAccountCodingKeys() throws {
        // The JSON field is "accountId" but the Swift Identifiable.id maps from it.
        let json = """
        {
          "accountId": "acct-xyz",
          "name": "Savings",
          "type": "savings",
          "balance": 1200.50,
          "minPayment": null,
          "nextDueDate": null
        }
        """.data(using: .utf8)!

        let account = try JSONDecoder().decode(BankAccount.self, from: json)

        XCTAssertEqual(account.id, "acct-xyz")
        XCTAssertEqual(account.name, "Savings")
        XCTAssertEqual(account.type, "savings")
        XCTAssertEqual(account.balance, 1200.50)
        XCTAssertNil(account.minPayment)
    }

    // MARK: - Full NetWorthResponse decode

    func testNetWorthResponseDecodesAllFields() throws {
        let json = """
        {
          "total": 12500.0,
          "bank": 5000.0,
          "investments": 4000.0,
          "crypto": 2000.0,
          "defi": 500.0,
          "debts": -1000.0,
          "accounts": {
            "bank": [
              {
                "accountId": "b1",
                "name": "Checking",
                "type": "depository",
                "balance": 5000.0,
                "minPayment": null,
                "nextDueDate": null
              }
            ],
            "investments": [
              {
                "securityId": "s1",
                "name": "AAPL",
                "ticker": "AAPL",
                "value": 4000.0
              }
            ],
            "crypto": [
              {
                "id": "bitcoin",
                "name": "Bitcoin",
                "symbol": "BTC",
                "amount": 0.05,
                "valueUSD": 2000.0
              }
            ],
            "defi": { "totalUSD": 500.0 },
            "debts": [
              {
                "id": "d1",
                "type": "credit_card",
                "balance": 1000.0,
                "monthlyPayment": 50.0
              }
            ]
          },
          "connections": {
            "coinbase": true,
            "zerion": true,
            "spinwheel": false
          }
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(NetWorthResponse.self, from: json)

        XCTAssertEqual(response.total, 12500.0)
        XCTAssertEqual(response.bank, 5000.0)
        XCTAssertEqual(response.investments, 4000.0)
        XCTAssertEqual(response.crypto, 2000.0)
        XCTAssertEqual(response.defi, 500.0)
        XCTAssertEqual(response.debts, -1000.0)

        XCTAssertEqual(response.accounts.bank.count, 1)
        XCTAssertEqual(response.accounts.bank[0].id, "b1")
        XCTAssertEqual(response.accounts.investments.count, 1)
        XCTAssertEqual(response.accounts.investments[0].ticker, "AAPL")
        XCTAssertEqual(response.accounts.crypto.count, 1)
        XCTAssertEqual(response.accounts.crypto[0].symbol, "BTC")
        XCTAssertEqual(response.accounts.defi.totalUSD, 500.0)
        XCTAssertEqual(response.accounts.debts.count, 1)
        XCTAssertEqual(response.accounts.debts[0].type, "credit_card")

        XCTAssertTrue(response.connections.coinbase)
        XCTAssertTrue(response.connections.zerion)
        XCTAssertFalse(response.connections.spinwheel)
    }
}
