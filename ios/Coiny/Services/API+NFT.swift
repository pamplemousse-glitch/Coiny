import Foundation

// MARK: - NFT Wallet DTOs

struct NftWallet: Decodable, Identifiable {
    let id: Int
    let address: String
    let label: String?
    let lastValueUsd: Double?
    let lastSyncedAt: String?
    let createdAt: String
}

struct NftSyncResult: Decodable {
    let updated: Int
}

// MARK: - NFT API

extension API {
    func getNftWallets() async throws -> [NftWallet] {
        try await get("/api/nft/wallets")
    }

    func addNftWallet(address: String, label: String?) async throws {
        struct Body: Encodable { let address: String; let label: String? }
        let _: EmptyResponse = try await post("/api/nft/wallets", body: Body(address: address, label: label))
    }

    func removeNftWallet(address: String) async throws {
        try await deleteVoid("/api/nft/wallets/\(address)")
    }

    func syncNft() async throws -> NftSyncResult {
        try await post("/api/nft/sync")
    }
}
