import Foundation

protocol MetalsViewModelAPI: Sendable {
    func getMetals() async throws -> [MetalHolding]
    func addMetal(metal: String, weightOz: Double, label: String?) async throws
    func removeMetal(id: Int) async throws
    func syncMetals() async throws -> MetalsSyncResult
}

extension API: MetalsViewModelAPI {}

@Observable @MainActor final class MetalsViewModel {
    private(set) var holdings: [MetalHolding] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var lastSynced: Int?

    private let api: any MetalsViewModelAPI

    init(api: any MetalsViewModelAPI = API.shared) {
        self.api = api
    }

    func loadHoldings() async {
        isLoading = true
        errorMessage = nil
        do {
            holdings = try await api.getMetals()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func addHolding(metal: String, weightOz: Double, label: String?) async {
        guard !metal.isEmpty, weightOz > 0 else { return }
        errorMessage = nil
        do {
            try await api.addMetal(metal: metal, weightOz: weightOz, label: label)
            await loadHoldings()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeHolding(_ holding: MetalHolding) async {
        errorMessage = nil
        do {
            try await api.removeMetal(id: holding.id)
            holdings.removeAll { $0.id == holding.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sync() async {
        errorMessage = nil
        do {
            let result = try await api.syncMetals()
            lastSynced = result.synced
            await loadHoldings()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
