import Foundation

protocol AlpacaViewModelAPI: Sendable {
    func getAlpacaStatus() async throws -> AlpacaStatus
    func connectAlpaca(apiKeyId: String, apiSecretKey: String, env: String) async throws
    func syncAlpaca() async throws -> AlpacaSyncResult
    func disconnectAlpaca() async throws
}

extension API: AlpacaViewModelAPI {}

@Observable @MainActor final class AlpacaViewModel {
    private(set) var status: AlpacaStatus?
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    private let api: any AlpacaViewModelAPI

    init(api: any AlpacaViewModelAPI = API.shared) {
        self.api = api
    }

    var isConnected: Bool { status != nil }
    var lastEquityUsd: Double? { status?.lastEquityUsd }

    func loadStatus() async {
        isLoading = true
        errorMessage = nil
        do {
            status = try await api.getAlpacaStatus()
        } catch {
            // 404 = not connected; don't surface as an error
            status = nil
        }
        isLoading = false
    }

    func connect(apiKeyId: String, apiSecretKey: String, env: String) async {
        guard !apiKeyId.isEmpty, !apiSecretKey.isEmpty else { return }
        errorMessage = nil
        do {
            try await api.connectAlpaca(apiKeyId: apiKeyId, apiSecretKey: apiSecretKey, env: env)
            await loadStatus()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sync() async {
        errorMessage = nil
        do {
            let result = try await api.syncAlpaca()
            status = AlpacaStatus(env: status?.env ?? "paper", lastEquityUsd: result.equity, lastSyncedAt: nil)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func disconnect() async {
        errorMessage = nil
        do {
            try await api.disconnectAlpaca()
            status = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
