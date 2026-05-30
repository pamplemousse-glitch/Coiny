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
    private(set) var errorMessage: String?
    private(set) var lastSyncUpdated: Int?

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

    func removeWallet(_ wallet: NftWallet) async {
        wallets.removeAll { $0.id == wallet.id }
        do {
            try await api.removeNftWallet(address: wallet.address)
        } catch {
            errorMessage = error.localizedDescription
            await loadWallets()
        }
    }

    func sync() async {
        errorMessage = nil
        do {
            let result = try await api.syncNft()
            lastSyncUpdated = result.updated
            await loadWallets()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
