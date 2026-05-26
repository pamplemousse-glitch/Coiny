import Foundation

protocol HyperliquidViewModelAPI: Sendable {
    func getHyperliquidAccounts() async throws -> [HyperliquidAccount]
    func addHyperliquidAccount(address: String, label: String?) async throws
    func removeHyperliquidAccount(address: String) async throws
    func syncHyperliquid() async throws -> HyperliquidSyncResult
}

extension API: HyperliquidViewModelAPI {}

@Observable @MainActor final class HyperliquidViewModel {
    private(set) var accounts: [HyperliquidAccount] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var lastSyncUpdated: Int?

    private let api: any HyperliquidViewModelAPI

    init(api: any HyperliquidViewModelAPI = API.shared) {
        self.api = api
    }

    func loadAccounts() async {
        isLoading = true
        errorMessage = nil
        do {
            accounts = try await api.getHyperliquidAccounts()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func addAccount(address: String, label: String?) async {
        guard !address.isEmpty else { return }
        errorMessage = nil
        do {
            try await api.addHyperliquidAccount(address: address, label: label)
            await loadAccounts()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeAccount(_ account: HyperliquidAccount) async {
        accounts.removeAll { $0.id == account.id }
        do {
            try await api.removeHyperliquidAccount(address: account.address)
        } catch {
            errorMessage = error.localizedDescription
            await loadAccounts()
        }
    }

    func sync() async {
        errorMessage = nil
        do {
            let result = try await api.syncHyperliquid()
            lastSyncUpdated = result.updated
            await loadAccounts()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
