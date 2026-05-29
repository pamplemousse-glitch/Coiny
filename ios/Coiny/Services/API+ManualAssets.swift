import Foundation

// MARK: - Manual Assets DTOs

struct ManualAsset: Decodable, Identifiable {
    let id: Int
    let name: String
    let category: String
    let selfReportedValueUsd: Double
    let notes: String?
    let lastUpdatedAt: String
    let createdAt: String
}

struct ManualAssetCreateResult: Decodable {
    let ok: Bool
    let id: Int
}

// MARK: - Manual Assets API

extension API {
    func getManualAssets() async throws -> [ManualAsset] {
        try await get("/api/manual-assets")
    }

    func createManualAsset(name: String, category: String, valueUsd: Double, notes: String?) async throws -> ManualAssetCreateResult {
        struct Body: Encodable {
            let name: String
            let category: String
            let selfReportedValueUsd: Double
            let notes: String?
        }
        return try await post(
            "/api/manual-assets",
            body: Body(name: name, category: category, selfReportedValueUsd: valueUsd, notes: notes)
        )
    }

    func updateManualAsset(id: Int, name: String?, category: String?, valueUsd: Double?, notes: String?) async throws {
        struct Body: Encodable {
            let name: String?
            let category: String?
            let selfReportedValueUsd: Double?
            let notes: String?
        }
        let _: EmptyResponse = try await patch(
            "/api/manual-assets/\(id)",
            body: Body(name: name, category: category, selfReportedValueUsd: valueUsd, notes: notes)
        )
    }

    func deleteManualAsset(id: Int) async throws {
        try await deleteVoid("/api/manual-assets/\(id)")
    }
}
