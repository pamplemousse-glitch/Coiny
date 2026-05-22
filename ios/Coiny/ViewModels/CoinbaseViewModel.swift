import Foundation
import Observation

protocol CoinbaseViewModelAPI: Sendable {
    func getCoinbaseStatus() async throws -> CoinbaseStatus
    func connectCoinbaseDevKey() async throws -> EmptyResponse
    func disconnectCoinbase() async throws
    func syncCoinbase() async throws -> SyncResult
}

extension API: CoinbaseViewModelAPI {}

@Observable
@MainActor
final class CoinbaseViewModel {
    private(set) var status: CoinbaseStatus?
    private(set) var isSyncing = false
    private(set) var lastSyncReacted: Int?
    private(set) var errorMessage: String?
    private(set) var isLoading = false

    private let api: any CoinbaseViewModelAPI

    init(api: any CoinbaseViewModelAPI = API.shared) {
        self.api = api
    }

    func loadStatus() async {
        isLoading = true
        errorMessage = nil
        do {
            status = try await api.getCoinbaseStatus()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func connectDevKey() async {
        errorMessage = nil
        do {
            _ = try await api.connectCoinbaseDevKey()
            await loadStatus()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func disconnect() async {
        errorMessage = nil
        do {
            try await api.disconnectCoinbase()
            await loadStatus()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sync() async {
        isSyncing = true
        errorMessage = nil
        do {
            let result = try await api.syncCoinbase()
            lastSyncReacted = result.reacted
        } catch {
            errorMessage = error.localizedDescription
        }
        isSyncing = false
    }
}
