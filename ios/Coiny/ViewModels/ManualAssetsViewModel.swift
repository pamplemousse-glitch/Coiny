import Foundation

protocol ManualAssetsViewModelAPI: Sendable {
    func getManualAssets() async throws -> [ManualAsset]
    func createManualAsset(name: String, category: String, valueUsd: Double, notes: String?) async throws -> ManualAssetCreateResult
    func deleteManualAsset(id: Int) async throws
}

extension API: ManualAssetsViewModelAPI {}

@Observable @MainActor final class ManualAssetsViewModel {
    private(set) var assets: [ManualAsset] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    private let api: any ManualAssetsViewModelAPI

    init(api: any ManualAssetsViewModelAPI = API.shared) {
        self.api = api
    }

    func loadAssets() async {
        isLoading = true
        errorMessage = nil
        do {
            assets = try await api.getManualAssets()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func addAsset(name: String, category: String, valueUsd: Double, notes: String?) async {
        guard !name.isEmpty else { return }
        errorMessage = nil
        do {
            _ = try await api.createManualAsset(name: name, category: category, valueUsd: valueUsd, notes: notes)
            await loadAssets()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeAsset(_ asset: ManualAsset) async {
        assets.removeAll { $0.id == asset.id }
        do {
            try await api.deleteManualAsset(id: asset.id)
        } catch {
            errorMessage = error.localizedDescription
            await loadAssets()
        }
    }
}
