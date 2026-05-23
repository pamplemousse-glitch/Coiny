import Foundation

/// Network layer for talking to coiny-backend.fly.dev.
///
/// Construction takes injected dependencies (HTTPClient, SessionStore, base URL)
/// so tests can drive the entire request/response surface without touching the
/// real network or Keychain. Production code uses `API.shared`.
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
        static let baseURL = URL(string: "https://coiny-backend.fly.dev")!
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
            case let .http(status, body): return "HTTP \(status): \(body)"
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
    private var sessionToken: String?

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

    func signInWithApple(identityToken: String, userId: String, email: String?) async throws {
        struct Body: Encodable {
            let identity_token: String
            let user_id: String
            let email: String?
        }
        struct Response: Decodable {
            let token: String
            let user_id: String
        }
        let res: Response = try await request(
            method: "POST",
            path: "/api/auth/apple",
            body: Body(identity_token: identityToken, user_id: userId, email: email),
            requiresAuth: false
        )
        try sessionStore.save(res.token)
        sessionToken = res.token
    }

    func signOut() {
        sessionStore.clear()
        sessionToken = nil
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

    // MARK: - Devices

    @discardableResult
    func registerDeviceToken(_ hexToken: String) async throws -> EmptyResponse {
        struct Body: Encodable { let token: String; let platform: String }
        return try await post("/api/devices/push-token", body: Body(token: hexToken, platform: "ios"))
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

    func disconnectSpinwheel() async throws {
        try await deleteVoid("/api/spinwheel/connect")
    }

    // MARK: - Net Worth

    func getNetWorth() async throws -> NetWorthResponse {
        try await get("/api/net-worth")
    }

    // MARK: - Misc

    func health() async throws -> HealthResponse {
        try await request(method: "GET", path: "/health", body: Optional<Empty>.none, requiresAuth: false)
    }

    #if DEBUG
    @discardableResult
    func fireTestTransaction() async throws -> EmptyResponse {
        try await post("/api/debug/fire-transaction")
    }

    /// Creates a real backend session for the fixed simulator test user and
    /// stores the token in memory. Bypasses Sign In with Apple, which doesn't
    /// work in the Simulator. Token is lost on app restart (no Keychain write).
    func injectDebugSession() async throws {
        struct DebugSessionResponse: Decodable { let token: String }
        let response: DebugSessionResponse = try await request(
            method: "POST", path: "/api/debug/session",
            body: Optional<String>.none, requiresAuth: false
        )
        sessionToken = response.token
    }
    #endif

    // MARK: - Internals

    private func get<T: Decodable>(_ path: String) async throws -> T {
        try await request(method: "GET", path: path, body: Optional<Empty>.none, requiresAuth: true)
    }

    private func put<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        try await request(method: "PUT", path: path, body: body, requiresAuth: true)
    }

    private func post<T: Decodable>(_ path: String) async throws -> T {
        try await request(method: "POST", path: path, body: Optional<Empty>.none, requiresAuth: true)
    }

    private func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        try await request(method: "POST", path: path, body: body, requiresAuth: true)
    }

    private func delete<T: Decodable>(_ path: String) async throws -> T {
        try await request(method: "DELETE", path: path, body: Optional<Empty>.none, requiresAuth: true)
    }

    /// DELETE for endpoints that return 204 No Content.
    private func deleteVoid(_ path: String) async throws {
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

    private func request<T: Decodable, B: Encodable>(
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

    struct ZerionPortfolioData: Decodable {
        let attributes: ZerionPortfolioAttributes
    }

    struct ZerionPortfolioAttributes: Decodable {
        let total: ZerionPortfolioTotal
    }

    struct ZerionPortfolioTotal: Decodable {
        let positions: Double
    }
}

struct SpinwheelStatus: Decodable {
    let connected: Bool
}

struct SpinwheelDebt: Decodable, Identifiable {
    let id: String
    let debtType: String?
    let balance: Double?
    let monthlyPayment: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case debtType = "type"
        case balance
        case monthlyPayment
    }
}

struct SpinwheelDebtsResponse: Decodable {
    let debts: [SpinwheelDebt]
}

// MARK: - Net Worth DTOs

struct NetWorthResponse: Decodable {
    let total: Double
    let bank: Double
    let crypto: Double
    let defi: Double
    let debts: Double
    let accounts: NetWorthAccounts
    let connections: NetWorthConnections
}

struct NetWorthAccounts: Decodable {
    let bank: [BankAccount]
    let crypto: [CryptoPosition]
    let defi: DefiTotal
    let debts: [DebtItem]
}

struct NetWorthConnections: Decodable {
    let coinbase: Bool
    let zerion: Bool
    let spinwheel: Bool
}

struct BankAccount: Decodable, Identifiable {
    let id: String
    let name: String
    let type: String
    let balance: Double

    enum CodingKeys: String, CodingKey {
        case id = "accountId"
        case name
        case type
        case balance
    }
}

struct CryptoPosition: Decodable, Identifiable {
    let id: String
    let name: String
    let symbol: String
    let amount: Double
    let valueUSD: Double
}

struct DefiTotal: Decodable {
    let totalUSD: Double
}

struct DebtItem: Decodable, Identifiable {
    let id: String
    let type: String?
    let balance: Double
    let monthlyPayment: Double?
}
