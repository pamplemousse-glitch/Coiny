import Foundation

// The declared-assets transport (PRD R-5.3). The server is the durable home
// for the onboarding declaration sheet; `DeclaredAssetsStore` stays the
// on-device cache so onboarding works offline and the number never waits on
// a network write (R-5.1).

// MARK: - DTOs

/// One declared line as the server stores it.
struct DeclaredAssetLineDTO: Decodable, Equatable, Sendable {
    let assetClass: String
    let bucketedValueUsd: Double?
    let confidence: String
    let declaredAt: Date
    let refreshedAt: Date
}

/// The R-5.4 nudge candidate the server computes: the stalest valued line 60
/// or more days since last touch. Display throttling is the client's job.
struct DeclaredAssetNudge: Decodable, Equatable, Sendable {
    let assetClass: String
    let ageDays: Int
}

struct DeclaredSheetResponse: Decodable, Sendable {
    let assets: [DeclaredAssetLineDTO]
    let nudge: DeclaredAssetNudge?
}

/// PUT body line. The server schema is strict: exactly these keys, and
/// `bucketedValueUsd` must be present (an explicit JSON null for a skipped
/// amount), which is why this encodes by hand; the synthesized encoder would
/// drop the key for nil and the whole sheet would be rejected.
struct DeclaredAssetPutLine: Encodable, Equatable, Sendable {
    let assetClass: String
    let bucketedValueUsd: Double?
    let declaredAt: String

    private enum CodingKeys: String, CodingKey {
        case assetClass, bucketedValueUsd, declaredAt
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(assetClass, forKey: .assetClass)
        if let bucketedValueUsd {
            try container.encode(bucketedValueUsd, forKey: .bucketedValueUsd)
        } else {
            try container.encodeNil(forKey: .bucketedValueUsd)
        }
        try container.encode(declaredAt, forKey: .declaredAt)
    }
}

// MARK: - Model conversions

extension DeclaredAssetClass {
    /// The stable snake_case token the server stores; identical to the
    /// telemetry key by design so one vocabulary exists.
    var serverKey: String { telemetryKey }

    init?(serverKey: String) {
        guard let match = DeclaredAssetClass.allCases.first(where: { $0.serverKey == serverKey }) else {
            return nil
        }
        self = match
    }
}

extension DeclarationSheet {
    /// Rebuilds a sheet from the server's lines (the fresh-install pull).
    /// Unknown classes from a newer server are dropped rather than crashing:
    /// an additive server change must not break an old client.
    init(serverLines: [DeclaredAssetLineDTO]) {
        let assets = serverLines.compactMap { line -> DeclaredAsset? in
            guard let cls = DeclaredAssetClass(serverKey: line.assetClass) else { return nil }
            return DeclaredAsset(
                assetClass: cls,
                bucketedValueUSD: line.bucketedValueUsd,
                declaredAt: line.declaredAt
            )
        }
        self.init(assets: assets)
    }

    /// The PUT body for this sheet.
    var putLines: [DeclaredAssetPutLine] {
        assets.map { asset in
            DeclaredAssetPutLine(
                assetClass: asset.assetClass.serverKey,
                bucketedValueUsd: asset.bucketedValueUSD,
                declaredAt: DeclaredAssetDates.iso(asset.declaredAt)
            )
        }
    }

    /// The newest moment the user touched any line, for latest-wins sync.
    var latestDeclaredAt: Date? {
        assets.map { $0.declaredAt }.max()
    }
}

enum DeclaredAssetDates {
    /// `ISO8601FormatStyle` is a Sendable value type; the `ISO8601DateFormatter`
    /// this replaces is a reference type with mutable `formatOptions`, so a
    /// shared static instance of it is not concurrency-safe under Swift 6
    /// isolation checking even though it was only ever configured once.
    ///
    /// The wire format is unchanged: `.iso8601` and `.withInternetDateTime`
    /// were verified to produce byte-identical strings, including the `Z`
    /// suffix the backend's `z.iso.datetime({ offset: true })` requires.
    static func iso(_ date: Date) -> String {
        date.formatted(.iso8601)
    }
}

// MARK: - Endpoints

extension API {
    func getDeclaredAssets() async throws -> DeclaredSheetResponse {
        try await get("/api/declared-assets")
    }

    @discardableResult
    func putDeclaredAssets(_ sheet: DeclarationSheet) async throws -> DeclaredSheetResponse {
        struct Body: Encodable {
            let assets: [DeclaredAssetPutLine]
        }
        return try await put("/api/declared-assets", body: Body(assets: sheet.putLines))
    }
}
