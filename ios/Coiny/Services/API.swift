import Foundation

/// Network layer for talking to coiny-backend.fly.dev.
/// Single instance per session; injected via SwiftUI Environment.
actor API {
    static let shared = API()

    enum Endpoint {
        static let baseURL = URL(string: "https://coiny-backend.fly.dev")!
    }

    enum APIError: Error, LocalizedError {
        case invalidURL
        case http(status: Int, body: String)
        case decode(underlying: Error)
        case transport(underlying: Error)

        var errorDescription: String? {
            switch self {
            case .invalidURL: return "Invalid request URL"
            case let .http(status, body): return "HTTP \(status): \(body)"
            case let .decode(error): return "Decode failed: \(error.localizedDescription)"
            case let .transport(error): return "Network failed: \(error.localizedDescription)"
            }
        }
    }

    private let session: URLSession
    private let decoder: JSONDecoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.waitsForConnectivity = true
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        // Backend sends ISO-8601 with fractional seconds.
        decoder.dateDecodingStrategy = .custom { dec in
            let container = try dec.singleValueContainer()
            let raw = try container.decode(String.self)
            let withFractional = ISO8601DateFormatter()
            withFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = withFractional.date(from: raw) {
                return date
            }
            let plain = ISO8601DateFormatter()
            plain.formatOptions = [.withInternetDateTime]
            if let date = plain.date(from: raw) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Date string not ISO-8601: \(raw)"
            )
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

    func health() async throws -> HealthResponse {
        try await get("/health")
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

    // MARK: - Internals

    private func get<T: Decodable>(_ path: String) async throws -> T {
        try await request(method: "GET", path: path, body: Optional<Empty>.none)
    }

    private func post<T: Decodable>(_ path: String) async throws -> T {
        try await request(method: "POST", path: path, body: Optional<Empty>.none)
    }

    private func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        try await request(method: "POST", path: path, body: body)
    }

    private func put<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        try await request(method: "PUT", path: path, body: body)
    }

    private func delete<T: Decodable>(_ path: String) async throws -> T {
        try await request(method: "DELETE", path: path, body: Optional<Empty>.none)
    }

    /// DELETE for endpoints that return 204 No Content (no body to decode).
    private func deleteVoid(_ path: String) async throws {
        guard let url = URL(string: path, relativeTo: Endpoint.baseURL) else {
            throw APIError.invalidURL
        }
        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"
        req.addValue("application/json", forHTTPHeaderField: "Accept")
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw APIError.transport(underlying: error)
        }
        guard let http = response as? HTTPURLResponse else {
            throw APIError.http(status: -1, body: "no response")
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.http(
                status: http.statusCode,
                body: String(data: data, encoding: .utf8) ?? ""
            )
        }
    }

    private func request<T: Decodable, B: Encodable>(
        method: String,
        path: String,
        body: B?
    ) async throws -> T {
        guard let url = URL(string: path, relativeTo: Endpoint.baseURL) else {
            throw APIError.invalidURL
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.addValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            req.addValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONEncoder().encode(body)
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw APIError.transport(underlying: error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.http(status: -1, body: "no response")
        }
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
