import Foundation
import XCTest
@testable import Coiny

/// `MXDiagnosticPayload` has no public initialiser, so the payload-to-report
/// extraction cannot be unit tested. That is exactly why the signature and the
/// wire shape are separated out: those are what can be silently wrong in a way
/// nobody notices until the data is useless.
final class CrashDiagnosticsTests: XCTestCase {
    /// A call stack shaped the way MetricKit serialises one.
    private func tree(binary: String, offsets: [Int], address: Int, sampleCount: Int) -> [String: Any] {
        [
            "callStacks": [
                [
                    "threadAttributed": true,
                    "callStackRootFrames": offsets.map { offset in
                        [
                            "binaryName": binary,
                            "offsetIntoBinaryTextSegment": offset,
                            "address": address,
                            "sampleCount": sampleCount,
                            "binaryUUID": "A1B2C3D4-5E6F-7890-ABCD-EF1234567890",
                        ] as [String: Any]
                    },
                ] as [String: Any],
            ],
        ]
    }

    // MARK: - Grouping

    func testTheSameCrashTwiceProducesTheSameSignature() {
        // The entire point. Without this, "47 crashes" never becomes
        // "one crash, 47 times", and the table is a pile of singletons.
        let a = CrashDiagnosticReport.signature(forCallStack: tree(binary: "Coiny", offsets: [100, 200], address: 1, sampleCount: 1))
        let b = CrashDiagnosticReport.signature(forCallStack: tree(binary: "Coiny", offsets: [100, 200], address: 1, sampleCount: 1))
        XCTAssertEqual(a, b)
    }

    func testTheADDRESSDoesNotChangeTheSignature() {
        // ASLR moves the absolute address between runs. If it were hashed, two
        // instances of the identical crash would never group, and the grouping
        // would be worthless in exactly the case it exists for.
        let a = CrashDiagnosticReport.signature(forCallStack: tree(binary: "Coiny", offsets: [100], address: 0x1000, sampleCount: 1))
        let b = CrashDiagnosticReport.signature(forCallStack: tree(binary: "Coiny", offsets: [100], address: 0x9999, sampleCount: 1))
        XCTAssertEqual(a, b, "address is not stable across runs and must not be part of the signature")
    }

    func testTheSAMPLECOUNTDoesNotChangeTheSignature() {
        let a = CrashDiagnosticReport.signature(forCallStack: tree(binary: "Coiny", offsets: [100], address: 1, sampleCount: 1))
        let b = CrashDiagnosticReport.signature(forCallStack: tree(binary: "Coiny", offsets: [100], address: 1, sampleCount: 97))
        XCTAssertEqual(a, b)
    }

    func testADIFFERENTCODEPATHProducesADifferentSignature() {
        // The other half: over-grouping would merge unrelated crashes into one
        // row and hide the second bug entirely.
        let a = CrashDiagnosticReport.signature(forCallStack: tree(binary: "Coiny", offsets: [100], address: 1, sampleCount: 1))
        let b = CrashDiagnosticReport.signature(forCallStack: tree(binary: "Coiny", offsets: [999], address: 1, sampleCount: 1))
        XCTAssertNotEqual(a, b)
    }

    func testADifferentBinaryProducesADifferentSignature() {
        let a = CrashDiagnosticReport.signature(forCallStack: tree(binary: "Coiny", offsets: [100], address: 1, sampleCount: 1))
        let b = CrashDiagnosticReport.signature(forCallStack: tree(binary: "LinkKit", offsets: [100], address: 1, sampleCount: 1))
        XCTAssertNotEqual(a, b)
    }

    func testTheSignatureMatchesTheServersRegex() {
        // api/diagnostics.ts constrains this to /^[a-f0-9]{16,64}$/, so a
        // format change here 400s the whole batch.
        let s = CrashDiagnosticReport.signature(forCallStack: tree(binary: "Coiny", offsets: [1], address: 1, sampleCount: 1))
        XCTAssertEqual(s.count, 32)
        XCTAssertNotNil(s.range(of: "^[a-f0-9]{16,64}$", options: .regularExpression), "signature '\(s)' fails the server regex")
    }

    func testAnEmptyStackStillProducesAValidSignature() {
        let s = CrashDiagnosticReport.signature(forCallStack: [:])
        XCTAssertNotNil(s.range(of: "^[a-f0-9]{16,64}$", options: .regularExpression))
    }

    // MARK: - Wire shape

    private func report(kind: CrashDiagnosticReport.Kind = .crash) -> CrashDiagnosticReport {
        let json = tree(binary: "Coiny", offsets: [100], address: 1, sampleCount: 1)
        let data = try! JSONSerialization.data(withJSONObject: json)
        return CrashDiagnosticReport(
            kind: kind,
            appBuild: 321,
            osMajor: 26,
            signature: CrashDiagnosticReport.signature(forCallStack: json),
            callStackJSON: data
        )
    }

    func testWireKeysAreExactlyWhatTheServerAccepts() {
        // DiagnosticSchema is a strictObject: one extra key is a 400 for the
        // whole batch, and there is no partial-acceptance path on this route.
        let keys = Set(report().wireDictionary.keys)
        XCTAssertEqual(keys, ["kind", "app_build", "os_major", "signature", "call_stack"])
    }

    func testOptionalMachFieldsAreOmittedRatherThanNull() {
        XCTAssertNil(report().wireDictionary["exception_type"])
    }

    func testMachFieldsAreCarriedWhenPresent() {
        var r = report()
        r.exceptionType = 1
        r.exceptionCode = 0
        r.signal = 11
        let wire = r.wireDictionary
        XCTAssertEqual(wire["exception_type"] as? Int, 1)
        XCTAssertEqual(wire["signal"] as? Int, 11)
    }

    func testTheKindsMatchTheServersEnum() {
        XCTAssertEqual(CrashDiagnosticReport.Kind.crash.rawValue, "crash")
        XCTAssertEqual(CrashDiagnosticReport.Kind.diskWrite.rawValue, "disk_write")
        XCTAssertEqual(CrashDiagnosticReport.Kind.cpuException.rawValue, "cpu_exception")
        XCTAssertEqual(CrashDiagnosticReport.Kind.appLaunch.rawValue, "app_launch")
    }

    func testTheCallStackSurvivesTheRoundTrip() {
        let wire = report().wireDictionary
        let stack = wire["call_stack"] as? [String: Any]
        XCTAssertNotNil(stack?["callStacks"], "the tree must reach the wire intact, not as an empty object")
    }

    func testTheWholeEnvelopeIsSerializable() {
        // JSONSerialization throws on a non-JSON value, and the upload builds
        // the body this way. A type that cannot serialise would fail at runtime
        // on a real crash, which is the worst possible moment to find out.
        let body = ["diagnostics": [report().wireDictionary]]
        XCTAssertNoThrow(try JSONSerialization.data(withJSONObject: body))
    }

    // MARK: - What must never be sent

    func testNoFreeFormFieldReachesTheWire() {
        // terminationReason, virtualMemoryRegionInfo and
        // exceptionReason.composedMessage are the only free-form strings
        // MetricKit exposes, and the privacy manifest's claim that the trace
        // carries no user data depends on none of them being here.
        let wire = report().wireDictionary
        for forbidden in ["termination_reason", "terminationReason", "virtual_memory_region_info",
                          "virtualMemoryRegionInfo", "exception_reason", "exceptionReason",
                          "composedMessage"] {
            XCTAssertNil(wire[forbidden], "\(forbidden) must never be transmitted")
        }
    }
}
