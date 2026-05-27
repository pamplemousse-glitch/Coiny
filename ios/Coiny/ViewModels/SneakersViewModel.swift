import Foundation

protocol SneakersViewModelAPI: Sendable {
    func getSneakers() async throws -> [SneakerHolding]
    func addSneaker(sku: String, size: String?, description: String?, quantity: Int) async throws
    func removeSneaker(id: Int) async throws
    func syncSneakers() async throws -> SneakersSyncResult
}

extension API: SneakersViewModelAPI {}

@Observable @MainActor final class SneakersViewModel {
    private(set) var holdings: [SneakerHolding] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var lastSynced: Int?

    private let api: any SneakersViewModelAPI

    init(api: any SneakersViewModelAPI = API.shared) {
        self.api = api
    }

    func loadHoldings() async {
        isLoading = true
        errorMessage = nil
        do {
            holdings = try await api.getSneakers()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func addHolding(sku: String, size: String?, description: String?, quantity: Int) async {
        guard !sku.isEmpty, quantity > 0 else { return }
        errorMessage = nil
        do {
            try await api.addSneaker(sku: sku, size: size, description: description, quantity: quantity)
            await loadHoldings()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeHolding(_ holding: SneakerHolding) async {
        errorMessage = nil
        do {
            try await api.removeSneaker(id: holding.id)
            holdings.removeAll { $0.id == holding.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sync() async {
        errorMessage = nil
        do {
            let result = try await api.syncSneakers()
            lastSynced = result.synced
            await loadHoldings()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
