import Foundation

// Chain wallets (`backend/src/api/chain-wallets.ts`).
// Moved out of API.swift to keep that file under SwiftLint file_length;
// it was already an extension, so nothing about its behaviour changes.

// the actor still run on the actor.
extension API {
    func getChainWallets() async throws -> [ChainWallet] {
        try await get("/api/chain-wallets")
    }

    func addChainWallet(chain: String, address: String, label: String?) async throws {
        struct Body: Encodable { let chain: String; let address: String; let label: String? }
        let _: EmptyResponse = try await post("/api/chain-wallets", body: Body(chain: chain, address: address, label: label))
    }

    func removeChainWallet(chain: String, address: String) async throws {
        try await deleteVoid("/api/chain-wallets/\(chain)/\(encodePathComponent(address))")
    }

    func syncChainWallets() async throws -> ChainWalletSyncResult {
        try await post("/api/chain-wallets/sync")
    }

    private func encodePathComponent(_ s: String) -> String {
        s.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? s
    }

    func health() async throws -> HealthResponse {
        try await request(method: "GET", path: "/health", body: Optional<Empty>.none, requiresAuth: false)
    }
}
