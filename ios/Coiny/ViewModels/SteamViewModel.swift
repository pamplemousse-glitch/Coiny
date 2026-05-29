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
    private(set) var errorMessage: String?
    private(set) var lastSynced: Int?

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
        accounts.removeAll { $0.id == account.id }
        do {
            try await api.removeSteamAccount(id: account.id)
        } catch {
            errorMessage = error.localizedDescription
            await loadAccounts()
        }
    }

    func sync() async {
        errorMessage = nil
        do {
            let result = try await api.syncSteam()
            lastSynced = result.synced
            await loadAccounts()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
