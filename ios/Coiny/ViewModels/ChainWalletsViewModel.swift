import Foundation
import Observation

protocol ChainWalletsViewModelAPI: Sendable {
    func getChainWallets() async throws -> [ChainWallet]
    func addChainWallet(chain: String, address: String, label: String?) async throws
    func removeChainWallet(chain: String, address: String) async throws
    func syncChainWallets() async throws -> ChainWalletSyncResult
}

extension API: ChainWalletsViewModelAPI {}

@Observable
@MainActor
final class ChainWalletsViewModel {
    static let supportedChains: [(id: String, display: String)] = [
        ("bitcoin", "Bitcoin (BTC)"),
        ("xrp", "XRP"),
        ("stellar", "Stellar (XLM)"),
        ("doge", "Dogecoin (DOGE)"),
        ("ltc", "Litecoin (LTC)"),
        ("bch", "Bitcoin Cash (BCH)"),
        ("cosmos", "Cosmos (ATOM)"),
        ("osmosis", "Osmosis (OSMO)"),
    ]

    private(set) var wallets: [ChainWallet] = []
    private(set) var isSyncing = false
    private(set) var lastSyncUpdated: Int?
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    private let api: any ChainWalletsViewModelAPI

    init(api: any ChainWalletsViewModelAPI = API.shared) {
        self.api = api
    }

    func loadWallets() async {
        isLoading = true
        errorMessage = nil
        do {
            wallets = try await api.getChainWallets()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func addWallet(chain: String, address: String, label: String?) async {
        guard !address.isEmpty else { return }
        errorMessage = nil
        do {
            try await api.addChainWallet(chain: chain, address: address, label: label)
            wallets = try await api.getChainWallets()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeWallet(chain: String, address: String) async {
        errorMessage = nil
        do {
            try await api.removeChainWallet(chain: chain, address: address)
            wallets.removeAll { $0.chain == chain && $0.address == address }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sync() async {
        isSyncing = true
        errorMessage = nil
        do {
            let result = try await api.syncChainWallets()
            lastSyncUpdated = result.updated
            wallets = try await api.getChainWallets()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSyncing = false
    }
}
