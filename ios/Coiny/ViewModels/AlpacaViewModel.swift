import Foundation

protocol AlpacaViewModelAPI: Sendable {
    func getAlpacaStatus() async throws -> AlpacaStatus
    func connectAlpaca(apiKeyId: String, apiSecretKey: String, env: String) async throws
    func syncAlpaca() async throws -> AlpacaSyncResult
    func disconnectAlpaca() async throws
    func getAlpacaPositions() async throws -> [AlpacaPosition]
}

extension API: AlpacaViewModelAPI {}

@Observable @MainActor final class AlpacaViewModel {
    private(set) var status: AlpacaStatus?
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    /// Open positions. Empty both before loading and for an account holding
    /// nothing, which `hasLoadedPositions` is what distinguishes: an empty list
    /// is a real answer and should read "no open positions", not stay blank.
    private(set) var positions: [AlpacaPosition] = []
    private(set) var hasLoadedPositions = false
    private(set) var isLoadingPositions = false

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

    /// Fetches the open positions. Separate from `loadStatus` on purpose: the
    /// backend reads these live from Alpaca, so it is a round trip to a third
    /// party and does not belong in the Wealth tab's initial fan-out.
    func loadPositions() async {
        guard isConnected else { return }
        isLoadingPositions = true
        errorMessage = nil
        do {
            positions = try await api.getAlpacaPositions()
            hasLoadedPositions = true
        } catch {
            // Surfaced, never swallowed. A holdings list that silently stays
            // empty is indistinguishable from an account holding nothing.
            errorMessage = "Could not load holdings. Pull to try again."
        }
        isLoadingPositions = false
    }

    func disconnect() async {
        errorMessage = nil
        do {
            try await api.disconnectAlpaca()
            status = nil
            positions = []
            hasLoadedPositions = false
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
