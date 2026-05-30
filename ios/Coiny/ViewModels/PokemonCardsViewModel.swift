import Foundation

protocol PokemonCardsViewModelAPI: Sendable {
    func getPokemonCards() async throws -> [PokemonCardHolding]
    func addPokemonCard(cardName: String, setName: String?, variant: String?, quantity: Int, label: String?) async throws
    func removePokemonCard(id: Int) async throws
    func syncPokemonCards() async throws -> PokemonCardsSyncResult
}

extension API: PokemonCardsViewModelAPI {}

@Observable @MainActor final class PokemonCardsViewModel {
    private(set) var holdings: [PokemonCardHolding] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var lastSynced: Int?

    private let api: any PokemonCardsViewModelAPI

    init(api: any PokemonCardsViewModelAPI = API.shared) {
        self.api = api
    }

    func loadHoldings() async {
        isLoading = true
        errorMessage = nil
        do {
            holdings = try await api.getPokemonCards()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func addHolding(cardName: String, setName: String?, variant: String?, quantity: Int, label: String?) async {
        guard !cardName.isEmpty, quantity > 0 else { return }
        errorMessage = nil
        do {
            try await api.addPokemonCard(cardName: cardName, setName: setName, variant: variant, quantity: quantity, label: label)
            await loadHoldings()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeHolding(_ holding: PokemonCardHolding) async {
        errorMessage = nil
        do {
            try await api.removePokemonCard(id: holding.id)
            holdings.removeAll { $0.id == holding.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sync() async {
        errorMessage = nil
        do {
            let result = try await api.syncPokemonCards()
            lastSynced = result.updated
            await loadHoldings()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
