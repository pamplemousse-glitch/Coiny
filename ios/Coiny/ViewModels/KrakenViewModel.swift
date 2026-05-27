import Foundation

protocol KrakenViewModelAPI: Sendable {
    func connectKraken(apiKey: String, privateKey: String) async throws
    func disconnectKraken() async throws
    func syncKraken() async throws -> KrakenSyncResult
}

extension API: KrakenViewModelAPI {}

@Observable @MainActor final class KrakenViewModel {
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var lastTotal: Double?

    private let api: any KrakenViewModelAPI

    init(api: any KrakenViewModelAPI = API.shared) {
        self.api = api
    }

    func connect(apiKey: String, privateKey: String) async {
        guard !apiKey.isEmpty, !privateKey.isEmpty else { return }
        isLoading = true
        errorMessage = nil
        do {
            try await api.connectKraken(apiKey: apiKey, privateKey: privateKey)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func disconnect() async {
        isLoading = true
        errorMessage = nil
        do {
            try await api.disconnectKraken()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func sync() async {
        isLoading = true
        errorMessage = nil
        do {
            let result = try await api.syncKraken()
            lastTotal = result.total
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
