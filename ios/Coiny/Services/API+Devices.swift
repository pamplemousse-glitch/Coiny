import Foundation

// MARK: - Devices

extension API {
    @discardableResult
    func registerDeviceToken(_ hexToken: String) async throws -> EmptyResponse {
        // The IANA timezone lets the backend enforce quiet hours in the
        // user's own zone (docs/prd.md R-9.3); without it, pushes for this
        // user are suppressed entirely rather than sent on a guessed zone.
        struct Body: Encodable {
            let token: String
            let platform: String
            let timezone: String
            let apsEnvironment: String
        }
        // Which APNs environment issued this token. It follows the
        // `aps-environment` entitlement, which project.yml selects by build
        // configuration: Coiny.entitlements (development) for Debug,
        // CoinyRelease.entitlements (production) for Release and therefore for
        // every TestFlight and App Store build.
        //
        // The server cannot infer this any more. Both configurations now point
        // at the same staging host during the internal test, so one backend
        // holds sandbox and production tokens at once and must send each to the
        // host that will accept it. Getting it wrong is a 400 BadDeviceToken
        // that nothing surfaces to the user or the server.
        #if DEBUG
        let apsEnvironment = "development"
        #else
        let apsEnvironment = "production"
        #endif
        return try await post(
            "/api/devices/push-token",
            body: Body(
                token: hexToken,
                platform: "ios",
                timezone: TimeZone.current.identifier,
                apsEnvironment: apsEnvironment
            )
        )
    }
}
