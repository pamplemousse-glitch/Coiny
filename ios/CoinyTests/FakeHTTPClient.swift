import Foundation
@testable import Coiny

/// Records every request the SUT issues and returns canned responses. The
/// queue is shared across threads (the SUT is an actor) so it's guarded by
/// a lock and reachable from anywhere.
final class FakeHTTPClient: HTTPClient, @unchecked Sendable {
    enum Reply {
        case ok(status: Int, body: Data)
        case error(Error)
    }

    private let lock = NSLock()
    private var replies: [Reply] = []
    private(set) var requests: [URLRequest] = []

    func enqueue(_ reply: Reply) {
        lock.lock(); defer { lock.unlock() }
        replies.append(reply)
    }

    func enqueue(status: Int, json: String) {
        enqueue(.ok(status: status, body: Data(json.utf8)))
    }

    func enqueue(error: Error) {
        enqueue(.error(error))
    }

    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        lock.lock()
        requests.append(request)
        guard !replies.isEmpty else {
            lock.unlock()
            throw NSError(domain: "FakeHTTPClient", code: -1, userInfo: [NSLocalizedDescriptionKey: "no reply enqueued"])
        }
        let reply = replies.removeFirst()
        lock.unlock()

        switch reply {
        case let .ok(status, body):
            let response = HTTPURLResponse(
                url: request.url ?? URL(string: "https://test.local")!,
                statusCode: status,
                httpVersion: "HTTP/1.1",
                headerFields: ["Content-Type": "application/json"]
            )!
            return (body, response)
        case let .error(error):
            throw error
        }
    }
}
