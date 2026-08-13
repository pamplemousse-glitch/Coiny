import XCTest
@testable import Coiny

/// Decoding tests for the adopted `GET /api/net-worth` shape (R-8.4) and the
/// repair endpoints, through the real API decoder (fractional-second ISO
/// dates, the wire the backend actually speaks).
final class NetWorthAPIDecodingTests: XCTestCase {
    private var http: FakeHTTPClient!
    private var store: InMemorySessionStore!
    private let baseURL = URL(string: "https://test.coiny.local")!

    override func setUp() {
        super.setUp()
        http = FakeHTTPClient()
        store = InMemorySessionStore()
    }

    override func tearDown() {
        http = nil
        store = nil
        super.tearDown()
    }

    private func makeAPI() -> API {
        try? store.save("tok")
        return API(baseURL: baseURL, http: http, sessionStore: store)
    }

    private static let netWorthJSON = """
        {
          "total": 1500,
          "bank": 1000, "investments": 0, "crypto": 500, "defi": 0, "chainWallets": 0,
          "hyperliquid": 0, "polymarket": 0, "realEstate": 0, "vehicles": 0, "metals": 0,
          "sneakers": 0, "nft": 0, "manual": 0, "pokemonCards": 0, "kalshi": 0, "kraken": 0,
          "alpaca": 0, "ynab": 0, "vinyl": 0, "truelayer": 0, "energy": 0, "farmland": 0,
          "tradingCards": 0, "coins": 0, "debts": 0, "liquidCashMonths": null,
          "accounts": {
            "bank": [{"accountId": "a1", "name": "Checking", "type": "depository", "balance": 1000,
                      "minPayment": null, "nextDueDate": null, "isOverdue": null, "primaryApr": null,
                      "asOf": "2026-08-13T04:00:00.000Z"}],
            "investments": [], "crypto": [], "defi": {"totalUSD": 0}, "debts": []
          },
          "connections": {"coinbase": true, "discogs": false, "kalshi": false, "kraken": false,
                          "alpaca": false, "spinwheel": false, "truelayer": false, "ynab": false,
                          "zerion": false},
          "classes": {
            "bank": {"value": 1000, "asOf": "2026-08-13T04:00:00.000Z", "status": "ok"},
            "crypto": {"value": 500, "asOf": "2026-08-12T00:00:00.000Z", "status": "stale"},
            "defi": {"value": null, "asOf": null, "status": "error"},
            "kraken": {"value": 20, "asOf": null, "status": "some_future_status"}
          },
          "excluded": {"count": 1, "classes": ["defi"]},
          "generatedAt": "2026-08-13T05:00:00.000Z"
        }
        """

    func testDecodesClassesExcludedAndGeneratedAt() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: Self.netWorthJSON)

        let res = try await api.getNetWorth()

        XCTAssertEqual(res.classes["bank"]?.status, .ok)
        XCTAssertEqual(res.classes["bank"]?.value, 1000)
        XCTAssertNotNil(res.classes["bank"]?.asOf)
        XCTAssertEqual(res.classes["crypto"]?.status, .stale)
        XCTAssertEqual(res.classes["defi"]?.status, .error)
        XCTAssertNil(res.classes["defi"]?.value, "a failure carries no value, never zero")
        XCTAssertEqual(res.excluded.count, 1)
        XCTAssertEqual(res.excluded.classes, ["defi"])
        XCTAssertEqual(res.generatedAt.timeIntervalSince1970, 1_786_597_200, accuracy: 1)
        XCTAssertNil(res.bankRefresh, "the GET carries no bankRefresh")
        XCTAssertEqual(res.accounts.bank.first?.asOf?.timeIntervalSince1970 ?? 0, 1_786_593_600, accuracy: 1)
    }

    func testUnknownClassStatusDecodesAsStaleNotCrash() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: Self.netWorthJSON)

        let res = try await api.getNetWorth()

        XCTAssertEqual(res.classes["kraken"]?.status, .stale, "additive statuses must not fail the decode")
    }

    func testRefreshPostsAndDecodesBankRefresh() async throws {
        let api = makeAPI()
        let refreshJSON = Self.netWorthJSON.replacingOccurrences(
            of: "\"generatedAt\": \"2026-08-13T05:00:00.000Z\"",
            with: "\"generatedAt\": \"2026-08-13T05:00:00.000Z\", \"bankRefresh\": \"capped\""
        )
        http.enqueue(status: 200, json: refreshJSON)

        let res = try await api.refreshNetWorth()

        XCTAssertEqual(http.requests.first?.httpMethod, "POST")
        XCTAssertEqual(http.requests.first?.url?.path, "/api/net-worth/refresh")
        XCTAssertEqual(res.bankRefresh, "capped")
    }

    // MARK: - Plaid item health + repair endpoints

    func testGetPlaidItemsDecodesHealth() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: """
            {"items": [
              {"item_id": "it-1", "status": "reauth_required",
               "status_changed_at": "2026-08-12T10:00:00.000Z", "last_error_code": "ITEM_LOGIN_REQUIRED",
               "new_accounts_available": false, "disabled": false, "repairable": true,
               "created_at": "2026-08-01T00:00:00.000Z"},
              {"item_id": "it-2", "status": "healthy", "status_changed_at": null,
               "last_error_code": null, "new_accounts_available": false, "disabled": false,
               "repairable": false, "created_at": "2026-08-01T00:00:00.000Z"}
            ]}
            """)

        let items = try await api.getPlaidItems()

        XCTAssertEqual(items.count, 2)
        XCTAssertEqual(items[0].status, .reauthRequired)
        XCTAssertTrue(items[0].repairable)
        XCTAssertEqual(items[0].lastErrorCode, "ITEM_LOGIN_REQUIRED")
        XCTAssertEqual(items[1].status, .healthy)
        XCTAssertFalse(items[1].repairable)
    }

    func testUpdateLinkTokenSendsItemId() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: """
            {"link_token": "link-update-xyz", "expiration": "2026-08-13T06:00:00.000Z", "item_id": "it-1"}
            """)

        let token = try await api.createUpdateLinkToken(itemId: "it-1")

        XCTAssertEqual(token, "link-update-xyz")
        let req = try XCTUnwrap(http.requests.first)
        XCTAssertEqual(req.httpMethod, "POST")
        XCTAssertEqual(req.url?.path, "/api/plaid/update-link-token")
        let body = try XCTUnwrap(req.httpBody)
        let parsed = try XCTUnwrap(JSONSerialization.jsonObject(with: body) as? [String: String])
        XCTAssertEqual(parsed, ["item_id": "it-1"])
    }

    func testMarkItemRepairedPosts() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: #"{"ok": true, "item_id": "it-1", "status": "healthy"}"#)

        _ = try await api.markItemRepaired(itemId: "it-1")

        let req = try XCTUnwrap(http.requests.first)
        XCTAssertEqual(req.url?.path, "/api/plaid/item-repaired")
        XCTAssertEqual(req.httpMethod, "POST")
    }
}
