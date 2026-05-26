import Foundation

protocol PerformanceViewModelAPI: Sendable {
    func getCoinbasePerformance() async throws -> CoinbasePerformance
    func getZerionPnl() async throws -> ZerionPnl
    func getDefiPositions() async throws -> DefiPositionsResponse
}

extension API: PerformanceViewModelAPI {}

@Observable @MainActor final class PerformanceViewModel {
    private(set) var coinbasePerformance: CoinbasePerformance?
    private(set) var zerionPnl: ZerionPnl?
    private(set) var defiPositions: [DefiPosition] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    private let api: any PerformanceViewModelAPI

    init(api: any PerformanceViewModelAPI = API.shared) {
        self.api = api
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        async let coinbase = try? api.getCoinbasePerformance()
        async let pnl = try? api.getZerionPnl()
        async let defi = try? api.getDefiPositions()
        let (c, p, d) = await (coinbase, pnl, defi)
        coinbasePerformance = c
        zerionPnl = p
        defiPositions = d?.positions ?? []
        isLoading = false
    }
}
