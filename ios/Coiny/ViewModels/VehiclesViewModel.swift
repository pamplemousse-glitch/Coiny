import Foundation

protocol VehiclesViewModelAPI: Sendable {
    func getVehicles() async throws -> [VehicleAsset]
    func addVehicle(vin: String, label: String?) async throws
    func removeVehicle(id: Int) async throws
    func syncVehicles() async throws -> VehiclesSyncResult
}

extension API: VehiclesViewModelAPI {}

@Observable @MainActor final class VehiclesViewModel {
    private(set) var assets: [VehicleAsset] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var lastSynced: Int?

    private let api: any VehiclesViewModelAPI

    init(api: any VehiclesViewModelAPI = API.shared) {
        self.api = api
    }

    func loadAssets() async {
        isLoading = true
        errorMessage = nil
        do {
            assets = try await api.getVehicles()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func addAsset(vin: String, label: String?) async {
        guard !vin.isEmpty else { return }
        errorMessage = nil
        do {
            try await api.addVehicle(vin: vin, label: label)
            await loadAssets()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeAsset(_ asset: VehicleAsset) async {
        errorMessage = nil
        do {
            try await api.removeVehicle(id: asset.id)
            assets.removeAll { $0.id == asset.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sync() async {
        errorMessage = nil
        do {
            let result = try await api.syncVehicles()
            lastSynced = result.synced
            await loadAssets()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
