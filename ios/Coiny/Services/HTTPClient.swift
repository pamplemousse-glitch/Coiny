import Foundation

/// Network seam used by `API`. Production binds to URLSession; tests bind to a
/// fake that returns canned responses without touching the network.
protocol HTTPClient: Sendable {
    func data(for request: URLRequest) async throws -> (Data, URLResponse)
}

extension URLSession: HTTPClient {}
