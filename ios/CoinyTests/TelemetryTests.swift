import XCTest
@testable import Coiny

/// Recording transport for telemetry tests. `@unchecked Sendable` behind an
/// NSLock, same pattern as `InMemorySessionStore`.
final class RecordingTelemetryTransport: TelemetryTransport, @unchecked Sendable {
    private let lock = NSLock()
    private var storedEvents: [TelemetryEvent] = []
    private var failNext = false

    var events: [TelemetryEvent] {
        lock.lock(); defer { lock.unlock() }
        return storedEvents
    }

    func setFailNext() {
        lock.lock(); defer { lock.unlock() }
        failNext = true
    }

    func send(_ events: [TelemetryEvent]) async throws {
        lock.lock(); defer { lock.unlock() }
        if failNext {
            failNext = false
            throw URLError(.notConnectedToInternet)
        }
        storedEvents.append(contentsOf: events)
    }
}

final class TelemetryTests: XCTestCase {
    func testUsdBucketLabels() {
        XCTAssertEqual(TelemetryValue.usdBucketLabel(500), "0-1k")
        XCTAssertEqual(TelemetryValue.usdBucketLabel(5_000), "1k-10k")
        XCTAssertEqual(TelemetryValue.usdBucketLabel(50_000), "10k-100k")
        XCTAssertEqual(TelemetryValue.usdBucketLabel(500_000), "100k-1m")
        XCTAssertEqual(TelemetryValue.usdBucketLabel(5_000_000), "1m+")
        XCTAssertEqual(TelemetryValue.usdBucketLabel(-5_000), "1k-10k", "buckets use magnitude")
    }

    func testEventsQueueUntilFlush() async {
        let transport = RecordingTelemetryTransport()
        let client = TelemetryClient(transport: transport)

        await client.emit("signup_completed", ["method": .string("apple")])
        let pendingBefore = await client.pendingCount
        XCTAssertEqual(pendingBefore, 1)
        XCTAssertTrue(transport.events.isEmpty)

        await client.flush()
        XCTAssertEqual(transport.events.map(\.event), ["signup_completed"])
        let pendingAfter = await client.pendingCount
        XCTAssertEqual(pendingAfter, 0)
    }

    func testAutoFlushAtThreshold() async {
        let transport = RecordingTelemetryTransport()
        let client = TelemetryClient(transport: transport)

        for index in 0..<TelemetryClient.flushThreshold {
            await client.emit("app_open", ["index": .int(index)])
        }
        XCTAssertEqual(transport.events.count, TelemetryClient.flushThreshold)
    }

    func testFailedFlushRequeuesEvents() async {
        let transport = RecordingTelemetryTransport()
        let client = TelemetryClient(transport: transport)

        await client.emit("first_number_shown")
        transport.setFailNext()
        await client.flush()
        XCTAssertTrue(transport.events.isEmpty)
        let pending = await client.pendingCount
        XCTAssertEqual(pending, 1, "a failed batch must be requeued, not dropped")

        await client.flush()
        XCTAssertEqual(transport.events.map(\.event), ["first_number_shown"])
    }

    func testWireShapeMatchesSection24() throws {
        // The batch row shape section 24 specifies: event, properties, client_ts.
        let event = TelemetryEvent(
            event: "onboarding_declared",
            properties: ["classes": .strings(["checking"]), "class_count": .int(1)],
            clientTimestamp: Date(timeIntervalSince1970: 1_700_000_000)
        )
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let json = try XCTUnwrap(String(data: encoder.encode(event), encoding: .utf8))
        XCTAssertTrue(json.contains("\"event\""))
        XCTAssertTrue(json.contains("\"properties\""))
        XCTAssertTrue(json.contains("\"client_ts\""))
    }
}
