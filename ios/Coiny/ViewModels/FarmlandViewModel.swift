import Foundation

protocol FarmlandViewModelAPI: Sendable {
    func getFarmland() async throws -> [FarmlandParcel]
    func addFarmland(stateCode: String, acres: Double, label: String?) async throws
    func removeFarmland(id: Int) async throws
    func syncFarmland() async throws -> FarmlandSyncResult
}

extension API: FarmlandViewModelAPI {}

@Observable @MainActor final class FarmlandViewModel {
    private(set) var parcels: [FarmlandParcel] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var lastUpdated: Int?

    private let api: any FarmlandViewModelAPI

    init(api: any FarmlandViewModelAPI = API.shared) {
        self.api = api
    }

    func loadParcels() async {
        isLoading = true
        errorMessage = nil
        do {
            parcels = try await api.getFarmland()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func addParcel(stateCode: String, acres: Double, label: String?) async {
        guard !stateCode.isEmpty, acres > 0 else { return }
        errorMessage = nil
        do {
            try await api.addFarmland(stateCode: stateCode, acres: acres, label: label)
            await loadParcels()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeParcel(_ parcel: FarmlandParcel) async {
        errorMessage = nil
        do {
            try await api.removeFarmland(id: parcel.id)
            parcels.removeAll { $0.id == parcel.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sync() async {
        errorMessage = nil
        do {
            let result = try await api.syncFarmland()
            lastUpdated = result.updated
            await loadParcels()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
