import Foundation

protocol TradingCardsViewModelAPI: Sendable {
    func getTradingCards() async throws -> [TradingCardHolding]
    // swiftlint:disable:next function_parameter_count
    func addTradingCard(game: String, cardName: String, setName: String?, isFoil: Bool, quantity: Int, label: String?) async throws
    func removeTradingCard(id: Int) async throws
    func syncTradingCards() async throws -> TradingCardsSyncResult
}

extension API: TradingCardsViewModelAPI {}

@Observable @MainActor final class TradingCardsViewModel {
    private(set) var holdings: [TradingCardHolding] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var lastUpdated: Int?

    private let api: any TradingCardsViewModelAPI

    init(api: any TradingCardsViewModelAPI = API.shared) {
        self.api = api
    }

    func loadHoldings() async {
        isLoading = true
        errorMessage = nil
        do {
            holdings = try await api.getTradingCards()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    // swiftlint:disable:next function_parameter_count
    func addHolding(game: String, cardName: String, setName: String?, isFoil: Bool, quantity: Int, label: String?) async {
        guard !game.isEmpty, !cardName.isEmpty, quantity > 0 else { return }
        errorMessage = nil
        do {
            try await api.addTradingCard(game: game, cardName: cardName, setName: setName, isFoil: isFoil, quantity: quantity, label: label)
            await loadHoldings()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func removeHolding(_ holding: TradingCardHolding) async {
        errorMessage = nil
        do {
            try await api.removeTradingCard(id: holding.id)
            holdings.removeAll { $0.id == holding.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sync() async {
        errorMessage = nil
        do {
            let result = try await api.syncTradingCards()
            lastUpdated = result.updated
            await loadHoldings()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
