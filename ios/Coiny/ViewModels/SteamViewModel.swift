import Foundation

protocol SteamViewModelAPI: Sendable {
    func getSteamAccounts() async throws -> [SteamAccount]
    func addSteamAccount(steamId64: String, label: String?) async throws
    func removeSteamAccount(id: Int) async throws
    func syncSteam() async throws -> SteamSyncResult
}

extension API: SteamViewModelAPI {}

@Observable @MainActor final class SteamViewModel {
    private(set) var accounts: [SteamAccount] = []
    private(set) var isLoading = false
    private(set) var isSyncing = false
    private(set) var errorMessage: String?

    private let api: any SteamViewModelAPI

    init(api: any SteamViewModelAPI = API.shared) {
        self.api = api
    }

    func loadAccounts() async {
        isLoading = true
        errorMessage = nil
        do {
            accounts = try await api.getSteamAccounts()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func addAccount(steamId64: String, label: String?) async {
        guard !steamId64.isEmpty else { return }
        errorMessage = nil
        do {
            try await api.addSteamAccount(steamId64: steamId64, label: label)
            await loadAccounts()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeAccount(_ account: SteamAccount) async {
        errorMessage = nil
        do {
            try await api.removeSteamAccount(id: account.id)
            accounts.removeAll { $0.id == account.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sync() async {
        isSyncing = true
        errorMessage = nil
        do {
            _ = try await api.syncSteam()
            await loadAccounts()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSyncing = false
    }
}
