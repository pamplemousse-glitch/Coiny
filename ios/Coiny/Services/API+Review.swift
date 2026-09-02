import Foundation

extension API {
    /// Seeds the CALLING account with App Review demo data (R-15.7, decision B9).
    ///
    /// Not a debug affordance despite living beside them: this one ships in the
    /// Release binary on purpose, because App Review reviews the release build
    /// and `isDebugBuild()` is correctly false there. What keeps it safe is the
    /// backend, not the build configuration: the route requires a session,
    /// writes only to that session's user, and returns 404 unless a review code
    /// is configured as a Fly secret.
    func seedReviewDemo(code: String) async throws {
        struct Body: Encodable { let code: String }
        struct Response: Decodable { let ok: Bool }
        let _: Response = try await request(
            method: "POST",
            path: "/api/review/demo-seed",
            body: Body(code: code),
            requiresAuth: true
        )
    }
}
