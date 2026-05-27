import Foundation

protocol YnabViewModelAPI: Sendable {
    func connectYnab(apiKey: String) async throws
    func disconnectYnab() async throws
    func syncYnab() async throws -> YnabSyncResult
}

extension API: YnabViewModelAPI {}

@Observable @MainActor final class YnabViewModel {
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var lastTotal: Double?

    private let api: any YnabViewModelAPI

    init(api: any YnabViewModelAPI = API.shared) {
        self.api = api
    }

    func connect(apiKey: String) async {
        guard !apiKey.isEmpty else { return }
        isLoading = true
        errorMessage = nil
        do {
            try await api.connectYnab(apiKey: apiKey)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func disconnect() async {
        isLoading = true
        errorMessage = nil
        do {
            try await api.disconnectYnab()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func sync() async {
        isLoading = true
        errorMessage = nil
        do {
            let result = try await api.syncYnab()
            lastTotal = result.total
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
