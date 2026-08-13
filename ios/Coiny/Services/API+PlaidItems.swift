import Foundation

// MARK: - Plaid item health DTOs (GET /api/plaid/items, PRD R-8.5)

enum PlaidItemStatus: String, Decodable, Equatable, Sendable {
    case healthy
    case reauthRequired = "reauth_required"
    case expiring
    case revoked
    case error
    /// Additive server statuses decode here rather than failing the list.
    case unknown

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = PlaidItemStatus(rawValue: raw) ?? .unknown
    }
}

struct PlaidItemHealth: Decodable, Identifiable, Equatable, Sendable {
    let itemId: String
    /// The bank's name from Plaid, captured server-side at link time, so the
    /// repair prompt can say "Chase needs you to sign in again" (S-17). Nil for
    /// items linked without an institution connection and for servers predating
    /// the field; callers fall back to the generic string. Displayable, but
    /// never logged and never attached to a telemetry event.
    let institutionName: String?
    let status: PlaidItemStatus
    let statusChangedAt: Date?
    let lastErrorCode: String?
    let newAccountsAvailable: Bool
    let disabled: Bool
    /// Server-computed convenience: anything not healthy is offered repair.
    let repairable: Bool

    var id: String { itemId }

    enum CodingKeys: String, CodingKey {
        case itemId = "item_id"
        case institutionName = "institution_name"
        case status
        case statusChangedAt = "status_changed_at"
        case lastErrorCode = "last_error_code"
        case newAccountsAvailable = "new_accounts_available"
        case disabled
        case repairable
    }
}

// MARK: - Plaid item health + repair (PRD R-8.5 to R-8.7)

extension API {
    /// Connection health per item, so the UI can say which bank connection is
    /// broken and offer repair instead of a stale number.
    func getPlaidItems() async throws -> [PlaidItemHealth] {
        struct Res: Decodable { let items: [PlaidItemHealth] }
        let r: Res = try await get("/api/plaid/items")
        return r.items
    }

    /// Link UPDATE MODE token for an existing item (R-8.6). The user fixes
    /// their credentials in Link; the existing access token and history
    /// survive, and no public-token exchange happens afterwards.
    func createUpdateLinkToken(itemId: String) async throws -> String {
        struct Body: Encodable { let item_id: String }
        struct Res: Decodable { let link_token: String }
        let r: Res = try await post("/api/plaid/update-link-token", body: Body(item_id: itemId))
        return r.link_token
    }

    /// Completion callback after a successful update-mode Link session; flips
    /// the item back to healthy immediately.
    @discardableResult
    func markItemRepaired(itemId: String) async throws -> EmptyResponse {
        struct Body: Encodable { let item_id: String }
        return try await post("/api/plaid/item-repaired", body: Body(item_id: itemId))
    }
}
