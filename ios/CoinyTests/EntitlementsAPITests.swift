import XCTest
@testable import Coiny

final class EntitlementsAPITests: XCTestCase {
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
        try? store.save("tok-entitlements")
        return API(baseURL: baseURL, http: http, sessionStore: store)
    }

    func testGetEntitlementsDecodesFreeTier() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: """
            {
              "tier": "free",
              "status": "none",
              "entitledUntil": null,
              "autoRenew": false,
              "source": null,
              "appAccountToken": "0e2f5a44-98d1-4a10-9f6a-2f4c8f0f0a11",
              "limits": {"liveConnections": 2, "activeGoals": 1, "guardrails": 2, "historyDays": 30}
            }
            """)

        let res = try await api.getEntitlements()
        XCTAssertEqual(res.tier, "free")
        XCTAssertFalse(res.isPaid)
        XCTAssertEqual(res.limits.liveConnections, 2)
        XCTAssertEqual(res.limits.historyDays, 30)
    }

    func testGetEntitlementsDecodesPaidTierWithExpiry() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: """
            {
              "tier": "individual",
              "status": "active",
              "entitledUntil": "2027-08-13T12:00:00.000Z",
              "autoRenew": true,
              "source": "own",
              "appAccountToken": "0e2f5a44-98d1-4a10-9f6a-2f4c8f0f0a11",
              "limits": {"liveConnections": 12, "activeGoals": 3, "guardrails": null, "historyDays": 730}
            }
            """)

        let res = try await api.getEntitlements()
        XCTAssertTrue(res.isPaid)
        XCTAssertEqual(res.status, "active")
        XCTAssertNotNil(res.entitledUntil)
        XCTAssertNil(res.limits.guardrails)
    }

    func testReportTransactionPostsJwsWithAuth() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: """
            {
              "tier": "household",
              "status": "active",
              "entitledUntil": null,
              "autoRenew": true,
              "source": "own",
              "appAccountToken": "0e2f5a44-98d1-4a10-9f6a-2f4c8f0f0a11",
              "limits": {"liveConnections": null, "activeGoals": 3, "guardrails": null, "historyDays": null}
            }
            """)

        let res = try await api.reportAppStoreTransaction(jws: "header.payload.signature")
        XCTAssertEqual(res.tier, "household")

        let request = try XCTUnwrap(http.requests.first)
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.url?.path, "/api/entitlements/transaction")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer tok-entitlements")
        let body = try XCTUnwrap(request.httpBody)
        let decoded = try XCTUnwrap(try JSONSerialization.jsonObject(with: body) as? [String: String])
        XCTAssertEqual(decoded["jws"], "header.payload.signature")
    }

    func testGetEntitlementsSurfacesHttpErrors() async {
        let api = makeAPI()
        http.enqueue(status: 500, json: #"{"error": "Internal Server Error"}"#)

        do {
            _ = try await api.getEntitlements()
            XCTFail("expected an error")
        } catch {
            // Expected: server errors must not silently decode into a tier.
        }
    }
}
