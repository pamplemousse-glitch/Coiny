import Foundation
import Observation

protocol ZerionViewModelAPI: Sendable {
    func getZerionWallets() async throws -> [ZerionWallet]
    func addZerionWallet(address: String, label: String?) async throws -> ZerionWallet
    func removeZerionWallet(address: String) async throws
    func getZerionPortfolio() async throws -> ZerionPortfolio
    func syncZerion() async throws -> SyncResult
}

extension API: ZerionViewModelAPI {}

@Observable
@MainActor
final class ZerionViewModel {
    private(set) var wallets: [ZerionWallet] = []
    private(set) var portfolio: ZerionPortfolio?
    private(set) var isSyncing = false
    private(set) var lastSyncReacted: Int?
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    private let api: any ZerionViewModelAPI

    init(api: any ZerionViewModelAPI = API.shared) {
        self.api = api
    }

    func loadWallets() async {
        isLoading = true
        errorMessage = nil
        do {
            wallets = try await api.getZerionWallets()
            portfolio = try? await api.getZerionPortfolio()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func addWallet(address: String, label: String?) async {
        guard !address.isEmpty else { return }
        errorMessage = nil
        do {
            let wallet = try await api.addZerionWallet(address: address, label: label)
            wallets.append(wallet)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeWallet(at offsets: IndexSet) async {
        let toRemove = offsets.map { wallets[$0] }
        for wallet in toRemove {
            do {
                try await api.removeZerionWallet(address: wallet.address)
                wallets.removeAll { $0.id == wallet.id }
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    func sync() async {
        isSyncing = true
        errorMessage = nil
        do {
            let result = try await api.syncZerion()
            lastSyncReacted = result.reacted
        } catch {
            errorMessage = error.localizedDescription
        }
        isSyncing = false
    }
}
