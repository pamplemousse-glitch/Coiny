import Foundation

protocol CoinsViewModelAPI: Sendable {
    func getCoins() async throws -> [CoinHolding]
    func addCoin(pcgsNo: Int, gradeNo: Int, plusGrade: Bool, label: String?, quantity: Int) async throws
    func removeCoin(id: Int) async throws
    func syncCoins() async throws -> CoinsSyncResult
}

extension API: CoinsViewModelAPI {}

@Observable @MainActor final class CoinsViewModel {
    private(set) var holdings: [CoinHolding] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var lastUpdated: Int?

    private let api: any CoinsViewModelAPI

    init(api: any CoinsViewModelAPI = API.shared) {
        self.api = api
    }

    func loadHoldings() async {
        isLoading = true
        errorMessage = nil
        do {
            holdings = try await api.getCoins()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func addHolding(pcgsNo: Int, gradeNo: Int, plusGrade: Bool, label: String?, quantity: Int) async {
        guard pcgsNo > 0, gradeNo > 0, quantity > 0 else { return }
        errorMessage = nil
        do {
            try await api.addCoin(pcgsNo: pcgsNo, gradeNo: gradeNo, plusGrade: plusGrade, label: label, quantity: quantity)
            await loadHoldings()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeHolding(_ holding: CoinHolding) async {
        errorMessage = nil
        do {
            try await api.removeCoin(id: holding.id)
            holdings.removeAll { $0.id == holding.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sync() async {
        errorMessage = nil
        do {
            let result = try await api.syncCoins()
            lastUpdated = result.updated
            await loadHoldings()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
