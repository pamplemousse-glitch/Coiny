import XCTest
@testable import Coiny

/// Verifies the path, method, body shape, and auth behavior of every API
/// endpoint not already covered in APITests.swift.
final class APIEndpointTests: XCTestCase {

    private var http: FakeHTTPClient!
    private var store: InMemorySessionStore!
    private let baseURL = URL(string: "https://test.coiny.local")!

    override func setUp() {
        super.setUp()
        http = FakeHTTPClient()
        store = InMemorySessionStore()
        continueAfterFailure = false
    }

    override func tearDown() {
        http = nil
        store = nil
        super.tearDown()
    }

    private func makeAPI(seedToken: String? = "test-tok") -> API {
        if let t = seedToken { try? store.save(t) }
        return API(baseURL: baseURL, http: http, sessionStore: store)
    }

    // MARK: - Pet

    func testGetPetStateDecodesReactionHistory() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: """
        {
          "healthScore": 75,
          "mood": 80,
          "lastReactionAt": "2026-05-21T12:00:00Z",
          "reactionHistory": [
            {
              "at": "2026-05-21T12:00:00Z",
              "eventType": "paycheck_received",
              "reaction": {
                "animation": "celebrate",
                "sound": "fanfare",
                "led": "rainbow",
                "duration": 3000,
                "reason": "paycheck_received (Direct Deposit $2400.00)"
              }
            }
          ],
          "goals": {
            "weeklyBudgetByCategory": {},
            "savingsGoal": 1000,
            "paycheckMinAmount": 500,
            "largePurchaseThreshold": 200
          }
        }
        """)

        let pet = try await api.getPetState()

        XCTAssertEqual(pet.reactionHistory.count, 1)
        XCTAssertEqual(pet.reactionHistory[0].eventType, "paycheck_received")
    }

    func testUpdateGoalsPutBody() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: """
        {
          "weeklyBudgetByCategory": {},
          "savingsGoal": 5000,
          "paycheckMinAmount": 500,
          "largePurchaseThreshold": 200
        }
        """)

        _ = try await api.updateGoals(GoalsPatch(savingsGoal: 5000))

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "PUT")
        XCTAssertEqual(req.url?.path, "/api/pets/goals")
        let body = try JSONSerialization.jsonObject(with: req.httpBody ?? Data()) as? [String: Any]
        // GoalsPatch uses default JSONEncoder → camelCase field names.
        XCTAssertEqual(body?["savingsGoal"] as? Int, 5000)
    }

    // MARK: - Plaid

    func testExchangePublicTokenPostsBody() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: "{}")

        _ = try await api.exchangePublicToken("tok-sandbox-abc")

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "POST")
        XCTAssertEqual(req.url?.path, "/api/plaid/exchange-token")
        let body = try JSONSerialization.jsonObject(with: req.httpBody ?? Data()) as? [String: Any]
        XCTAssertEqual(body?["public_token"] as? String, "tok-sandbox-abc")
    }

    func testUnlinkBankDeletesCorrectPath() async throws {
        let api = makeAPI()
        http.enqueue(.ok(status: 204, body: Data()))

        try await api.unlinkBank()

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "DELETE")
        XCTAssertEqual(req.url?.path, "/api/plaid/item")
    }

    // MARK: - Coinbase

    func testGetCoinbaseStatusPath() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: "{\"connected\": false, \"mode\": null}")

        _ = try await api.getCoinbaseStatus()

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "GET")
        XCTAssertEqual(req.url?.path, "/api/coinbase/status")
    }

    func testConnectCoinbaseDevKeyPath() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: "{}")

        _ = try await api.connectCoinbaseDevKey()

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "POST")
        XCTAssertEqual(req.url?.path, "/api/coinbase/connect/dev-key")
    }

    func testDisconnectCoinbasePath() async throws {
        let api = makeAPI()
        http.enqueue(.ok(status: 204, body: Data()))

        try await api.disconnectCoinbase()

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "DELETE")
        XCTAssertEqual(req.url?.path, "/api/coinbase/connect")
    }

    func testSyncCoinbasePath() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: "{\"reacted\": 3}")

        let result = try await api.syncCoinbase()

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "POST")
        XCTAssertEqual(req.url?.path, "/api/coinbase/sync")
        XCTAssertEqual(result.reacted, 3)
    }

    // MARK: - Zerion

    func testGetZerionWalletsPath() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: "[]")

        _ = try await api.getZerionWallets()

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "GET")
        XCTAssertEqual(req.url?.path, "/api/zerion/wallets")
    }

    func testAddZerionWalletBody() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: """
        {
          "id": "w1",
          "userId": "u1",
          "address": "0xABC123",
          "label": "Hot Wallet",
          "createdAt": "2026-05-21T12:00:00Z"
        }
        """)

        _ = try await api.addZerionWallet(address: "0xABC123", label: "Hot Wallet")

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "POST")
        XCTAssertEqual(req.url?.path, "/api/zerion/wallets")
        let body = try JSONSerialization.jsonObject(with: req.httpBody ?? Data()) as? [String: Any]
        XCTAssertEqual(body?["address"] as? String, "0xABC123")
        XCTAssertEqual(body?["label"] as? String, "Hot Wallet")
    }

    func testRemoveZerionWalletPath() async throws {
        let api = makeAPI()
        http.enqueue(.ok(status: 204, body: Data()))

        try await api.removeZerionWallet(address: "0xABC")

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "DELETE")
        XCTAssertEqual(req.url?.path, "/api/zerion/wallets/0xABC")
    }

    func testSyncZerionPath() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: "{\"reacted\": 1}")

        _ = try await api.syncZerion()

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "POST")
        XCTAssertEqual(req.url?.path, "/api/zerion/sync")
    }

    // MARK: - Spinwheel

    func testGetSpinwheelStatusPath() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: "{\"connected\": false}")

        _ = try await api.getSpinwheelStatus()

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "GET")
        XCTAssertEqual(req.url?.path, "/api/spinwheel/status")
    }

    func testSendSpinwheelOtpBody() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: "{}")

        _ = try await api.sendSpinwheelOtp(phone: "+15551234567", dateOfBirth: "1990-01-15")

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "POST")
        XCTAssertEqual(req.url?.path, "/api/spinwheel/connect/sms")
        let body = try JSONSerialization.jsonObject(with: req.httpBody ?? Data()) as? [String: Any]
        XCTAssertEqual(body?["phone"] as? String, "+15551234567")
        // sendSpinwheelOtp encodes the body struct with no CodingKeys override → camelCase.
        XCTAssertEqual(body?["dateOfBirth"] as? String, "1990-01-15")
    }

    func testVerifySpinwheelOtpBody() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: "{}")

        _ = try await api.verifySpinwheelOtp(phone: "+15550001111", code: "654321")

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "POST")
        XCTAssertEqual(req.url?.path, "/api/spinwheel/connect/sms/verify")
        let body = try JSONSerialization.jsonObject(with: req.httpBody ?? Data()) as? [String: Any]
        XCTAssertEqual(body?["phone"] as? String, "+15550001111")
        XCTAssertEqual(body?["code"] as? String, "654321")
    }

    func testGetSpinwheelDebtsPath() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: "{\"debts\": []}")

        _ = try await api.getSpinwheelDebts()

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "GET")
        XCTAssertEqual(req.url?.path, "/api/spinwheel/debts")
    }

    func testDisconnectSpinwheelPath() async throws {
        let api = makeAPI()
        http.enqueue(.ok(status: 204, body: Data()))

        try await api.disconnectSpinwheel()

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "DELETE")
        XCTAssertEqual(req.url?.path, "/api/spinwheel/connect")
    }

    // MARK: - Net Worth

    func testGetNetWorthPath() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: """
        {
          "total": 0, "bank": 0, "investments": 0, "crypto": 0, "defi": 0, "debts": 0,
          "accounts": {
            "bank": [], "investments": [], "crypto": [],
            "defi": {"totalUSD": 0},
            "debts": []
          },
          "connections": {"coinbase": false, "zerion": false, "spinwheel": false}
        }
        """)

        _ = try await api.getNetWorth()

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "GET")
        XCTAssertEqual(req.url?.path, "/api/net-worth")
    }

    // MARK: - Account

    func testDeleteAccountPath() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: "{}")

        _ = try await api.deleteAccount()

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "DELETE")
        XCTAssertEqual(req.url?.path, "/api/account")
    }

    func testUpdateDisplayNamePatchBody() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: "{\"ok\": true}")

        try await api.updateDisplayName("Antoine")

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "PATCH")
        XCTAssertEqual(req.url?.path, "/api/account")
        let body = try JSONSerialization.jsonObject(with: req.httpBody ?? Data()) as? [String: Any]
        // The Body struct explicitly declares `let display_name: String`, so it serializes
        // with the underscore name.
        XCTAssertEqual(body?["display_name"] as? String, "Antoine")
    }

    // MARK: - Health (no auth)

    func testHealthEndpointNoAuth() async throws {
        let api = makeAPI(seedToken: "should-not-appear")
        http.enqueue(status: 200, json: "{\"ok\": true}")

        _ = try await api.health()

        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "GET")
        XCTAssertEqual(req.url?.path, "/health")
        // health() passes requiresAuth: false — no Authorization header.
        XCTAssertNil(req.value(forHTTPHeaderField: "Authorization"))
    }

    // MARK: - 5xx does not clear session

    func test5xxDoesNotClearSession() async {
        let api = makeAPI(seedToken: "tok-keep-me")
        http.enqueue(.ok(status: 500, body: Data("server error".utf8)))

        _ = try? await api.getCoinbaseStatus()

        // 5xx must NOT sign the user out.
        let signedIn = await api.isSignedIn
        XCTAssertTrue(signedIn)
        XCTAssertEqual(store.load(), "tok-keep-me")
    }
}
