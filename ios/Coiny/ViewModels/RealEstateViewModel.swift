import Foundation

protocol RealEstateViewModelAPI: Sendable {
    func getRealEstate() async throws -> [RealEstateAsset]
    func addRealEstate(address: String, label: String?) async throws
    func removeRealEstate(id: Int) async throws
    func syncRealEstate() async throws -> RealEstateSyncResult
}

extension API: RealEstateViewModelAPI {}

@Observable @MainActor final class RealEstateViewModel {
    private(set) var assets: [RealEstateAsset] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var lastSynced: Int?

    private let api: any RealEstateViewModelAPI

    init(api: any RealEstateViewModelAPI = API.shared) {
        self.api = api
    }

    func loadAssets() async {
        isLoading = true
        errorMessage = nil
        do {
            assets = try await api.getRealEstate()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func addAsset(address: String, label: String?) async {
        guard !address.isEmpty else { return }
        errorMessage = nil
        do {
            try await api.addRealEstate(address: address, label: label)
            await loadAssets()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeAsset(_ asset: RealEstateAsset) async {
        errorMessage = nil
        do {
            try await api.removeRealEstate(id: asset.id)
            assets.removeAll { $0.id == asset.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sync() async {
        errorMessage = nil
        do {
            let result = try await api.syncRealEstate()
            lastSynced = result.synced
            await loadAssets()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
