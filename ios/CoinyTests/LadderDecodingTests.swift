import XCTest
@testable import Coiny

/// Decoding tests for the goal-system fields `GET /api/pets` now returns:
/// `{...legacy, stage, derived, declarations, ladder}`. Shapes mirror
/// `backend/src/goals/refresh.ts:ladderView` and `ladder.ts:RungState`.
final class LadderDecodingTests: XCTestCase {

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
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode date: \(s)")
        }
        return d
    }()

    private func petJSON(extra: String) -> Data {
        """
        {
          "healthScore": 50,
          "mood": 50,
          "lastReactionAt": null,
          "reactionHistory": [],
          "goals": {"weeklyBudgetByCategory": {}, "savingsGoal": 0, "paycheckMinAmount": 0, "largePurchaseThreshold": 0}\(extra)
        }
        """.data(using: .utf8)!
    }

    func testLegacyPayloadWithoutGoalFieldsStillDecodes() throws {
        let pet = try decoder.decode(PetState.self, from: petJSON(extra: ""))
        XCTAssertNil(pet.stage)
        XCTAssertNil(pet.ladder)
        XCTAssertNil(pet.derived)
        XCTAssertNil(pet.declarations)
    }

    func testNullLadderDecodes() throws {
        let extra = """
        ,
          "stage": 0,
          "derived": null,
          "declarations": {"shelteredTargetRate": null, "surplusTargetRate": null},
          "ladder": null
        """
        let pet = try decoder.decode(PetState.self, from: petJSON(extra: extra))
        XCTAssertEqual(pet.stage, 0)
        XCTAssertNil(pet.ladder)
        XCTAssertNil(pet.derived)
        XCTAssertNil(pet.declarations?.shelteredTargetRate)
    }

    func testFullLadderDecodes() throws {
        let extra = """
        ,
          "stage": 4,
          "derived": {
            "takeHomeMonthly": 5200, "incomeVolatility": 0.1, "essentialMonthly": 2400,
            "discretionaryMonthly": 1100, "liquidCash": 7440, "runwayMonths": 3.1, "savingsRate": 0.18
          },
          "declarations": {"shelteredTargetRate": 0.2, "surplusTargetRate": null},
          "ladder": {
            "currentRung": 4,
            "rungs": {
              "0": {"status": "completed", "completedAt": "2026-08-01T00:00:00.000Z"},
              "1": {"status": "completed", "completedAt": "2026-08-01T00:00:00.000Z"},
              "2": {"status": "not_applicable"},
              "3": {"status": "skipped", "skippedReason": "handled elsewhere"},
              "4": {"status": "active"},
              "5": {"status": "pending"},
              "6": {"status": "pending"},
              "7": {"status": "pending"}
            },
            "activeRung": {
              "id": 4, "key": "buffer", "name": "Buffer", "stage": "Adolescent",
              "blurb": "A full emergency fund.", "progress": 0.62, "target": 12000,
              "gap": 4560, "indeterminate": false
            },
            "reopened": [{"id": 1, "key": "floor", "name": "Floor"}]
          }
        """
        let pet = try decoder.decode(PetState.self, from: petJSON(extra: extra))
        let ladder = try XCTUnwrap(pet.ladder)
        XCTAssertEqual(ladder.currentRung, 4)
        XCTAssertEqual(ladder.rungState(0)?.status, .completed)
        XCTAssertNotNil(ladder.rungState(0)?.completedAt)
        XCTAssertEqual(ladder.rungState(2)?.status, .notApplicable)
        XCTAssertEqual(ladder.rungState(3)?.status, .skipped)
        XCTAssertEqual(ladder.rungState(3)?.skippedReason, "handled elsewhere")
        XCTAssertEqual(ladder.activeRung?.id, 4)
        XCTAssertEqual(ladder.activeRung?.progress ?? 0, 0.62, accuracy: 0.0001)
        XCTAssertTrue(ladder.isReopened(1))
        XCTAssertFalse(ladder.isReopened(0))
        XCTAssertEqual(pet.derived?.liquidCash, 7440)
        XCTAssertEqual(pet.declarations?.shelteredTargetRate, 0.2)
    }

    func testIndeterminateActiveRungDecodes() throws {
        let extra = """
        ,
          "stage": 5,
          "derived": null,
          "declarations": {"shelteredTargetRate": null, "surplusTargetRate": null},
          "ladder": {
            "currentRung": 5,
            "rungs": {"5": {"status": "active"}},
            "activeRung": {
              "id": 5, "key": "sheltered", "name": "Sheltered", "stage": "Adult",
              "blurb": "Retirement accounts funded at a rate you set.",
              "progress": 0, "target": null, "gap": null, "indeterminate": true
            },
            "reopened": []
          }
        """
        let pet = try decoder.decode(PetState.self, from: petJSON(extra: extra))
        let active = try XCTUnwrap(pet.ladder?.activeRung)
        XCTAssertTrue(active.indeterminate)
        XCTAssertNil(active.target)
    }

    func testUnknownRungStatusThrows() {
        // The status enum is a strict mirror of the server's. If the server
        // grows a status, this client adds it in the same change.
        let extra = """
        ,
          "stage": 0,
          "derived": null,
          "declarations": null,
          "ladder": {"currentRung": 0, "rungs": {"0": {"status": "exploded"}}, "activeRung": null, "reopened": []}
        """
        XCTAssertThrowsError(try decoder.decode(PetState.self, from: petJSON(extra: extra)))
    }

    func testRungCatalogMatchesLadderEngine() {
        // Mirrors RUNGS in backend/src/goals/ladder.ts. If that table changes,
        // this test is the tripwire.
        XCTAssertEqual(RungCatalog.all.count, 8)
        XCTAssertEqual(RungCatalog.all.map(\.id), Array(0...7))
        XCTAssertEqual(
            RungCatalog.all.map(\.name),
            ["Sighted", "Floor", "Free money", "Bleeding stopped", "Buffer", "Sheltered", "Surplus", "Freedom"]
        )
        XCTAssertEqual(
            RungCatalog.all.map(\.stageName),
            ["Egg", "Hatchling", "Sprout", "Fledgling", "Adolescent", "Adult", "Elder", "Ascendant"]
        )
        XCTAssertEqual(RungCatalog.freedomRungId, 7)
    }
}
