import Foundation

protocol EnergyViewModelAPI: Sendable {
    func getEnergy() async throws -> [EnergyPosition]
    func addEnergy(commodity: String, quantity: Double, label: String?) async throws
    func removeEnergy(id: Int) async throws
    func syncEnergy() async throws -> EnergySyncResult
}

extension API: EnergyViewModelAPI {}

@Observable @MainActor final class EnergyViewModel {
    private(set) var positions: [EnergyPosition] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var lastUpdated: Int?

    private let api: any EnergyViewModelAPI

    init(api: any EnergyViewModelAPI = API.shared) {
        self.api = api
    }

    func loadPositions() async {
        isLoading = true
        errorMessage = nil
        do {
            positions = try await api.getEnergy()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func addPosition(commodity: String, quantity: Double, label: String?) async {
        guard !commodity.isEmpty, quantity > 0 else { return }
        errorMessage = nil
        do {
            try await api.addEnergy(commodity: commodity, quantity: quantity, label: label)
            await loadPositions()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removePosition(_ position: EnergyPosition) async {
        errorMessage = nil
        do {
            try await api.removeEnergy(id: position.id)
            positions.removeAll { $0.id == position.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sync() async {
        errorMessage = nil
        do {
            let result = try await api.syncEnergy()
            lastUpdated = result.updated
            await loadPositions()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
