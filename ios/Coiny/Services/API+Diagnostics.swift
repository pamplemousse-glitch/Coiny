import Foundation

/// A JSON value the encoder can emit without knowing its shape.
///
/// Exists because MetricKit's call stack tree is Apple's structure, not ours:
/// modelling it as `Codable` would mean chasing a shape they are free to change
/// in any OS release, and getting it wrong means dropping crash reports.
///
/// The alternative was a raw-`Data` POST helper on `API`. That was tried and
/// reverted: `API.baseURL` and `API.http` are `private`, so such a helper has to
/// live inside `API.swift`, and adding it there pushed the file past both the
/// file-length and type-body-length limits. Widening encapsulation to satisfy a
/// line count is the wrong trade; this keeps the seam in the caller instead.
enum JSONValue: Encodable, Sendable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSONValue])
    case object([String: JSONValue])

    /// Build from the output of `JSONSerialization.jsonObject`.
    ///
    /// `NSNumber` is checked for its boolean-ness before its numeric value:
    /// Foundation bridges `true` to an `NSNumber` that also answers to
    /// `doubleValue`, so testing numbers first would silently turn every `true`
    /// in Apple's tree into `1` and corrupt the stored payload.
    init(_ value: Any) {
        switch value {
        case let n as NSNumber:
            if CFGetTypeID(n) == CFBooleanGetTypeID() {
                self = .bool(n.boolValue)
            } else {
                self = .number(n.doubleValue)
            }
        case let s as String: self = .string(s)
        case let a as [Any]: self = .array(a.map(JSONValue.init))
        case let d as [String: Any]: self = .object(d.mapValues(JSONValue.init))
        default: self = .null
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .null: try container.encodeNil()
        case .bool(let v): try container.encode(v)
        case .number(let v):
            // Whole numbers encode as integers, so `"app_build": 321` does not
            // arrive as `321.0` and fail the server's `z.number().int()`.
            if v == v.rounded(), abs(v) < 9_007_199_254_740_992 {
                try container.encode(Int(v))
            } else {
                try container.encode(v)
            }
        case .string(let v): try container.encode(v)
        case .array(let v): try container.encode(v)
        case .object(let v): try container.encode(v)
        }
    }
}

/// What `POST /api/diagnostics` returns.
struct DiagnosticsResponse: Decodable, Equatable, Sendable {
    let accepted: Int
}

private struct DiagnosticsBatch: Encodable {
    let diagnostics: [JSONValue]
}

extension API {
    /// `POST /api/diagnostics` (G3.10). Separate from `sendTelemetry` because
    /// the payload is Apple's call stack tree, which cannot pass the analytics
    /// catalog's token regex and therefore has its own endpoint.
    @discardableResult
    func sendDiagnostics(_ reports: [CrashDiagnosticReport]) async throws -> DiagnosticsResponse {
        let body = DiagnosticsBatch(diagnostics: reports.map { JSONValue($0.wireDictionary) })
        return try await post("/api/diagnostics", body: body)
    }
}
