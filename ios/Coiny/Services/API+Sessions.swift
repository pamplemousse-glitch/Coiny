import Foundation

// Session lifecycle plus two HTTP verbs (`backend/src/api/account.ts`).
// Lives beside API.swift rather than inside it: the core actor sits at
// SwiftLint's type_body_length limit, so anything that does not need the
// actor's private state goes here. patch and delete are thin wrappers over
// `request` and touch nothing private, so they move cleanly.

extension API {
    /// Ends every session except this device's, and returns how many were ended.
    ///
    /// The answer to losing a phone: sign in on a replacement, then run this.
    /// Deliberately does not sign this device out, so the person running it
    /// keeps the device they are holding.
    func revokeOtherSessions() async throws -> Int {
        struct Response: Decodable { let revoked: Int }
        let res: Response = try await post("/api/account/sessions/revoke-all")
        return res.revoked
    }

    func patch<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        try await request(method: "PATCH", path: path, body: body, requiresAuth: true)
    }

    func delete<T: Decodable>(_ path: String) async throws -> T {
        try await request(method: "DELETE", path: path, body: Optional<Empty>.none, requiresAuth: true)
    }
}
