import XCTest
@testable import Coiny

/// `MXMetricPayload` has no public initialiser, so the payload-to-snapshot
/// extraction cannot be unit tested directly. That is exactly why the reduction
/// is split: `DeviceMetricsSnapshot` carries the mapping and the clamping, and
/// those are what can go wrong silently in production.
final class MetricKitReporterTests: XCTestCase {
    // MARK: - OS version parsing

    func testOSMajorParsesTheAppleFormat() {
        XCTAssertEqual(DeviceMetricsSnapshot.osMajor(fromOSVersion: "iPhone OS 26.5 (23F79)"), 26)
    }

    func testOSMajorIgnoresTheBuildNumberInParentheses() {
        // The build "23F79" leads with digits and would parse as 23 if the
        // scanner took the first run of digits it saw rather than the first one
        // followed by a dot. That would misattribute every metric in the row.
        XCTAssertEqual(DeviceMetricsSnapshot.osMajor(fromOSVersion: "iPhone OS 17.0 (23F79)"), 17)
    }

    func testOSMajorHandlesATwoComponentVersion() {
        XCTAssertEqual(DeviceMetricsSnapshot.osMajor(fromOSVersion: "iPhone OS 18.1.2 (22B91)"), 18)
    }

    func testOSMajorReturnsNilWhenNoDottedVersionIsPresent() {
        // Nil rather than a guess: the caller drops the payload, which is
        // better than attributing its numbers to a fabricated OS.
        XCTAssertNil(DeviceMetricsSnapshot.osMajor(fromOSVersion: "iPhone OS (23F79)"))
    }

    // MARK: - Wire properties

    private func snapshot() -> DeviceMetricsSnapshot {
        DeviceMetricsSnapshot(appBuild: 321, osMajor: 26)
    }

    func testRequiredPropertiesAreAlwaysPresent() {
        let properties = snapshot().telemetryProperties
        XCTAssertEqual(properties["app_build"], .int(321))
        XCTAssertEqual(properties["os_major"], .int(26))
    }

    func testAbsentMetricsAreOmittedRatherThanSentAsZero() {
        // The server schema keeps these optional so "not reported" and "reported
        // as zero" stay distinguishable. Sending 0 for a day MetricKit had no
        // launch data would read as an instant launch.
        let properties = snapshot().telemetryProperties
        XCTAssertNil(properties["launch_ms_avg"])
        XCTAssertNil(properties["exit_normal"])
        XCTAssertEqual(properties.count, 2)
    }

    func testReportedMetricsAreCarried() {
        var value = snapshot()
        value.launchMsAvg = 842
        value.peakMemoryMB = 214
        value.exitNormal = 40
        value.exitAbnormal = 2
        let properties = value.telemetryProperties
        XCTAssertEqual(properties["launch_ms_avg"], .int(842))
        XCTAssertEqual(properties["peak_memory_mb"], .int(214))
        XCTAssertEqual(properties["exit_normal"], .int(40))
        XCTAssertEqual(properties["exit_abnormal"], .int(2))
    }

    func testValuesAboveTheServerBoundAreClampedNotDropped() {
        // validateClientEvent fails the WHOLE event on one out-of-range number,
        // so an unclamped pathological launch would take the exit counts with
        // it. Clamping keeps the row; the value is already an outlier.
        var value = snapshot()
        value.launchMsAvg = 10_000_000
        XCTAssertEqual(value.telemetryProperties["launch_ms_avg"], .int(600_000))
    }

    func testNegativeValuesAreClampedToZero() {
        var value = snapshot()
        value.scrollHitchPPM = -5
        XCTAssertEqual(value.telemetryProperties["scroll_hitch_ppm"], .int(0))
    }

    func testAppBuildAndOSMajorAreClampedIntoTheSchemaRange() {
        let value = DeviceMetricsSnapshot(appBuild: -1, osMajor: 4)
        let properties = value.telemetryProperties
        XCTAssertEqual(properties["app_build"], .int(0))
        XCTAssertEqual(properties["os_major"], .int(15))
    }

    // MARK: - Property names match the server catalog

    func testEveryPropertyNameIsInTheServerSchema() {
        // The catalog uses z.strictObject, so a key the server does not declare
        // rejects the entire event with `invalid_properties`. This test is the
        // client half of that contract: if a name here drifts from
        // backend/src/analytics/events.ts, the events stop landing and nothing
        // else in this suite would notice.
        let declared: Set<String> = [
            "app_build", "os_major",
            "launch_ms_avg", "hang_ms_avg", "peak_memory_mb", "cpu_ms", "scroll_hitch_ppm",
            "exit_normal", "exit_abnormal", "exit_memory_limit",
            "exit_watchdog", "exit_bad_access", "exit_illegal_instruction",
        ]
        var value = DeviceMetricsSnapshot(appBuild: 1, osMajor: 26)
        value.launchMsAvg = 1
        value.hangMsAvg = 1
        value.peakMemoryMB = 1
        value.cpuMs = 1
        value.scrollHitchPPM = 1
        value.exitNormal = 1
        value.exitAbnormal = 1
        value.exitMemoryLimit = 1
        value.exitWatchdog = 1
        value.exitBadAccess = 1
        value.exitIllegalInstruction = 1

        XCTAssertEqual(Set(value.telemetryProperties.keys), declared)
    }

    // MARK: - Consent

    func testNoDeviceMetricsAreEmittedWithoutConsent() async {
        // MetricKit delivers whether or not the user has consented, so the gate
        // has to hold on this path too, not just on the ones a view triggers.
        let transport = RecordingTelemetryTransport()
        let client = TelemetryClient(transport: transport, isGranted: { false })
        await client.emit("device_metrics", snapshot().telemetryProperties)
        await client.flush()
        XCTAssertTrue(transport.events.isEmpty)
    }

    func testDeviceMetricsAreEmittedWithConsent() async {
        let transport = RecordingTelemetryTransport()
        let client = TelemetryClient(transport: transport, isGranted: { true })
        await client.emit("device_metrics", snapshot().telemetryProperties)
        await client.flush()
        XCTAssertEqual(transport.events.count, 1)
        XCTAssertEqual(transport.events.first?.event, "device_metrics")
    }
}
