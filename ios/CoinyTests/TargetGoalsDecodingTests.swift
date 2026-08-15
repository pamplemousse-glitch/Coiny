import XCTest
@testable import Coiny

/// Decoding tests for the goal and guardrail wire shapes (`GET /api/goals`,
/// `GET /api/goals/guardrails`), mirroring `backend/src/api/goals.ts`.
final class TargetGoalsDecodingTests: XCTestCase {

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

    private func goalJSON(pace: String) -> Data {
        """
        {
          "goals": [{
            "id": 7,
            "name": "Japan in March",
            "emoji": null,
            "kind": "save",
            "targetAmountUsd": 4000,
            "targetDate": "2027-03-14",
            "fundingAccountId": "acct-1",
            "countsExistingBalance": true,
            "contributionRule": {"type": "recurring", "amountUsd": null, "cadence": null, "dayOfMonth": null},
            "recurringAnnual": false,
            "createdAt": "2026-08-01T00:00:00.000Z",
            "achievedAt": null,
            "archivedAt": null,
            "pace": \(pace)
          }],
          "maxActive": 3
        }
        """.data(using: .utf8)!
    }

    func testDecodesGoalWithNullPace() throws {
        let response = try decoder.decode(GoalsListResponse.self, from: goalJSON(pace: "null"))
        XCTAssertEqual(response.maxActive, 3)
        XCTAssertEqual(response.goals.first?.name, "Japan in March")
        XCTAssertNil(response.goals.first?.pace)
    }

    func testDecodesFullPaceWithAddMonthlyGapAction() throws {
        let pace = """
        {
          "currentAmountUsd": 1240,
          "monthsRemaining": 7,
          "requiredRunRateUsd": 394,
          "actualRunRateUsd": 120,
          "contributionHistoryDays": 120,
          "pace": 0.3,
          "paceBand": "off_pace",
          "gapAction": {"type": "add_monthly", "amountUsd": 61},
          "computedAt": "2026-08-13T02:00:00.000Z"
        }
        """
        let goal = try decoder.decode(GoalsListResponse.self, from: goalJSON(pace: pace)).goals[0]
        XCTAssertEqual(goal.pace?.band, .offPace)
        XCTAssertEqual(goal.pace?.gapAction, .addMonthly(amountUsd: 61))
    }

    func testDecodesPushDateGapAction() throws {
        let pace = """
        {
          "currentAmountUsd": 1240,
          "monthsRemaining": 7,
          "requiredRunRateUsd": 394,
          "actualRunRateUsd": 300,
          "contributionHistoryDays": 120,
          "pace": 0.76,
          "paceBand": "behind",
          "gapAction": {"type": "push_date", "weeks": 7},
          "computedAt": "2026-08-13T02:00:00.000Z"
        }
        """
        let goal = try decoder.decode(GoalsListResponse.self, from: goalJSON(pace: pace)).goals[0]
        XCTAssertEqual(goal.pace?.band, .behind)
        XCTAssertEqual(goal.pace?.gapAction, .pushDate(weeks: 7))
    }

    func testNullPaceFieldsStayNilRatherThanZero() throws {
        // R-7.8: null means "we do not know". A decode that substituted zero
        // here would make every dateless goal render as off-pace.
        let pace = """
        {
          "currentAmountUsd": null,
          "monthsRemaining": null,
          "requiredRunRateUsd": null,
          "actualRunRateUsd": null,
          "contributionHistoryDays": null,
          "pace": null,
          "paceBand": null,
          "gapAction": null,
          "computedAt": "2026-08-13T02:00:00.000Z"
        }
        """
        let goal = try decoder.decode(GoalsListResponse.self, from: goalJSON(pace: pace)).goals[0]
        XCTAssertNil(goal.pace?.pace)
        XCTAssertNil(goal.pace?.band)
        XCTAssertNil(goal.pace?.currentAmountUsd)
        XCTAssertNil(goal.pace?.gapAction)
    }

    func testUnknownPaceBandDegradesToNilNotFailure() throws {
        let pace = """
        {
          "currentAmountUsd": 10,
          "monthsRemaining": null,
          "requiredRunRateUsd": null,
          "actualRunRateUsd": null,
          "contributionHistoryDays": null,
          "pace": null,
          "paceBand": "some_future_band",
          "gapAction": null,
          "computedAt": "2026-08-13T02:00:00.000Z"
        }
        """
        let goal = try decoder.decode(GoalsListResponse.self, from: goalJSON(pace: pace)).goals[0]
        XCTAssertNil(goal.pace?.band)
    }

    func testDecodesGuardrailsResponse() throws {
        let json = """
        {
          "guardrails": [{
            "key": "utilization_before_close",
            "label": "Utilization before close",
            "period": "month",
            "unavailableReason": "Needs per-card statement close days.",
            "streak": 0,
            "repairTokens": 2,
            "latest": null
          }, {
            "key": "contribution_streak",
            "label": "Contribution streak",
            "period": "week",
            "unavailableReason": null,
            "streak": 4,
            "repairTokens": 1,
            "latest": {
              "periodStart": "2026-08-03",
              "periodEnd": "2026-08-09",
              "outcome": "passed",
              "targetValue": 0,
              "actualValue": 250,
              "repairUsed": false
            }
          }]
        }
        """.data(using: .utf8)!
        let response = try decoder.decode(GuardrailsResponse.self, from: json)
        XCTAssertEqual(response.guardrails.count, 2)
        XCTAssertEqual(response.guardrails[0].unavailableReason, "Needs per-card statement close days.")
        XCTAssertEqual(response.guardrails[1].streak, 4)
        XCTAssertEqual(response.guardrails[1].latest?.outcome, "passed")
    }
}
