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
        // Backend sends ISO-8601 with fractional seconds. We create formatters
        // inside the closure to avoid Sendable capture issues (formatters are
        // not Sendable). Cost is minimal — only fires per Date field decoded.
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

    // MARK: - Endpoints

    /// `GET /api/pets`
    func getPetState() async throws -> PetState {
        try await get("/api/pets")
    }

    /// `PUT /api/pets/goals`
    @discardableResult
    func updateGoals(_ patch: GoalsPatch) async throws -> PetGoals {
        try await put("/api/pets/goals", body: patch)
    }

    /// `POST /api/plaid/link-token`
    func createLinkToken() async throws -> String {
        struct Res: Decodable { let link_token: String }
        let r: Res = try await post("/api/plaid/link-token")
        return r.link_token
    }

    /// `POST /api/plaid/exchange-token`
    @discardableResult
    func exchangePublicToken(_ publicToken: String) async throws -> EmptyResponse {
        struct Body: Encodable { let public_token: String }
        return try await post("/api/plaid/exchange-token", body: Body(public_token: publicToken))
    }

    /// `GET /health`
    func health() async throws -> HealthResponse {
        try await get("/health")
    }

    #if DEBUG
    /// `POST /api/debug/fire-transaction` — sandbox only, fires a DEFAULT_UPDATE webhook.
    @discardableResult
    func fireTestTransaction() async throws -> EmptyResponse {
        try await post("/api/debug/fire-transaction")
    }
    #endif

    // MARK: - Internals

    private func get<T: Decodable>(_ path: String) async throws -> T {
        try await request(method: "GET", path: path, body: Optional<Empty>.none)
    }

    private func put<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        try await request(method: "PUT", path: path, body: body)
    }

    private func post<T: Decodable>(_ path: String) async throws -> T {
        try await request(method: "POST", path: path, body: Optional<Empty>.none)
    }

    private func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        try await request(method: "POST", path: path, body: body)
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

// MARK: - Request/response DTOs

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
