import Foundation
import Observation

protocol PolymarketViewModelAPI: Sendable {
    func getPolymarketAccounts() async throws -> [PolymarketAccount]
    func addPolymarketAccount(walletAddress: String, label: String?) async throws
    func removePolymarketAccount(address: String) async throws
    func syncPolymarket() async throws -> PolymarketSyncResult
}

extension API: PolymarketViewModelAPI {}

@Observable
@MainActor
final class PolymarketViewModel {
    private(set) var accounts: [PolymarketAccount] = []
    private(set) var isSyncing = false
    private(set) var lastSyncUpdated: Int?
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    private let api: any PolymarketViewModelAPI

    init(api: any PolymarketViewModelAPI = API.shared) {
        self.api = api
    }

    func loadAccounts() async {
        isLoading = true
        errorMessage = nil
        do {
            accounts = try await api.getPolymarketAccounts()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func addAccount(walletAddress: String, label: String?) async {
        guard !walletAddress.isEmpty else { return }
        errorMessage = nil
        do {
            try await api.addPolymarketAccount(walletAddress: walletAddress, label: label)
            accounts = try await api.getPolymarketAccounts()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeAccount(address: String) async {
        errorMessage = nil
        accounts.removeAll { $0.walletAddress == address }
        do {
            try await api.removePolymarketAccount(address: address)
        } catch {
            await loadAccounts()
        }
    }

    func sync() async {
        isSyncing = true
        errorMessage = nil
        do {
            let result = try await api.syncPolymarket()
            lastSyncUpdated = result.updated
            accounts = try await api.getPolymarketAccounts()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSyncing = false
    }
}
