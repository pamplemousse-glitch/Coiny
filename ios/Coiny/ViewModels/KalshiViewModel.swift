import Foundation

protocol KalshiViewModelAPI: Sendable {
    func getKalshiStatus() async throws -> KalshiStatusResponse
    func connectKalshi(keyId: String, privateKeyBase64: String) async throws
    func disconnectKalshi() async throws
    func syncKalshi() async throws -> KalshiSyncResult
    func getKalshiPositions() async throws -> KalshiPositionsResponse
}

extension API: KalshiViewModelAPI {}

@Observable @MainActor final class KalshiViewModel {
    private(set) var isConnected = false
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var lastPortfolioUsd: Double?

    /// Open contracts, plus the cash/positions split the single total hides.
    /// `hasLoadedPositions` distinguishes "not fetched yet" from "nothing
    /// open", which are the same empty array but different sentences.
    private(set) var markets: [KalshiMarketPosition] = []
    private(set) var cashUsd: Double?
    private(set) var positionsUsd: Double?
    private(set) var hasLoadedPositions = false
    private(set) var isLoadingPositions = false

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

    /// Fetches the open contracts and the cash/positions split. Separate from
    /// `loadStatus` because the backend reads these live from Kalshi.
    func loadPositions() async {
        guard isConnected else { return }
        isLoadingPositions = true
        errorMessage = nil
        do {
            let response = try await api.getKalshiPositions()
            markets = response.markets
            cashUsd = response.cashUsd
            positionsUsd = response.positionsUsd
            lastPortfolioUsd = response.totalUsd
            hasLoadedPositions = true
        } catch {
            errorMessage = "Could not load positions. Try again."
        }
        isLoadingPositions = false
    }

    func disconnect() async {
        isLoading = true
        errorMessage = nil
        do {
            try await api.disconnectKalshi()
            isConnected = false
            markets = []
            cashUsd = nil
            positionsUsd = nil
            hasLoadedPositions = false
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
