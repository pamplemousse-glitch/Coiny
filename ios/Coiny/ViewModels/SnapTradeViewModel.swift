import Foundation

protocol SnapTradeViewModelAPI: Sendable {
    func connectSnapTrade() async throws -> SnapTradeConnectResult
    func disconnectSnapTrade() async throws
    func syncSnapTrade() async throws -> SnapTradeSyncResult
}

extension API: SnapTradeViewModelAPI {}

@Observable @MainActor final class SnapTradeViewModel {
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var redirectUrl: String?
    private(set) var lastTotal: Double?

    private let api: any SnapTradeViewModelAPI

    init(api: any SnapTradeViewModelAPI = API.shared) {
        self.api = api
    }

    func connect() async {
        isLoading = true
        errorMessage = nil
        do {
            let result = try await api.connectSnapTrade()
            redirectUrl = result.redirectUrl
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func disconnect() async {
        isLoading = true
        errorMessage = nil
        do {
            try await api.disconnectSnapTrade()
            redirectUrl = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func sync() async {
        isLoading = true
        errorMessage = nil
        do {
            let result = try await api.syncSnapTrade()
            lastTotal = result.total
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
