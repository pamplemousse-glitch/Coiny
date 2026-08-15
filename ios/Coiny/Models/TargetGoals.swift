import Foundation

// Client mirror of the target-goal and guardrail read shapes.
//
// Source of truth: `backend/src/api/goals.ts` (routes), `backend/src/store/
// target-goals.ts` (`TargetGoal`, `StoredGoalPace`) and `backend/src/goals/
// evaluation.ts` (`GuardrailView`). Nothing here may assume fields the server
// does not send.
//
// The governing rule, restated from R-7.8 because it is the failure mode the
// spec expects: a null pace means "too early to say" and must NEVER render as
// zero or as "Off pace". `paceBand` and `pace` are optionals for that reason;
// no default is ever substituted.

/// `backend/src/store/target-goals.ts:GoalKind`.
enum GoalKind: String, Codable, Hashable, Sendable, CaseIterable {
    case save
    case payoff
    case purchase
}

/// `backend/src/goals/pace.ts:PaceBand`, kept as the raw wire string plus a
/// typed accessor so an unrecognised future band degrades to "no band" rather
/// than a decode failure for the whole goals list.
enum PaceBand: String, Sendable {
    case ahead
    case onPace = "on_pace"
    case behind
    case offPace = "off_pace"
}

/// `backend/src/goals/pace.ts:GapAction`. The single smallest change that
/// returns a goal to on-pace, as one number (R-7.8).
enum GoalGapAction: Hashable, Sendable {
    case addMonthly(amountUsd: Double)
    case pushDate(weeks: Int)
}

extension GoalGapAction: Codable {
    private enum CodingKeys: String, CodingKey {
        case type
        case amountUsd
        case weeks
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)
        switch type {
        case "add_monthly":
            self = .addMonthly(amountUsd: try container.decode(Double.self, forKey: .amountUsd))
        case "push_date":
            self = .pushDate(weeks: try container.decode(Int.self, forKey: .weeks))
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type, in: container,
                debugDescription: "Unknown gap action type: \(type)"
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case let .addMonthly(amountUsd):
            try container.encode("add_monthly", forKey: .type)
            try container.encode(amountUsd, forKey: .amountUsd)
        case let .pushDate(weeks):
            try container.encode("push_date", forKey: .type)
            try container.encode(weeks, forKey: .weeks)
        }
    }
}

/// `backend/src/store/target-goals.ts:StoredGoalPace`. Every optional is a
/// deliberate "we do not know": no target date, under 30 days of contribution
/// history, or an unreadable balance (R-7.8).
struct GoalPace: Codable, Hashable, Sendable {
    let currentAmountUsd: Double?
    let monthsRemaining: Double?
    let requiredRunRateUsd: Double?
    let actualRunRateUsd: Double?
    let contributionHistoryDays: Int?
    let pace: Double?
    /// Raw wire band; use `band` for the typed value.
    let paceBand: String?
    let gapAction: GoalGapAction?
    let computedAt: Date

    var band: PaceBand? {
        paceBand.flatMap(PaceBand.init(rawValue:))
    }

    init(
        currentAmountUsd: Double? = nil,
        monthsRemaining: Double? = nil,
        requiredRunRateUsd: Double? = nil,
        actualRunRateUsd: Double? = nil,
        contributionHistoryDays: Int? = nil,
        pace: Double? = nil,
        paceBand: String? = nil,
        gapAction: GoalGapAction? = nil,
        computedAt: Date = Date(timeIntervalSince1970: 0)
    ) {
        self.currentAmountUsd = currentAmountUsd
        self.monthsRemaining = monthsRemaining
        self.requiredRunRateUsd = requiredRunRateUsd
        self.actualRunRateUsd = actualRunRateUsd
        self.contributionHistoryDays = contributionHistoryDays
        self.pace = pace
        self.paceBand = paceBand
        self.gapAction = gapAction
        self.computedAt = computedAt
    }
}

/// `backend/src/store/target-goals.ts:ContributionRule` (R-7.9: the default
/// rule is `recurring`; guaranteed rules outperform contingent ones).
struct GoalContributionRule: Codable, Hashable, Sendable {
    let type: String
    let amountUsd: Double?
    let cadence: String?
    let dayOfMonth: Int?

    static let recurringDefault = GoalContributionRule(
        type: "recurring", amountUsd: nil, cadence: nil, dayOfMonth: nil
    )
}

/// One goal as `GET /api/goals` returns it: the stored row plus its
/// nightly-computed pace, which is null until the pipeline has run.
struct TargetGoal: Codable, Hashable, Sendable, Identifiable {
    let id: Int
    let name: String
    let emoji: String?
    let kind: GoalKind
    let targetAmountUsd: Double
    /// YYYY-MM-DD, or nil: a dateless goal is legitimate and renders
    /// contribution history only (R-7.8).
    let targetDate: String?
    let fundingAccountId: String?
    let countsExistingBalance: Bool
    let contributionRule: GoalContributionRule?
    let recurringAnnual: Bool
    let createdAt: Date
    let achievedAt: Date?
    let archivedAt: Date?
    let pace: GoalPace?
}

/// `GET /api/goals` envelope. `maxActive` is the server-enforced cap (R-7.9).
struct GoalsListResponse: Codable, Hashable, Sendable {
    let goals: [TargetGoal]
    let maxActive: Int
}

// MARK: - Guardrails

/// `backend/src/goals/evaluation.ts:GuardrailView.latest`: the most recent
/// evaluated period for one guardrail.
struct GuardrailLatestPeriod: Codable, Hashable, Sendable {
    let periodStart: String
    let periodEnd: String
    /// 'passed' | 'missed' | 'indeterminate' | 'not_applicable' (plus legacy
    /// 'pending'); kept raw so an unknown outcome renders as unknown, never as
    /// a failure.
    let outcome: String
    let targetValue: Double?
    let actualValue: Double?
    let repairUsed: Bool
}

/// `backend/src/goals/evaluation.ts:GuardrailView`. Streaks are weekly or
/// monthly, never daily (R-7.12), and `unavailableReason` names the missing
/// data source for the two guardrails with none (never a failure).
struct GuardrailStatus: Codable, Hashable, Sendable, Identifiable {
    let key: String
    let label: String
    /// 'week' | 'month'.
    let period: String
    let unavailableReason: String?
    let streak: Int
    let repairTokens: Int
    let latest: GuardrailLatestPeriod?

    var id: String { key }
}

/// `GET /api/goals/guardrails` envelope.
struct GuardrailsResponse: Codable, Hashable, Sendable {
    let guardrails: [GuardrailStatus]
}

// MARK: - Rung skips (R-7.4)

/// The two opt-out statuses `POST .../skip` accepts. There is no third option:
/// a rung can never be failed.
enum RungSkipStatus: String, Codable, Sendable {
    case skipped
    case notApplicable = "not_applicable"
}

/// The closed reason vocabulary the server stores and the reason picker offers.
/// Tokens on the wire; display copy lives in `JourneyPresentation`.
enum RungSkipReason: String, Codable, Sendable, CaseIterable {
    case handledElsewhere = "handled_elsewhere"
    case notRelevant = "not_relevant"
    case notNow = "not_now"
}
