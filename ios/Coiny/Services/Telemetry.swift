import Foundation
import os

// Client-side analytics emitter per PRD section 24 (R-24.1, R-24.2).
//
// The wire shape is the batch of `{event, properties, client_ts}` rows section
// 24 specifies. `APITelemetryTransport` (API+Telemetry.swift) is what is wired
// at `TelemetryClient.shared`; `LogTelemetryTransport` below is kept for tests
// and for reading the funnel in Console without a backend.
//
// Consent rule, from docs/legal/consent-copy.md: nothing is enqueued before the
// first sign-in completes, and nothing while the Settings toggle is off. See
// `TelemetryConsent`. The server enforces the same flag independently
// (users.analytics_opt_out), because server-emitted events have no client.
//
// Privacy rule, inherited from engineering-budgets section 8 and R-22.6:
// no amounts, no merchant names, no emails, ever. Values are bucketed enums.
// `TelemetryValue.usdBucket` is the only sanctioned way to reference money.

// MARK: - Values

/// A property value on an analytics event. Restricted to the shapes section 24
/// allows so a raw amount or free-form PII string cannot sneak into an event
/// without an explicit, greppable call site.
enum TelemetryValue: Equatable, Sendable {
    case string(String)
    case int(Int)
    case bool(Bool)
    case strings([String])
    /// A map of token to bucketed band, for events whose schema nests per-class
    /// values under a single key rather than flattening them into the envelope.
    case bands([String: String])

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
        case .bands(let map):
            return "{" + map.sorted { $0.key < $1.key }.map { "\($0.key):\($0.value)" }.joined(separator: ",") + "}"
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
        case .bands(let map): try container.encode(map)
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

/// The seam between the emitter and the wire. `APITelemetryTransport` (in
/// API+Telemetry.swift) is the production implementation; `LogTelemetryTransport`
/// is kept for tests and for reading the funnel in Console without a backend.
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

// MARK: - Consent

/// The consent gate `docs/legal/consent-copy.md` specifies, in the one place
/// both conditions can be checked: "no event may be enqueued before the first
/// successful sign-in completes, and none while the Settings toggle below is
/// off" (`:30-32`).
///
/// The sign-in screen is where the disclosure is shown, so it is also where
/// consent starts. Before it, nothing is collected: Apple 5.1.1(ii) requires
/// consent before collection, and a user who never got past sign-in never had
/// a chance to give it.
enum TelemetryConsent {
    /// Set once the first sign-in completes and the consent line has therefore
    /// been shown. Never reset on sign-out: the disclosure was still delivered.
    static let acknowledgedKey = "telemetryConsentAcknowledged"
    /// The "Share usage data" toggle. Absent means on, because consent was
    /// given at sign-in; the user turns it off, they never turn it on.
    static let shareUsageDataKey = "shareUsageData"

    static var isGranted: Bool {
        let defaults = UserDefaults.standard
        guard defaults.bool(forKey: acknowledgedKey) else { return false }
        return defaults.object(forKey: shareUsageDataKey) as? Bool ?? true
    }

    /// Called by `SignInView` once the server has recorded the acknowledgement.
    static func recordAcknowledgement() {
        UserDefaults.standard.set(true, forKey: acknowledgedKey)
    }
}

// MARK: - Client

/// Queueing emitter per R-24.1: events accumulate and flush 25 at a time or on
/// demand (the onboarding flow flushes when it completes and when the app
/// backgrounds). Failed flushes requeue so events are not dropped silently.
actor TelemetryClient {
    static let shared = TelemetryClient(transport: APITelemetryTransport())

    static let flushThreshold = 25

    private let transport: TelemetryTransport
    private let now: @Sendable () -> Date
    private let isGranted: @Sendable () -> Bool
    private var queue: [TelemetryEvent] = []
    private var isFlushing = false

    init(
        transport: TelemetryTransport,
        now: @escaping @Sendable () -> Date = { Date() },
        isGranted: @escaping @Sendable () -> Bool = { TelemetryConsent.isGranted }
    ) {
        self.transport = transport
        self.now = now
        self.isGranted = isGranted
    }

    /// Number of events currently queued. Exposed for tests.
    var pendingCount: Int { queue.count }

    func emit(_ event: String, _ properties: [String: TelemetryValue] = [:]) async {
        guard isGranted() else { return }
        queue.append(TelemetryEvent(event: event, properties: properties, clientTimestamp: now()))
        if queue.count >= Self.flushThreshold {
            await flush()
        }
    }

    func flush() async {
        // Consent can be withdrawn while a batch is queued. Turning the toggle
        // off stops the queue immediately, which means discarding what is in
        // it, not delivering it one last time.
        guard isGranted() else {
            queue.removeAll()
            return
        }
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
