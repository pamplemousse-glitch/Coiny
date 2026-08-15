import Foundation

/// The server's record of what this user agreed to and whether they still want
/// usage sharing on. Read after a reinstall so the Settings toggle reflects the
/// account rather than a fresh `UserDefaults`.
struct ConsentState: Decodable, Equatable, Sendable {
    let legalAcceptedAt: Date?
    let legalVersion: String?
    let analyticsOptOut: Bool

    enum CodingKeys: String, CodingKey {
        case legalAcceptedAt = "legal_accepted_at"
        case legalVersion = "legal_version"
        case analyticsOptOut = "analytics_opt_out"
    }
}

extension API {
    func getConsent() async throws -> ConsentState {
        try await get("/api/consent")
    }

    /// Records that the user was shown, and acknowledged, the Terms and the
    /// privacy notice. Called immediately after a successful sign-in: Reg P
    /// 1016.9(b)(1)(iii) delivers the notice by making the acknowledgement a
    /// necessary step to obtaining the service, so it has to be recorded where
    /// it cannot be skipped, not on a screen the user might never open.
    func acknowledgeLegal(version: String) async throws {
        struct Body: Encodable { let policy_version: String }
        let _: EmptyResponse = try await post("/api/consent/acknowledge", body: Body(policy_version: version))
    }

    /// The server half of the "Share usage data" toggle. The client queue
    /// stopping is not enough on its own: the backend emits signup, ladder,
    /// guardrail, item and push events with no client involved.
    func setAnalyticsOptOut(_ optOut: Bool) async throws {
        struct Body: Encodable { let analytics_opt_out: Bool }
        let _: EmptyResponse = try await patch("/api/consent", body: Body(analytics_opt_out: optOut))
    }
}
