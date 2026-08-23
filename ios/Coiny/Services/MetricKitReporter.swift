import Foundation
import MetricKit
import os

// G3.10: field performance data without a vendor SDK.
//
// MetricKit is a system framework, so this adds no vendor, no dependency and no
// DPA, which is what makes it the only crash/performance route compatible with
// PRD section 24 (see 04-performance-reliability 4.13.1 and 4.13.7).
//
// WHAT THIS DELIBERATELY DOES NOT DO: post the payload. The runbook,
// 4.13.3 and launch-gap-analysis section 7 all describe posting
// `MXMetricPayload` to `/api/telemetry` directly. That endpoint's catalog
// (backend/src/analytics/events.ts) accepts only flat objects whose strings
// match a lowercase token regex, and rejects unknown keys rather than stripping
// them. That is not an oversight to work around: it is the control that keeps
// merchant names and emails out of analytics by construction. So each payload
// is reduced HERE to the bounded scalars the `device_metrics` schema declares,
// and the raw payload never leaves the device.
//
// Consent: emission goes through `TelemetryClient`, which drops everything
// before the first sign-in and while the Settings toggle is off. A payload that
// arrives on a launch where consent has not been given is discarded, not held.

// MARK: - Snapshot

/// The PII-free reduction of one `MXMetricPayload`, matching the server's
/// `device_metrics` schema field for field.
///
/// Separate from the extraction below so the mapping is testable: `MXMetricPayload`
/// has no public initialiser, so a test can reach this type but never a payload.
///
/// Every metric is optional because MetricKit omits whole sections when it has
/// nothing to report for them. Absent means "not reported", never zero, and the
/// server schema keeps them optional for the same reason.
struct DeviceMetricsSnapshot: Equatable, Sendable {
    var appBuild: Int
    var osMajor: Int
    // Defaulted so the memberwise initialiser can be called with only the two
    // required fields, which is the shape every test and every partial payload
    // actually has.
    var launchMsAvg: Int?
    var hangMsAvg: Int?
    var peakMemoryMB: Int?
    var cpuMs: Int?
    var scrollHitchPPM: Int?
    var exitNormal: Int?
    var exitAbnormal: Int?
    var exitMemoryLimit: Int?
    var exitWatchdog: Int?
    var exitBadAccess: Int?
    var exitIllegalInstruction: Int?

    init(
        appBuild: Int,
        osMajor: Int,
        launchMsAvg: Int? = nil,
        hangMsAvg: Int? = nil,
        peakMemoryMB: Int? = nil,
        cpuMs: Int? = nil,
        scrollHitchPPM: Int? = nil,
        exitNormal: Int? = nil,
        exitAbnormal: Int? = nil,
        exitMemoryLimit: Int? = nil,
        exitWatchdog: Int? = nil,
        exitBadAccess: Int? = nil,
        exitIllegalInstruction: Int? = nil
    ) {
        self.appBuild = appBuild
        self.osMajor = osMajor
        self.launchMsAvg = launchMsAvg
        self.hangMsAvg = hangMsAvg
        self.peakMemoryMB = peakMemoryMB
        self.cpuMs = cpuMs
        self.scrollHitchPPM = scrollHitchPPM
        self.exitNormal = exitNormal
        self.exitAbnormal = exitAbnormal
        self.exitMemoryLimit = exitMemoryLimit
        self.exitWatchdog = exitWatchdog
        self.exitBadAccess = exitBadAccess
        self.exitIllegalInstruction = exitIllegalInstruction
    }

    /// The wire properties. Clamped to the server's declared bounds here rather
    /// than discovered as a rejection in production: `validateClientEvent` fails
    /// the whole event on an out-of-range number, and a pathological launch time
    /// is exactly the sample worth keeping rather than dropping.
    var telemetryProperties: [String: TelemetryValue] {
        var properties: [String: TelemetryValue] = [
            "app_build": .int(min(max(appBuild, 0), 10_000_000)),
            "os_major": .int(min(max(osMajor, 15), 99)),
        ]
        func put(_ key: String, _ value: Int?, max upper: Int) {
            guard let value else { return }
            properties[key] = .int(min(Swift.max(value, 0), upper))
        }
        put("launch_ms_avg", launchMsAvg, max: 600_000)
        put("hang_ms_avg", hangMsAvg, max: 600_000)
        put("peak_memory_mb", peakMemoryMB, max: 65_536)
        put("cpu_ms", cpuMs, max: 86_400_000)
        put("scroll_hitch_ppm", scrollHitchPPM, max: 1_000_000)
        put("exit_normal", exitNormal, max: 100_000)
        put("exit_abnormal", exitAbnormal, max: 100_000)
        put("exit_memory_limit", exitMemoryLimit, max: 100_000)
        put("exit_watchdog", exitWatchdog, max: 100_000)
        put("exit_bad_access", exitBadAccess, max: 100_000)
        put("exit_illegal_instruction", exitIllegalInstruction, max: 100_000)
        return properties
    }

    /// Major version out of an `MXMetaData.osVersion` string, which looks like
    /// `"iPhone OS 26.5 (23F79)"`. Returns nil rather than a wrong number when
    /// the shape is not what we expect, because the server clamps to 15...99 and
    /// a fabricated major would silently misattribute every metric in the row.
    static func osMajor(fromOSVersion version: String) -> Int? {
        // First run of digits immediately followed by a '.', i.e. the major of
        // the first dotted version in the string. The build number in
        // parentheses ("23F79") has no dot, so it cannot match.
        //
        // Written as an explicit scan rather than with Scanner: setting
        // `charactersToBeSkipped` to the inverse of the digits makes Scanner
        // skip the '.' as whitespace before `scanString(".")` can match it, so
        // the separator is never seen and every version parses as nil. The unit
        // tests below caught that; the shape looked correct in review.
        var digits = ""
        for character in version {
            if character.isNumber {
                digits.append(character)
            } else if character == ".", !digits.isEmpty {
                return Int(digits)
            } else {
                digits = ""
            }
        }
        return nil
    }
}

// MARK: - Extraction

extension DeviceMetricsSnapshot {
    /// Reduce one payload. Returns nil when the payload carries neither an app
    /// build nor a parseable OS version, since without both a number cannot be
    /// attributed to a build and the row is only noise.
    init?(payload: MXMetricPayload) {
        guard let metaData = payload.metaData,
              let appBuild = Int(metaData.applicationBuildVersion),
              let osMajor = Self.osMajor(fromOSVersion: metaData.osVersion)
        else { return nil }

        self.appBuild = appBuild
        self.osMajor = osMajor
        launchMsAvg = payload.applicationLaunchMetrics
            .map { Self.weightedMeanMilliseconds($0.histogrammedTimeToFirstDraw) } ?? nil
        hangMsAvg = payload.applicationResponsivenessMetrics
            .map { Self.weightedMeanMilliseconds($0.histogrammedApplicationHangTime) } ?? nil
        peakMemoryMB = payload.memoryMetrics
            .map { Int($0.peakMemoryUsage.converted(to: .megabytes).value.rounded()) }
        cpuMs = payload.cpuMetrics
            .map { Int($0.cumulativeCPUTime.converted(to: .milliseconds).value.rounded()) }
        // scrollHitchTimeRatio is a dimensionless ratio; the catalog carries
        // integers, so it travels as parts per million.
        scrollHitchPPM = payload.animationMetrics
            .map { Int(($0.scrollHitchTimeRatio.value * 1_000_000).rounded()) }

        // Foreground only. A background exit is the system reclaiming a
        // suspended app, which is normal housekeeping rather than a user-visible
        // failure, so mixing the two would bury the crashes in noise.
        let exits = payload.applicationExitMetrics?.foregroundExitData
        exitNormal = exits.map { Int($0.cumulativeNormalAppExitCount) }
        exitAbnormal = exits.map { Int($0.cumulativeAbnormalExitCount) }
        exitMemoryLimit = exits.map { Int($0.cumulativeMemoryResourceLimitExitCount) }
        exitWatchdog = exits.map { Int($0.cumulativeAppWatchdogExitCount) }
        exitBadAccess = exits.map { Int($0.cumulativeBadAccessExitCount) }
        exitIllegalInstruction = exits.map { Int($0.cumulativeIllegalInstructionExitCount) }
    }

    /// Bucket-weighted mean of a duration histogram, in whole milliseconds.
    ///
    /// MXHistogram exposes buckets, not quantiles, so a true p50 is not
    /// available without assuming a distribution inside each bucket. The mean of
    /// the bucket midpoints is enough to trend a regression across builds and is
    /// named `_avg` rather than `_p50` so nobody reads it as a percentile.
    ///
    /// Returns nil for an empty histogram, which is how MetricKit represents a
    /// period during which the event never occurred.
    static func weightedMeanMilliseconds(_ histogram: MXHistogram<UnitDuration>) -> Int? {
        var totalCount = 0
        var weightedSum = 0.0
        for case let bucket as MXHistogramBucket<UnitDuration> in histogram.bucketEnumerator {
            let start = bucket.bucketStart.converted(to: .milliseconds).value
            let end = bucket.bucketEnd.converted(to: .milliseconds).value
            weightedSum += ((start + end) / 2) * Double(bucket.bucketCount)
            totalCount += Int(bucket.bucketCount)
        }
        guard totalCount > 0 else { return nil }
        return Int((weightedSum / Double(totalCount)).rounded())
    }
}

// MARK: - Subscriber

/// Receives MetricKit's daily payload and emits one `device_metrics` per
/// payload.
///
/// `@unchecked Sendable` is accurate rather than a suppression: the only stored
/// property is a `let` reference to an actor, and `didReceive` is documented to
/// arrive on a background queue, so the object genuinely crosses threads and
/// genuinely has no mutable state for them to race over. `MXMetricManagerSubscriber`
/// is a nonisolated NSObject protocol, so it cannot be satisfied by a
/// `@MainActor` type.
final class MetricKitReporter: NSObject, MXMetricManagerSubscriber, @unchecked Sendable {
    private static let logger = Logger(subsystem: "app.coiny.ios", category: "metrickit")
    /// Separate category so a crash is greppable apart from the daily metrics.
    static let diagnosticsLogger = Logger(subsystem: "app.coiny.ios", category: "metrickit.diagnostics")

    private let client: TelemetryClient

    init(client: TelemetryClient = .shared) {
        self.client = client
        super.init()
    }

    /// Subscribe. Safe to call once per launch; MetricKit delivers at most once
    /// a day and only while at least one subscriber is registered.
    func start() {
        MXMetricManager.shared.add(self)
    }

    func didReceive(_ payloads: [MXMetricPayload]) {
        // The payload is reduced synchronously, before any hop, so the
        // non-Sendable MXMetricPayload never crosses an isolation boundary.
        let snapshots = payloads.compactMap(DeviceMetricsSnapshot.init(payload:))
        if snapshots.count < payloads.count {
            Self.logger.error(
                "dropped \(payloads.count - snapshots.count, privacy: .public) MetricKit payload(s): no build or OS version"
            )
        }
        let client = self.client
        Task {
            for snapshot in snapshots {
                await client.emit("device_metrics", snapshot.telemetryProperties)
            }
            // Daily cadence, so waiting for the 25-event flush threshold could
            // hold a payload for weeks.
            await client.flush()
        }
    }
}
