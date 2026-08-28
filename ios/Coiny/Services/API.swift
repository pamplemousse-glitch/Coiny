import Foundation

actor API {
    static let shared: API = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.waitsForConnectivity = true
        let session = URLSession(configuration: config)
        return API(
            baseURL: Endpoint.baseURL,
            http: session,
            sessionStore: KeychainSessionStore()
        )
    }()

    enum Endpoint {
        /// Which backend this build talks to.
        ///
        /// Read from `COINY_API_BASE_URL` in Info.plist, which comes from the
        /// build configuration, so a TestFlight build can point at staging and a
        /// release build at production without a code change. It was previously
        /// hardcoded to one host, which meant there was no way to test a build
        /// against anything but production.
        ///
        /// Falling back to staging is deliberate: a misconfigured build should
        /// hit the environment full of fake data, never the one with real
        /// people's bank accounts.
        static let baseURL: URL = {
            // An explicit override always wins, on simulator and device alike.
            // Set COINY_API_BASE_URL in the scheme's environment variables to
            // point a simulator run at staging without editing code or touching
            // the build configuration.
            if let override = ProcessInfo.processInfo.environment["COINY_API_BASE_URL"],
               let url = URL(string: override), url.scheme == "https" || url.scheme == "http" {
                return url
            }

            #if targetEnvironment(simulator)
            // Localhost by default, because the common simulator case is a
            // developer running the backend on the same machine. Overriding via
            // the scheme is how you reach staging.
            return URL(string: "http://127.0.0.1:3000")!
            #else
            // Device builds take the value baked in by the build configuration
            // (ios/project.yml), falling back to staging. Falling back to
            // staging is deliberate: a misconfigured build should reach the
            // environment full of fake data, never real people's bank accounts.
            let configured = Bundle.main.object(forInfoDictionaryKey: "COINY_API_BASE_URL") as? String
            if let configured, let url = URL(string: configured), url.scheme == "https" {
                return url
            }
            return URL(string: "https://coiny-backend.fly.dev")!
            #endif
        }()
    }

    enum APIError: Error, LocalizedError {
        case invalidURL
        case http(status: Int, body: String)
        case decode(underlying: Error)
        case transport(underlying: Error)
        case unauthenticated

        var errorDescription: String? {
            switch self {
            case .invalidURL: return "Invalid request URL"
            // The status ONLY. `body` is deliberately not interpolated: this
            // type is a LocalizedError, so 86 assignments across 25 ViewModels
            // put `localizedDescription` into rendered error state, and a raw
            // server response could be drawn on screen under a themed error
            // line. PRD R-31.9. This one edit retires the largest share of
            // those sites because they all inherit it.
            case let .http(status, _): return "HTTP \(status)"
            case let .decode(error): return "Decode failed: \(error.localizedDescription)"
            case let .transport(error): return "Network failed: \(error.localizedDescription)"
            case .unauthenticated: return "Not signed in"
            }
        }
    }

    private let baseURL: URL
    private let http: HTTPClient
    private let sessionStore: SessionStore
    private let decoder: JSONDecoder
    var sessionToken: String?

    init(baseURL: URL, http: HTTPClient, sessionStore: SessionStore) {
        self.baseURL = baseURL
        self.http = http
        self.sessionStore = sessionStore
        self.decoder = Self.makeDecoder()
        self.sessionToken = sessionStore.load()
    }

    private static func makeDecoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { dec in
            let container = try dec.singleValueContainer()
            let raw = try container.decode(String.self)

            let withFractional = ISO8601DateFormatter()
            withFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = withFractional.date(from: raw) { return date }

            let plain = ISO8601DateFormatter()
            plain.formatOptions = [.withInternetDateTime]
            if let date = plain.date(from: raw) { return date }

            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Date string not ISO-8601: \(raw)"
            )
        }
        return decoder
    }

    // MARK: - Auth

    var isSignedIn: Bool { sessionToken != nil }

    /// - Parameter authorizationCode: `ASAuthorizationAppleIDCredential.authorizationCode`,
    ///   decoded to a string. The server exchanges it for the refresh token that
    ///   account deletion needs in order to revoke the Sign in with Apple grant
    ///   (TN3194). It is single-use and expires in five minutes, so it is sent
    ///   here and nowhere else. Optional, and a nil never blocks sign-in.
    /// - Parameter nonce: the RAW nonce whose SHA-256 was sent to Apple as the
    ///   request nonce (runbook G1.23). Not optional and with no default: the
    ///   server rejects a request without it, and a default here would let a
    ///   future caller omit it and discover that at runtime instead of at
    ///   compile time.
    func signInWithApple(
        identityToken: String,
        userId: String,
        authorizationCode: String? = nil,
        nonce: String
    ) async throws {
        struct Body: Encodable {
            let identity_token: String
            let user_id: String
            let authorization_code: String?
            let nonce: String
        }
        struct Response: Decodable {
            let token: String
            let user_id: String
        }
        let res: Response = try await request(
            method: "POST",
            path: "/api/auth/apple",
            body: Body(
                identity_token: identityToken,
                user_id: userId,
                authorization_code: authorizationCode,
                nonce: nonce
            ),
            requiresAuth: false
        )
        try sessionStore.save(res.token)
        sessionToken = res.token
    }

    func signOut() {
        let token = sessionToken
        let logoutURL = URL(string: "/api/auth/logout", relativeTo: baseURL)!
        sessionStore.clear()
        sessionToken = nil
        // Fire-and-forget: invalidate the server session so the bearer token cannot be reused.
        Task {
            var req = URLRequest(url: logoutURL)
            req.httpMethod = "POST"
            if let t = token { req.addValue("Bearer \(t)", forHTTPHeaderField: "Authorization") }
            _ = try? await http.data(for: req)
        }
    }

    // MARK: - Pet

    func getPetState() async throws -> PetState {
        try await get("/api/pets")
    }

    @discardableResult
    func updateGoals(_ patch: GoalsPatch) async throws -> PetGoals {
        try await put("/api/pets/goals", body: patch)
    }

    // MARK: - Plaid

    func createLinkToken() async throws -> String {
        struct Res: Decodable { let link_token: String }
        let r: Res = try await post("/api/plaid/link-token")
        return r.link_token
    }

    @discardableResult
    func exchangePublicToken(_ publicToken: String) async throws -> EmptyResponse {
        struct Body: Encodable { let public_token: String }
        return try await post("/api/plaid/exchange-token", body: Body(public_token: publicToken))
    }

    func unlinkBank() async throws {
        try await deleteVoid("/api/plaid/item")
    }

    // MARK: - Devices

    @discardableResult
    func registerDeviceToken(_ hexToken: String) async throws -> EmptyResponse {
        // The IANA timezone lets the backend enforce quiet hours in the
        // user's own zone (docs/prd.md R-9.3); without it, pushes for this
        // user are suppressed entirely rather than sent on a guessed zone.
        struct Body: Encodable { let token: String; let platform: String; let timezone: String }
        return try await post(
            "/api/devices/push-token",
            body: Body(token: hexToken, platform: "ios", timezone: TimeZone.current.identifier)
        )
    }

    // MARK: - Account

    @discardableResult
    func deleteAccount() async throws -> EmptyResponse {
        try await delete("/api/account")
    }

    // MARK: - Coinbase

    func getCoinbaseStatus() async throws -> CoinbaseStatus {
        try await get("/api/coinbase/status")
    }

    @discardableResult
    func connectCoinbaseDevKey() async throws -> EmptyResponse {
        try await post("/api/coinbase/connect/dev-key")
    }

    func disconnectCoinbase() async throws {
        try await deleteVoid("/api/coinbase/connect")
    }

    func syncCoinbase() async throws -> SyncResult {
        try await post("/api/coinbase/sync")
    }

    // MARK: - Zerion

    func getZerionWallets() async throws -> [ZerionWallet] {
        try await get("/api/zerion/wallets")
    }

    func addZerionWallet(address: String, label: String?) async throws -> ZerionWallet {
        struct Body: Encodable { let address: String; let label: String? }
        return try await post("/api/zerion/wallets", body: Body(address: address, label: label))
    }

    func removeZerionWallet(address: String) async throws {
        try await deleteVoid("/api/zerion/wallets/\(address)")
    }

    func getZerionPortfolio() async throws -> ZerionPortfolio {
        try await get("/api/zerion/portfolio")
    }

    func syncZerion() async throws -> SyncResult {
        try await post("/api/zerion/sync")
    }

    // MARK: - Spinwheel

    func getSpinwheelStatus() async throws -> SpinwheelStatus {
        try await get("/api/spinwheel/status")
    }

    @discardableResult
    func sendSpinwheelOtp(phone: String, dateOfBirth: String) async throws -> EmptyResponse {
        struct Body: Encodable { let phone: String; let dateOfBirth: String }
        return try await post("/api/spinwheel/connect/sms", body: Body(phone: phone, dateOfBirth: dateOfBirth))
    }

    @discardableResult
    func verifySpinwheelOtp(phone: String, code: String) async throws -> EmptyResponse {
        struct Body: Encodable { let phone: String; let code: String }
        return try await post("/api/spinwheel/connect/sms/verify", body: Body(phone: phone, code: code))
    }

    func getSpinwheelDebts() async throws -> SpinwheelDebtsResponse {
        try await get("/api/spinwheel/debts")
    }

    func getSpinwheelCreditScore() async throws -> SpinwheelCreditScoreResponse {
        try await get("/api/spinwheel/credit-score")
    }

    func disconnectSpinwheel() async throws {
        try await deleteVoid("/api/spinwheel/connect")
    }

    // MARK: - Internals

    func get<T: Decodable>(_ path: String) async throws -> T {
        try await request(method: "GET", path: path, body: Optional<Empty>.none, requiresAuth: true)
    }

    func put<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        try await request(method: "PUT", path: path, body: body, requiresAuth: true)
    }

    func post<T: Decodable>(_ path: String) async throws -> T {
        try await request(method: "POST", path: path, body: Optional<Empty>.none, requiresAuth: true)
    }

    func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        try await request(method: "POST", path: path, body: body, requiresAuth: true)
    }

    /// DELETE for endpoints that return 204 No Content.
    func deleteVoid(_ path: String) async throws {
        guard let url = URL(string: path, relativeTo: baseURL) else {
            throw APIError.invalidURL
        }
        if sessionToken == nil { throw APIError.unauthenticated }

        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"
        req.addValue("application/json", forHTTPHeaderField: "Accept")
        if let token = sessionToken {
            req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await http.data(for: req)
        } catch {
            throw APIError.transport(underlying: error)
        }
        guard let httpResp = response as? HTTPURLResponse else {
            throw APIError.http(status: -1, body: "no response")
        }
        if httpResp.statusCode == 401 { signOut() }
        guard (200..<300).contains(httpResp.statusCode) else {
            throw APIError.http(
                status: httpResp.statusCode,
                body: String(data: data, encoding: .utf8) ?? ""
            )
        }
    }

    func request<T: Decodable, B: Encodable>(
        method: String,
        path: String,
        body: B?,
        requiresAuth: Bool
    ) async throws -> T {
        guard let url = URL(string: path, relativeTo: baseURL) else {
            throw APIError.invalidURL
        }
        if requiresAuth, sessionToken == nil { throw APIError.unauthenticated }

        var req = URLRequest(url: url)
        req.httpMethod = method
        req.addValue("application/json", forHTTPHeaderField: "Accept")

        if let token = sessionToken, requiresAuth {
            req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            req.addValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONEncoder().encode(body)
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await http.data(for: req)
        } catch {
            throw APIError.transport(underlying: error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.http(status: -1, body: "no response")
        }
        if http.statusCode == 401, requiresAuth { signOut() }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.http(
                status: http.statusCode,
                body: String(data: data, encoding: .utf8) ?? ""
            )
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decode(underlying: error)
        }
    }
}

// MARK: - Chain Wallets + Misc
// Kept outside the actor body for SwiftLint's type_body_length; extensions on
// MARK: - Performance API
extension API {
    func getCoinbasePerformance() async throws -> CoinbasePerformance {
        try await get("/api/coinbase/performance")
    }

    func getZerionPnl() async throws -> ZerionPnl {
        try await get("/api/zerion/pnl")
    }

    func getDefiPositions() async throws -> DefiPositionsResponse {
        try await get("/api/zerion/defi-positions")
    }
}

// MARK: - DTOs

struct Empty: Encodable {}
struct EmptyResponse: Decodable {}

struct HealthResponse: Decodable {
    let ok: Bool
}

struct GoalsPatch: Encodable {
    var weeklyBudgetByCategory: [String: Double]?
    var savingsGoal: Int?
    var paycheckMinAmount: Int?
    var largePurchaseThreshold: Int?
}

struct SyncResult: Decodable {
    let reacted: Int
}

struct CoinbaseStatus: Decodable {
    let connected: Bool
    let mode: String?
}

struct ZerionWallet: Decodable, Identifiable {
    let id: String
    let userId: String
    let address: String
    let label: String?
    let createdAt: Date
}

struct ZerionPortfolio: Decodable {
    let data: ZerionPortfolioData
    struct ZerionPortfolioData: Decodable { let attributes: ZerionPortfolioAttributes }
    struct ZerionPortfolioAttributes: Decodable { let total: ZerionPortfolioTotal }
    struct ZerionPortfolioTotal: Decodable { let positions: Double }
}

struct SpinwheelStatus: Decodable {
    let connected: Bool
}

struct SpinwheelDebt: Decodable, Identifiable {
    let id: String
    let debtType: String?
    let balance: Double?
    let monthlyPayment: Double?
    let creditLimit: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case debtType = "type"
        case balance
        case monthlyPayment
        case creditLimit
    }
}

struct SpinwheelDebtsResponse: Decodable {
    let debts: [SpinwheelDebt]
}

struct SpinwheelCreditScoreResponse: Decodable {
    let score: Int?
    let utilization: Double?
}

// MARK: - Spending DTOs

struct SpendingSummaryResponse: Decodable {
    let monthlySpend: Double
    let monthlyIncome: Double
    let savingsRate: Int?
    let spendByCategory: [String: Double]?
}

struct ChainWallet: Decodable, Identifiable {
    let id: Int
    let chain: String
    let address: String
    let label: String?
    let lastBalanceUsd: Double?
    let lastSyncedAt: String?
}
struct ChainWalletSyncResult: Decodable {
    let updated: Int
}

struct SpendingOverride: Decodable, Identifiable {
    let merchantName: String
    let category: String
    var id: String { merchantName }
}

/// One recurring charge or income stream, as Plaid classified it.
///
/// `monthlyAmount` is null when Plaid could not name a cadence. It is not
/// defaulted to zero: a made-up number inside a spending total is worse than
/// an absent one, so those rows are shown and excluded from the sum.
struct RecurringItem: Decodable, Identifiable {
    let id: String
    let name: String
    let frequency: String
    let amount: Double
    let monthlyAmount: Double?
    let lastDate: String?
}

struct RecurringSummary: Decodable {
    let outflow: [RecurringItem]
    let inflow: [RecurringItem]
    let monthlyOutflowTotal: Double
    let monthlyInflowTotal: Double
    /// Streams left out of the totals because their cadence is unknown.
    let excludedFromTotals: Int

    static let empty = RecurringSummary(
        outflow: [], inflow: [], monthlyOutflowTotal: 0, monthlyInflowTotal: 0, excludedFromTotals: 0
    )
}
