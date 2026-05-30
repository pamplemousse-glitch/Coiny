import Foundation

protocol ManualAssetsViewModelAPI: Sendable {
    func getManualAssets() async throws -> [ManualAsset]
    func addManualAsset(name: String, category: String, value: Double, notes: String?) async throws
    func removeManualAsset(id: Int) async throws
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

    func addAsset(name: String, category: String, value: Double, notes: String?) async {
        guard !name.isEmpty, value >= 0 else { return }
        errorMessage = nil
        do {
            try await api.addManualAsset(name: name, category: category, value: value, notes: notes)
            await loadAssets()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeAsset(_ asset: ManualAsset) async {
        errorMessage = nil
        do {
            try await api.removeManualAsset(id: asset.id)
            assets.removeAll { $0.id == asset.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
