import Foundation
import os

/// Client-side analytics emitter per PRD section 24 (R-24.1, R-24.2).
///
/// The backend endpoint (`POST /api/telemetry`) does not exist yet; it is being
/// built in parallel. This client is therefore written against the wire shape
/// section 24 specifies (a batch of `{event, properties, client_ts}` rows) and
/// the transport is a stub that logs. Swapping in the real network transport is
/// a one-line change at `Telemetry.shared`.
///
/// Privacy rule, inherited from engineering-budgets section 8 and R-22.6:
/// no amounts, no merchant names, no emails, ever. Values are bucketed enums.
/// `TelemetryValue.usdBucket` is the only sanctioned way to reference money.

// MARK: - Values

/// A property value on an analytics event. Restricted to the shapes section 24
/// allows so a raw amount or free-form PII string cannot sneak into an event
/// without an explicit, greppable call site.
enum TelemetryValue: Equatable, Sendable {
    case string(String)
    case int(Int)
    case bool(Bool)
    case strings([String])

    /// Buckets a USD amount into the coarse enum the spec mandates instead of
    /// ever sending the amount itself.
    static func usdBucket(_ amountUSD: Double) -> TelemetryValue {
        .string(Self.usdBucketLabel(amountUSD))
    }

    static func usdBucketLabel(_ amountUSD: Double) -> String {
        let magnitude = abs(amountUSD)
        switch magnitude {
        case ..<1_000: return "0-1k"
        case ..<10_000: return "1k-10k"
        case ..<100_000: return "10k-100k"
        case ..<1_000_000: return "100k-1m"
        default: return "1m+"
        }
    }

    var loggableDescription: String {
        switch self {
        case .string(let value): return value
        case .int(let value): return String(value)
        case .bool(let value): return String(value)
        case .strings(let values): return "[" + values.joined(separator: ",") + "]"
        }
    }
}

extension TelemetryValue: Encodable {
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value): try container.encode(value)
        case .int(let value): try container.encode(value)
        case .bool(let value): try container.encode(value)
        case .strings(let values): try container.encode(values)
        }
    }
}

// MARK: - Events

/// One analytics event, matching the section 24 batch row shape.
struct TelemetryEvent: Encodable, Equatable, Sendable {
    let event: String
    let properties: [String: TelemetryValue]
    let clientTimestamp: Date

    enum CodingKeys: String, CodingKey {
        case event
        case properties
        case clientTimestamp = "client_ts"
    }
}

// MARK: - Transport

/// The seam between the emitter and the wire. The production implementation
/// will POST batches to `/api/telemetry` once that endpoint exists; until then
/// `LogTelemetryTransport` stands in.
protocol TelemetryTransport: Sendable {
    func send(_ events: [TelemetryEvent]) async throws
}

/// Stub transport: writes each event to the unified log and reports success.
/// Event properties are PII-free by construction (see the header comment), so
/// logging them is safe and makes the funnel visible in Console during
/// development and TestFlight sessions.
struct LogTelemetryTransport: TelemetryTransport {
    private static let logger = Logger(subsystem: "app.coiny.ios", category: "telemetry")

    func send(_ events: [TelemetryEvent]) async throws {
        for event in events {
            let props = event.properties
                .sorted { $0.key < $1.key }
                .map { "\($0.key)=\($0.value.loggableDescription)" }
                .joined(separator: " ")
            Self.logger.info("event=\(event.event, privacy: .public) \(props, privacy: .public)")
        }
    }
}

// MARK: - Client

/// Queueing emitter per R-24.1: events accumulate and flush 25 at a time or on
/// demand (the onboarding flow flushes when it completes and when the app
/// backgrounds). Failed flushes requeue so events are not dropped silently.
actor TelemetryClient {
    static let shared = TelemetryClient(transport: LogTelemetryTransport())

    static let flushThreshold = 25

    private let transport: TelemetryTransport
    private let now: @Sendable () -> Date
    private var queue: [TelemetryEvent] = []
    private var isFlushing = false

    init(transport: TelemetryTransport, now: @escaping @Sendable () -> Date = { Date() }) {
        self.transport = transport
        self.now = now
    }

    /// Number of events currently queued. Exposed for tests.
    var pendingCount: Int { queue.count }

    func emit(_ event: String, _ properties: [String: TelemetryValue] = [:]) async {
        queue.append(TelemetryEvent(event: event, properties: properties, clientTimestamp: now()))
        if queue.count >= Self.flushThreshold {
            await flush()
        }
    }

    func flush() async {
        guard !isFlushing, !queue.isEmpty else { return }
        isFlushing = true
        let batch = queue
        queue.removeAll()
        defer { isFlushing = false }
        do {
            try await transport.send(batch)
        } catch {
            // Requeue at the front so ordering is preserved for the next attempt.
            queue.insert(contentsOf: batch, at: 0)
        }
    }
}
