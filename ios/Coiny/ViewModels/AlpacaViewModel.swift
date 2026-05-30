import Foundation

protocol AlpacaViewModelAPI: Sendable {
    func connectAlpaca(apiKeyId: String, apiSecretKey: String, env: String) async throws
    func getAlpacaStatus() async throws -> AlpacaStatus
    func syncAlpaca() async throws -> AlpacaSyncResult
    func disconnectAlpaca() async throws
}

extension API: AlpacaViewModelAPI {}

@Observable @MainActor final class AlpacaViewModel {
    private(set) var status: AlpacaStatus?
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    var isConnected: Bool { status != nil }

    private let api: any AlpacaViewModelAPI

    init(api: any AlpacaViewModelAPI = API.shared) {
        self.api = api
    }

    func loadStatus() async {
        isLoading = true
        errorMessage = nil
        do {
            status = try await api.getAlpacaStatus()
        } catch {
            status = nil
        }
        isLoading = false
    }

    func connect(apiKeyId: String, apiSecretKey: String, env: String) async {
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
            _ = try await api.syncAlpaca()
            await loadStatus()
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
