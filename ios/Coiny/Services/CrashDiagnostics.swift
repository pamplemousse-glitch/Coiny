import CryptoKit
import Foundation
import MetricKit
import os

// The diagnostic half of G3.10: crash and hang reports with call stacks.
//
// The metric half (MetricKitReporter.swift) answers "how often did it crash".
// This answers "where", which is the half that is actionable. The founder
// approved both Diagnostics label lines together on 2026-08-23 so the privacy
// trio moved once; the code arrives in two PRs.
//
// ---------------------------------------------------------------------------
// What is sent, and what is dropped ON THIS DEVICE
// ---------------------------------------------------------------------------
//
// SENT: `MXCallStackTree.JSONRepresentation`, which per its own header carries
// binary image name, binary UUID, offset in the binary text segment, address
// and sample count. It is UNSYMBOLICATED. There are no function names and no
// file paths in it, and it is useless to anyone without our dSYM. Plus the
// exception type, code and signal, which are integers from
// sys/exception_types.h and sys/signal.h.
//
// DROPPED, and never transmitted:
//
//   - `terminationReason`, a free-form string
//   - `virtualMemoryRegionInfo`, a free-form string
//   - `exceptionReason`, whose `composedMessage`, `formatString` and
//     `arguments` can carry app-supplied text. Apple's header says it "may have
//     some pieces redacted to avoid exposing sensitive user data". May, and
//     some. That is not a guarantee to build a privacy claim on, and an
//     assertion message can interpolate anything the app had in hand.
//
// These are the only free-form fields MetricKit exposes, so dropping all three
// is what lets the privacy manifest say the trace carries no user data without
// hedging. The server rejects them a second time (api/diagnostics.ts), because
// a control that exists in one place is one refactor from not existing.

/// One diagnostic, reduced to what may leave the device.
struct CrashDiagnosticReport: Equatable, Sendable {
    enum Kind: String, Sendable {
        case crash
        case hang
        case diskWrite = "disk_write"
        case cpuException = "cpu_exception"
        case appLaunch = "app_launch"
    }

    var kind: Kind
    var appBuild: Int
    var osMajor: Int
    /// Stable grouping key. See `signature(forCallStack:)`.
    var signature: String
    var exceptionType: Int?
    var exceptionCode: Int?
    var signal: Int?
    /// The unsymbolicated call stack tree, as Apple serialised it.
    ///
    /// Held as `Data` rather than `[String: Any]` because this type is
    /// `Sendable` and `Any` is not: the report is built on MetricKit's
    /// background queue and then crosses into a Task to be uploaded. Keeping
    /// the dictionary would be a data-race warning under
    /// SWIFT_STRICT_CONCURRENCY complete, and correctly so.
    var callStackJSON: Data
}

extension CrashDiagnosticReport {
    /// SHA-256 over the call stack's STRUCTURE, truncated to 32 hex characters.
    ///
    /// This is what turns "47 crashes" into "one crash, 47 times", which is the
    /// difference between a number and a lead. Computed on device so the server
    /// never needs to parse Apple's tree to group anything.
    ///
    /// Hashing the serialized JSON verbatim would NOT work: it includes
    /// `sampleCount` and absolute `address` values that differ between two
    /// occurrences of the identical crash, so every instance would hash
    /// differently and the grouping would be worthless. The digest therefore
    /// covers binary name plus text-segment offset per frame, which are stable
    /// for the same code path in the same build.
    static func signature(forCallStack json: [String: Any]) -> String {
        var parts: [String] = []

        func walk(_ node: Any) {
            if let dict = node as? [String: Any] {
                // Frame identity: which binary, and how far into it. Both survive
                // ASLR; the raw `address` does not, which is why it is excluded.
                if let binary = dict["binaryName"] as? String {
                    let offset = (dict["offsetIntoBinaryTextSegment"] as? NSNumber)?.stringValue ?? "?"
                    parts.append("\(binary)+\(offset)")
                }
                for key in dict.keys.sorted() where key != "address" && key != "sampleCount" {
                    walk(dict[key] as Any)
                }
            } else if let array = node as? [Any] {
                for element in array { walk(element) }
            }
        }
        walk(json)

        let digest = SHA256.hash(data: Data(parts.joined(separator: "|").utf8))
        return digest.map { String(format: "%02x", $0) }.joined().prefix(32).lowercased()
    }

    /// The wire form. Mirrors `DiagnosticSchema` in api/diagnostics.ts, which is
    /// a `strictObject`: an extra key here is a 400 for the whole batch.
    var wireDictionary: [String: Any] {
        // Parsed back here rather than stored: see `callStackJSON`. An
        // unparseable blob becomes an empty object rather than failing the
        // whole batch, because losing one report is better than losing the
        // batch that carried it.
        let stack = (try? JSONSerialization.jsonObject(with: callStackJSON)) as? [String: Any] ?? [:]
        var body: [String: Any] = [
            "kind": kind.rawValue,
            "app_build": appBuild,
            "os_major": osMajor,
            "signature": signature,
            "call_stack": stack,
        ]
        if let exceptionType { body["exception_type"] = exceptionType }
        if let exceptionCode { body["exception_code"] = exceptionCode }
        if let signal { body["signal"] = signal }
        return body
    }
}

// MARK: - Extraction

extension CrashDiagnosticReport {
    /// Everything sendable out of one payload, across all five diagnostic types.
    ///
    /// Split into `crashReports` and `stackOnlyReports` rather than one switch:
    /// crashes carry Mach exception fields that the other four do not, and a
    /// single function covering all five trips SwiftLint's cyclomatic-complexity
    /// rule. The rule is right here, since the two halves genuinely differ.
    static func reports(from payload: MXDiagnosticPayload) -> [CrashDiagnosticReport] {
        crashReports(from: payload) + stackOnlyReports(from: payload)
    }

    /// Crashes, which are the only kind with an exception type, code and signal.
    private static func crashReports(from payload: MXDiagnosticPayload) -> [CrashDiagnosticReport] {
        (payload.crashDiagnostics ?? []).compactMap { crash in
            guard var report = make(.crash, crash.metaData, crash.callStackTree) else { return nil }
            report.exceptionType = crash.exceptionType?.intValue
            report.exceptionCode = crash.exceptionCode?.intValue
            report.signal = crash.signal?.intValue
            // crash.terminationReason, .virtualMemoryRegionInfo and
            // .exceptionReason are deliberately NOT read. See the file header.
            return report
        }
    }

    /// Hangs, disk-write and CPU exceptions, and launch diagnostics: all four
    /// carry a call stack and nothing else this sends.
    private static func stackOnlyReports(from payload: MXDiagnosticPayload) -> [CrashDiagnosticReport] {
        var out: [CrashDiagnosticReport] = []
        out += (payload.hangDiagnostics ?? []).compactMap { make(.hang, $0.metaData, $0.callStackTree) }
        out += (payload.diskWriteExceptionDiagnostics ?? []).compactMap {
            make(.diskWrite, $0.metaData, $0.callStackTree)
        }
        out += (payload.cpuExceptionDiagnostics ?? []).compactMap {
            make(.cpuException, $0.metaData, $0.callStackTree)
        }
        if #available(iOS 16.0, *) {
            out += (payload.appLaunchDiagnostics ?? []).compactMap {
                make(.appLaunch, $0.metaData, $0.callStackTree)
            }
        }
        return out
    }

    private static func make(_ kind: Kind, _ metaData: MXMetaData?, _ tree: MXCallStackTree) -> CrashDiagnosticReport? {
        guard let metaData,
              let appBuild = Int(metaData.applicationBuildVersion),
              let osMajor = DeviceMetricsSnapshot.osMajor(fromOSVersion: metaData.osVersion),
              let data = tree.jsonRepresentation() as Data?,
              let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        else { return nil }

        return CrashDiagnosticReport(
            kind: kind,
            appBuild: appBuild,
            osMajor: osMajor,
            signature: signature(forCallStack: json),
            callStackJSON: data
        )
    }
}

// MARK: - Subscriber

extension MetricKitReporter {
    /// MetricKit's diagnostic callback. Same subscriber registration as the
    /// metric half; this is the second of the protocol's two optional methods.
    nonisolated func didReceive(_ payloads: [MXDiagnosticPayload]) {
        // Reduced synchronously, before any hop, so the non-Sendable payload
        // never crosses an isolation boundary.
        let reports = payloads.flatMap(CrashDiagnosticReport.reports(from:))
        guard !reports.isEmpty else { return }

        Self.diagnosticsLogger.error(
            "metrickit delivered \(reports.count, privacy: .public) diagnostic(s)"
        )

        Task {
            // Consent is enforced here rather than by TelemetryClient, because
            // this does not go through the event queue: the payload is far too
            // large for a batch of analytics events and has its own endpoint.
            guard TelemetryConsent.isGranted else { return }
            do {
                try await API.shared.sendDiagnostics(reports)
            } catch {
                // Dropped, not retried. MetricKit re-delivers nothing, so a
                // retry queue here would need its own on-disk store holding
                // crash data, which is more privacy surface than the report is
                // worth. A crash that matters will recur.
                Self.diagnosticsLogger.error("diagnostics upload failed; dropping the batch")
            }
        }
    }
}
