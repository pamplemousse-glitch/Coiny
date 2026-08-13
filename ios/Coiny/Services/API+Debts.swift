import Foundation

// The debt surface's wire types and endpoints (`backend/src/api/debts.ts`,
// PRD R-7.13 to R-7.16). Appended as an extension file per the API client's
// convention. Field names mirror `serializeDebt` on the server exactly.

/// Merged debt account, one per real-world debt (R-7.13).
struct DebtAccount: Decodable, Equatable, Sendable, Identifiable {
    /// Closed set on the server; unknown values decode as `.other` so a new
    /// backend type never bricks the whole list.
    enum Kind: String, Decodable, Equatable, Sendable {
        case creditCard = "credit_card"
        case studentLoan = "student_loan"
        case mortgage
        case autoLoan = "auto_loan"
        case personalLoan = "personal_loan"
        case loan
        case other

        init(from decoder: Decoder) throws {
            let raw = try decoder.singleValueContainer().decode(String.self)
            self = Kind(rawValue: raw) ?? .other
        }
    }

    enum Status: String, Decodable, Equatable, Sendable {
        case open, delinquent, closed

        init(from decoder: Decoder) throws {
            let raw = try decoder.singleValueContainer().decode(String.self)
            self = Status(rawValue: raw) ?? .open
        }
    }

    let debtId: String
    let issuer: String
    let nickname: String?
    let type: Kind
    let sourceIds: [String]
    /// Distinct source systems feeding this record: "plaid", "spinwheel".
    let sources: [String]
    let balance: Double?
    /// Percent, 18 means 18%. Nil means no source reported one; the server
    /// then computes with a conservative assumption and sets `aprAssumed`.
    let apr: Double?
    /// True when the APR is an assumption, not a reported fact. The UI must
    /// present it as such (task rule; see DebtPresentation.aprLine).
    let aprAssumed: Bool
    let aprOverride: Double?
    let minPayment: Double?
    let creditLimit: Double?
    let dueDay: Int?
    let statementCloseDay: Int?
    let isPromotional: Bool
    let promoEndDate: String?
    let promoApr: Double?
    let status: Status
    /// The payment that clears the balance in 36 months, the R-7.16 primary
    /// number. The minimum is never the headline.
    let payment36: Double

    var id: String { debtId }
}

/// `GET /api/debts` and the merge/split responses. `highAprDebtBalances` is
/// present only on GET (nil on merge/split envelopes and when no source rows
/// exist yet), so it decodes as optional.
struct DebtsResponse: Decodable, Equatable, Sendable {
    let debts: [DebtAccount]
    let highAprDebtBalances: [Double]?
}

/// `POST /api/debts/sync`. Each source fails soft on the server.
struct DebtSyncResponse: Decodable, Equatable, Sendable {
    struct Synced: Decodable, Equatable, Sendable {
        let plaid: Bool
        let spinwheel: Bool
    }

    let synced: Synced
    let debts: [DebtAccount]
}

enum DebtStrategy: String, Codable, Equatable, Sendable, CaseIterable {
    case blend, avalanche, snowball
}

/// One strategy's outcome inside the comparison block.
struct DebtPlanSummary: Decodable, Equatable, Sendable {
    /// Nil when any debt never clears under this strategy.
    let months: Int?
    let debtFreeDate: String?
    let totalInterest: Double
    let order: [String]
}

/// Realized payoff chronology for one debt under the chosen strategy.
struct DebtPlanPerDebt: Decodable, Equatable, Sendable {
    let id: String
    let order: Int
    let payoffMonth: Int?
    let payoffDate: String?
    let interestPaid: Double
    let aprAssumed: Bool
}

/// The single most important thing the screen can say: at the current
/// minimum, interest outruns the payment and the debt never clears.
struct DebtPlanFinding: Decodable, Equatable, Sendable {
    let id: String
    let kind: String
    /// Interest accruing per month at the current balance.
    let monthlyInterest: Double
    /// The payment that clears the debt in 36 months (R-7.16).
    let clearingPayment36: Double

    var isNeverPaysOff: Bool { kind == "never_pays_off" }
}

/// `GET /api/debts/plan`.
struct DebtPlanResponse: Decodable, Equatable, Sendable {
    struct Comparison: Decodable, Equatable, Sendable {
        let blend: DebtPlanSummary
        let avalanche: DebtPlanSummary
        let snowball: DebtPlanSummary
        let minimumsOnly: DebtPlanSummary
    }

    let strategy: DebtStrategy
    let extraMonthly: Double
    let months: Int?
    let debtFreeDate: String?
    let totalInterest: Double
    /// Targeting order: where the extra payment concentrates first.
    let order: [String]
    let perDebt: [DebtPlanPerDebt]
    let findings: [DebtPlanFinding]
    let comparison: Comparison
    /// Positive means the chosen strategy costs that much MORE in interest.
    let costVsAvalanche: Double
    let costVsSnowball: Double
}

// MARK: - Patch bodies

// The server's PATCH schema treats an absent field as "leave it" and an
// explicit null as "clear it", so each editable field gets its own tiny body
// that always encodes its key, null included.

private struct DebtNicknameBody: Encodable {
    let nickname: String?

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(nickname, forKey: .nickname)
    }

    private enum CodingKeys: String, CodingKey { case nickname }
}

private struct DebtAprOverrideBody: Encodable {
    let aprOverride: Double?

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(aprOverride, forKey: .aprOverride)
    }

    private enum CodingKeys: String, CodingKey { case aprOverride }
}

private struct DebtStatementCloseBody: Encodable {
    let statementCloseDay: Int?

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(statementCloseDay, forKey: .statementCloseDay)
    }

    private enum CodingKeys: String, CodingKey { case statementCloseDay }
}

private struct DebtMergeBody: Encodable {
    let otherDebtId: String
}

private struct DebtPlanPutBody: Encodable {
    let strategy: DebtStrategy
    let extraMonthly: Double?

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(strategy, forKey: .strategy)
        try container.encode(extraMonthly, forKey: .extraMonthly)
    }

    private enum CodingKeys: String, CodingKey { case strategy, extraMonthly }
}

// MARK: - Endpoints

extension API {
    func getDebts() async throws -> DebtsResponse {
        try await get("/api/debts")
    }

    /// Re-pulls both providers server-side; either failing soft.
    func syncDebts() async throws -> DebtSyncResponse {
        try await post("/api/debts/sync")
    }

    func getDebtPlan(strategy: DebtStrategy?, extra: Double?) async throws -> DebtPlanResponse {
        var query: [String] = []
        if let strategy { query.append("strategy=\(strategy.rawValue)") }
        if let extra { query.append("extra=\(Self.queryNumber(extra))") }
        let suffix = query.isEmpty ? "" : "?" + query.joined(separator: "&")
        return try await get("/api/debts/plan" + suffix)
    }

    /// Persists the strategy selection and extra payment (R-7.14).
    func saveDebtPlan(strategy: DebtStrategy, extraMonthly: Double?) async throws {
        struct Res: Decodable { let ok: Bool }
        let _: Res = try await put("/api/debts/plan", body: DebtPlanPutBody(strategy: strategy, extraMonthly: extraMonthly))
    }

    /// Sets or clears (nil) the user-entered APR, replacing an assumed rate
    /// with the real one. Clearing restores the source-derived value.
    func setDebtAprOverride(id: String, apr: Double?) async throws -> DebtAccount {
        try await patch("/api/debts/\(id)", body: DebtAprOverrideBody(aprOverride: apr))
    }

    func setDebtNickname(id: String, nickname: String?) async throws -> DebtAccount {
        try await patch("/api/debts/\(id)", body: DebtNicknameBody(nickname: nickname))
    }

    /// The one manual input that earns its friction (R-7.17).
    func setDebtStatementCloseDay(id: String, day: Int?) async throws -> DebtAccount {
        try await patch("/api/debts/\(id)", body: DebtStatementCloseBody(statementCloseDay: day))
    }

    /// "These are the same account": records the user's verdict so it
    /// survives every re-sync, then returns the rebuilt list.
    func mergeDebts(id: String, otherDebtId: String) async throws -> DebtsResponse {
        try await post("/api/debts/\(id)/merge", body: DebtMergeBody(otherDebtId: otherDebtId))
    }

    /// The inverse: undo a wrong merge without disconnecting anything.
    func splitDebt(id: String) async throws -> DebtsResponse {
        try await post("/api/debts/\(id)/split")
    }

    /// Query-string form of a dollar amount: whole numbers without a trailing
    /// ".0", fractions kept as-is. Locale-independent by construction.
    private static func queryNumber(_ value: Double) -> String {
        value.truncatingRemainder(dividingBy: 1) == 0
            ? String(Int(value))
            : String(value)
    }
}
