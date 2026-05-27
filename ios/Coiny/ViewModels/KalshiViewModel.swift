import Foundation

protocol KalshiViewModelAPI: Sendable {
    func getKalshiStatus() async throws -> KalshiStatusResponse
    func connectKalshi(keyId: String, privateKeyBase64: String) async throws
    func disconnectKalshi() async throws
    func syncKalshi() async throws -> KalshiSyncResult
}

extension API: KalshiViewModelAPI {}

@Observable @MainActor final class KalshiViewModel {
    private(set) var isConnected = false
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var lastPortfolioUsd: Double?

    private let api: any KalshiViewModelAPI

    init(api: any KalshiViewModelAPI = API.shared) {
        self.api = api
    }

    func loadStatus() async {
        isLoading = true
        do {
            let status = try await api.getKalshiStatus()
            isConnected = status.connected
        } catch {
            // silently stay disconnected — endpoint not yet available or not connected
            isConnected = false
        }
        isLoading = false
    }

    func connect(keyId: String, privateKeyBase64: String) async {
        guard !keyId.isEmpty, !privateKeyBase64.isEmpty else { return }
        isLoading = true
        errorMessage = nil
        do {
            try await api.connectKalshi(keyId: keyId, privateKeyBase64: privateKeyBase64)
            await loadStatus()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func disconnect() async {
        isLoading = true
        errorMessage = nil
        do {
            try await api.disconnectKalshi()
            isConnected = false
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func sync() async {
        isLoading = true
        errorMessage = nil
        do {
            let result = try await api.syncKalshi()
            lastPortfolioUsd = result.portfolioUsd
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
