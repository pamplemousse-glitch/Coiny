import Foundation

protocol TruelayerViewModelAPI: Sendable {
    func getTruelayerStatus() async throws -> TruelayerStatus
    func syncTruelayer() async throws -> TruelayerSyncResult
    func disconnectTruelayer() async throws
}

extension API: TruelayerViewModelAPI {}

@Observable @MainActor final class TruelayerViewModel {
    private(set) var isConnected = false
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    private let api: any TruelayerViewModelAPI

    init(api: any TruelayerViewModelAPI = API.shared) {
        self.api = api
    }

    func loadStatus() async {
        isLoading = true
        errorMessage = nil
        do {
            let status = try await api.getTruelayerStatus()
            isConnected = status.connected
        } catch {
            isConnected = false
        }
        isLoading = false
    }

    func sync() async {
        errorMessage = nil
        do {
            _ = try await api.syncTruelayer()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func disconnect() async {
        errorMessage = nil
        do {
            try await api.disconnectTruelayer()
            isConnected = false
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
