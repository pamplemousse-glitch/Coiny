import Foundation

protocol NftViewModelAPI: Sendable {
    func getNftWallets() async throws -> [NftWallet]
    func addNftWallet(address: String, label: String?) async throws
    func removeNftWallet(address: String) async throws
    func syncNft() async throws -> NftSyncResult
}

extension API: NftViewModelAPI {}

@Observable @MainActor final class NftViewModel {
    private(set) var wallets: [NftWallet] = []
    private(set) var isLoading = false
    private(set) var isSyncing = false
    private(set) var errorMessage: String?

    private let api: any NftViewModelAPI

    init(api: any NftViewModelAPI = API.shared) {
        self.api = api
    }

    func loadWallets() async {
        isLoading = true
        errorMessage = nil
        do {
            wallets = try await api.getNftWallets()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func addWallet(address: String, label: String?) async {
        guard !address.isEmpty else { return }
        errorMessage = nil
        do {
            try await api.addNftWallet(address: address, label: label)
            await loadWallets()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeWallet(address: String) async {
        errorMessage = nil
        do {
            try await api.removeNftWallet(address: address)
            wallets.removeAll { $0.address == address }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sync() async {
        isSyncing = true
        errorMessage = nil
        do {
            _ = try await api.syncNft()
            await loadWallets()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSyncing = false
    }
}
