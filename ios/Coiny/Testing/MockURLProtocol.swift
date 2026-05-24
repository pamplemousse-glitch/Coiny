#if DEBUG
import Foundation

/// URLProtocol subclass that intercepts HTTP requests during XCUITest runs and
/// returns canned JSON stubs instead of hitting the real network.
///
/// Activation: the app must be launched with "--mock-network" in launchArguments.
/// Stubs are loaded from the "MOCK_STUBS" launch environment variable, which
/// must be a JSON-encoded `[String: Stub]` keyed by URL path (e.g. "/api/pets").
///
/// Usage in test files:
/// ```swift
/// app.launchArguments = ["--ui-testing", "--mock-network"]
/// app.launchEnvironment["MOCK_STUBS"] = try! JSONEncoder().encode(stubs).string
/// ```
final class MockURLProtocol: URLProtocol {

    // MARK: - Stub model

    struct Stub: Codable {
        let statusCode: Int
        let body: String
    }

    // MARK: - Shared stub registry

    /// Populated once at app init from the MOCK_STUBS environment variable.
    static var stubs: [String: Stub] = [:]

    // MARK: - URLProtocol overrides

    override class func canInit(with request: URLRequest) -> Bool {
        ProcessInfo.processInfo.arguments.contains("--mock-network")
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        guard let url = request.url else {
            client?.urlProtocol(self, didFailWithError: URLError(.badURL))
            return
        }

        // Match by path only so the base URL doesn't matter.
        let key = url.path
        let stub = Self.stubs[key] ?? Stub(statusCode: 404, body: "{\"error\":\"no stub for \\(key)\"}")

        let response = HTTPURLResponse(
            url: url,
            statusCode: stub.statusCode,
            httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": "application/json"]
        )!

        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data(stub.body.utf8))
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}
}
#endif
