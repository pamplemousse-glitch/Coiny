import XCTest
@testable import Coiny

final class APITests: XCTestCase {
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

    private func makeAPI(seedToken: String? = nil) -> API {
        if let t = seedToken { try? store.save(t) }
        return API(baseURL: baseURL, http: http, sessionStore: store)
    }

    // MARK: - Auth header

    func testRequestIncludesBearerHeaderWhenSignedIn() async throws {
        let api = makeAPI(seedToken: "tok-abc")
        http.enqueue(status: 200, json: """
            {
              "healthScore": 42,
              "mood": 50,
              "lastReactionAt": null,
              "reactionHistory": [],
              "goals": {"weeklyBudgetByCategory": {}, "savingsGoal": 1000, "paycheckMinAmount": 500, "largePurchaseThreshold": 200}
            }
            """)

        _ = try await api.getPetState()

        XCTAssertEqual(http.requests.count, 1)
        let req = http.requests[0]
        XCTAssertEqual(req.value(forHTTPHeaderField: "Authorization"), "Bearer tok-abc")
        XCTAssertEqual(req.value(forHTTPHeaderField: "Accept"), "application/json")
        XCTAssertEqual(req.httpMethod, "GET")
        XCTAssertEqual(req.url?.absoluteString, "https://test.coiny.local/api/pets")
    }

    func testRequestWithoutTokenThrowsUnauthenticatedBeforeNetwork() async {
        let api = makeAPI()  // no token

        do {
            _ = try await api.getPetState()
            XCTFail("Expected APIError.unauthenticated")
        } catch API.APIError.unauthenticated {
            // Critical: never reached the network.
            XCTAssertEqual(http.requests.count, 0)
        } catch {
            XCTFail("Expected APIError.unauthenticated, got \(error)")
        }
    }

    // MARK: - Sign in flow

    func testSignInWithApplePersistsToken() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: """
            {"token": "new-session-token", "user_id": "user-123"}
            """)

        let signedInBefore = await api.isSignedIn
        XCTAssertFalse(signedInBefore)

        try await api.signInWithApple(identityToken: "apple-id-token", userId: "apple-sub")

        let signedInAfter = await api.isSignedIn
        XCTAssertTrue(signedInAfter)
        XCTAssertEqual(store.load(), "new-session-token")

        // Body should match the Apple shape backend expects.
        let req = http.requests[0]
        XCTAssertEqual(req.httpMethod, "POST")
        XCTAssertEqual(req.url?.absoluteString, "https://test.coiny.local/api/auth/apple")
        XCTAssertEqual(req.value(forHTTPHeaderField: "Content-Type"), "application/json")
        // The Apple endpoint is intentionally unauthenticated — no Bearer header.
        XCTAssertNil(req.value(forHTTPHeaderField: "Authorization"))

        let bodyJSON = try JSONSerialization.jsonObject(with: req.httpBody ?? Data()) as? [String: Any]
        XCTAssertEqual(bodyJSON?["identity_token"] as? String, "apple-id-token")
        XCTAssertEqual(bodyJSON?["user_id"] as? String, "apple-sub")
    }

    // MARK: - 401 → sign-out

    func testHTTP401ClearsSessionAndThrows() async {
        let api = makeAPI(seedToken: "soon-to-be-invalidated")
        http.enqueue(.ok(status: 401, body: Data("{\"error\":\"Unauthorized\"}".utf8)))

        do {
            _ = try await api.getPetState()
            XCTFail("Expected HTTP 401 to throw")
        } catch let API.APIError.http(status, _) {
            XCTAssertEqual(status, 401)
        } catch {
            XCTFail("Expected APIError.http(401), got \(error)")
        }

        let signedIn = await api.isSignedIn
        XCTAssertFalse(signedIn, "401 must clear in-memory session")
        XCTAssertNil(store.load(), "401 must clear persistent session")
    }

    func testSignOutClearsTokenWithoutNetwork() async {
        let api = makeAPI(seedToken: "tok")
        await api.signOut()
        let signedIn = await api.isSignedIn
        XCTAssertFalse(signedIn)
        XCTAssertNil(store.load())
        XCTAssertEqual(http.requests.count, 0)
    }

    // MARK: - Error mapping

    func testTransportErrorIsWrapped() async {
        let api = makeAPI(seedToken: "tok")
        struct BoomError: Error {}
        http.enqueue(error: BoomError())

        do {
            _ = try await api.getPetState()
            XCTFail("Expected transport error")
        } catch let API.APIError.transport(underlying) {
            XCTAssertTrue(underlying is BoomError)
        } catch {
            XCTFail("Expected APIError.transport, got \(error)")
        }
    }

    func testNon2xxNon401IsHTTPErrorWithBody() async {
        let api = makeAPI(seedToken: "tok")
        http.enqueue(.ok(status: 500, body: Data("boom".utf8)))

        do {
            _ = try await api.getPetState()
            XCTFail("Expected http error")
        } catch let API.APIError.http(status, body) {
            XCTAssertEqual(status, 500)
            XCTAssertEqual(body, "boom")
        } catch {
            XCTFail("Expected APIError.http, got \(error)")
        }

        // 5xx must NOT clear the session — only 401 does.
        XCTAssertEqual(store.load(), "tok")
    }

    func testDecodeErrorMapsToDecodeCase() async {
        let api = makeAPI(seedToken: "tok")
        http.enqueue(status: 200, json: "this is not json")

        do {
            _ = try await api.getPetState()
            XCTFail("Expected decode error")
        } catch API.APIError.decode {
            // expected
        } catch {
            XCTFail("Expected APIError.decode, got \(error)")
        }
    }

    // MARK: - Date decoding

    func testDecodesISO8601WithFractionalSeconds() async throws {
        let api = makeAPI(seedToken: "tok")
        http.enqueue(status: 200, json: """
            {
              "healthScore": 10,
              "mood": 20,
              "lastReactionAt": "2026-05-21T17:30:00.123Z",
              "reactionHistory": [],
              "goals": {"weeklyBudgetByCategory": {}, "savingsGoal": 0, "paycheckMinAmount": 0, "largePurchaseThreshold": 0}
            }
            """)

        let pet = try await api.getPetState()
        XCTAssertNotNil(pet.lastReactionAt)
    }

    func testDecodesISO8601WithoutFractionalSeconds() async throws {
        let api = makeAPI(seedToken: "tok")
        http.enqueue(status: 200, json: """
            {
              "healthScore": 10,
              "mood": 20,
              "lastReactionAt": "2026-05-21T17:30:00Z",
              "reactionHistory": [],
              "goals": {"weeklyBudgetByCategory": {}, "savingsGoal": 0, "paycheckMinAmount": 0, "largePurchaseThreshold": 0}
            }
            """)

        let pet = try await api.getPetState()
        XCTAssertNotNil(pet.lastReactionAt)
    }

    // MARK: - Endpoint shape spot-checks

    func testCreateLinkTokenReturnsString() async throws {
        let api = makeAPI(seedToken: "tok")
        http.enqueue(status: 200, json: """
            {"link_token": "link-sandbox-abc", "expiration": "2026-05-21T18:00:00Z"}
            """)
        let token = try await api.createLinkToken()
        XCTAssertEqual(token, "link-sandbox-abc")
        XCTAssertEqual(http.requests[0].httpMethod, "POST")
        XCTAssertEqual(http.requests[0].url?.path, "/api/plaid/link-token")
    }

    func testRegisterDeviceTokenSendsIOSPlatform() async throws {
        let api = makeAPI(seedToken: "tok")
        http.enqueue(status: 200, json: "{}")
        _ = try await api.registerDeviceToken("deadbeef")

        let req = http.requests[0]
        XCTAssertEqual(req.url?.path, "/api/devices/push-token")
        let body = try JSONSerialization.jsonObject(with: req.httpBody ?? Data()) as? [String: Any]
        XCTAssertEqual(body?["token"] as? String, "deadbeef")
        XCTAssertEqual(body?["platform"] as? String, "ios")
        // Quiet hours (backend R-9.3) depend on this field: without it the
        // backend suppresses every push for the user rather than guess a zone.
        XCTAssertEqual(body?["timezone"] as? String, TimeZone.current.identifier)
    }

    // MARK: - Concurrent 401 handling

    func testConcurrent401OnlySignsOutOnce() async {
        let api = makeAPI(seedToken: "shared-token")
        // Both requests will get 401.
        http.enqueue(.ok(status: 401, body: Data()))
        http.enqueue(.ok(status: 401, body: Data()))

        await withTaskGroup(of: Void.self) { group in
            group.addTask {
                _ = try? await api.getPetState()
            }
            group.addTask {
                _ = try? await api.getPetState()
            }
        }

        // Must be signed out after concurrent 401s — not in a weird intermediate state.
        let signedIn = await api.isSignedIn
        XCTAssertFalse(signedIn)
        XCTAssertNil(store.load())
    }

    // MARK: - Sign-in edge cases

    /// The sign-in body carries the identity token, the Apple `sub` and
    /// nothing that identifies the person. Asserted on the encoded request
    /// rather than on the call signature, because the signature can be
    /// widened again without anyone noticing and the wire is what actually
    /// reaches the server. Guards audit 2.2.1: Coiny stored an email and a
    /// legal name it never once read.
    func testSignInSendsNoIdentityFields() async throws {
        let api = makeAPI()
        http.enqueue(status: 200, json: """
            {"token": "tok-no-identity", "user_id": "user-456"}
            """)

        try await api.signInWithApple(identityToken: "id-tok", userId: "sub-456")

        let request = try XCTUnwrap(http.requests.last)
        let body = try XCTUnwrap(request.httpBody)
        let json = try XCTUnwrap(try JSONSerialization.jsonObject(with: body) as? [String: Any])
        XCTAssertNil(json["email"])
        XCTAssertNil(json["display_name"])
        XCTAssertEqual(json["user_id"] as? String, "sub-456")

        let isSignedIn = await api.isSignedIn
        XCTAssertTrue(isSignedIn)
    }

    func testSignInFailureDoesNotPersistToken() async {
        let api = makeAPI()
        http.enqueue(.ok(status: 401, body: Data("{\"error\":\"invalid token\"}".utf8)))

        do {
            try await api.signInWithApple(identityToken: "bad-tok", userId: "sub")
            XCTFail("Expected sign-in to throw on 401")
        } catch {
            // expected
        }

        let isSignedIn = await api.isSignedIn
        XCTAssertFalse(isSignedIn)
        XCTAssertNil(store.load())
    }

    // PRD R-31.9. APIError is a LocalizedError, and 86 assignments across 25
    // ViewModels put `localizedDescription` straight into rendered error
    // state. Interpolating the response body here meant a raw server response
    // could be drawn on screen under a themed error line.
    func testHTTPErrorTextNeverCarriesTheResponseBody() {
        let body = #"{"error":"column merchant_name violates constraint","user":"a@b.com"}"#
        let error = API.APIError.http(status: 500, body: body)

        let rendered = error.localizedDescription

        XCTAssertFalse(
            rendered.contains("merchant_name"),
            "the response body reached rendered error text: \(rendered)"
        )
        XCTAssertFalse(rendered.contains("a@b.com"), "an email reached rendered error text: \(rendered)")
        // The status still survives, which is the part a user or a support
        // conversation can actually act on.
        XCTAssertTrue(rendered.contains("500"), "the status code was lost: \(rendered)")
    }
}
