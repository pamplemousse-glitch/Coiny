import Foundation
import os

/// Batch envelope for `POST /api/telemetry`.
private struct TelemetryBatch: Encodable {
    let events: [TelemetryEvent]
}

/// Per-event rejection the server reports without failing the batch.
struct TelemetryRejection: Decodable, Equatable, Sendable {
    let index: Int
    let reason: String
}

struct TelemetryBatchResponse: Decodable, Equatable, Sendable {
    let accepted: Int
    let rejected: [TelemetryRejection]
}

extension API {
    func sendTelemetry(_ events: [TelemetryEvent]) async throws -> TelemetryBatchResponse {
        try await post("/api/telemetry", body: TelemetryBatch(events: events))
    }
}

/// Production transport. Replaces `LogTelemetryTransport`, which stood in while
/// the endpoint was being built on a separate branch.
///
/// A rejected event is a bug in this client, not a transport failure: the server
/// rejects an event only when its name is unknown, its properties do not match
/// the schema, or a client tried to send a server-only event. Retrying would
/// resend the same malformed row forever, so rejections are logged loudly and
/// the batch is treated as delivered. Only a genuine transport error throws,
/// and only that requeues.
struct APITelemetryTransport: TelemetryTransport {
    private static let logger = Logger(subsystem: "app.coiny.ios", category: "telemetry")

    func send(_ events: [TelemetryEvent]) async throws {
        let response = try await API.shared.sendTelemetry(events)
        for rejection in response.rejected {
            let name = events.indices.contains(rejection.index) ? events[rejection.index].event : "unknown"
            Self.logger.error(
                "telemetry event rejected event=\(name, privacy: .public) reason=\(rejection.reason, privacy: .public)"
            )
        }
    }
}
