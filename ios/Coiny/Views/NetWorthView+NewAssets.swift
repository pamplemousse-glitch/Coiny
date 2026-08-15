import SwiftUI

extension ManageAccountsView {

    // MARK: - New asset class sections

    func truelayerSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "UK/EU bank", total: data.truelayer ?? 0) {
            TruelayerInlineView(vm: truelayerVM)
        }
    }

    func pokemonCardsSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Pokemon cards", total: data.pokemonCards ?? 0) {
            PokemonCardsInlineView(vm: pokemonCardsVM)
        }
    }

    func energySection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Energy", total: data.energy ?? 0) {
            EnergyInlineView(vm: energyVM)
        }
    }

    func farmlandSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Farmland", total: data.farmland ?? 0) {
            FarmlandInlineView(vm: farmlandVM)
        }
    }

    func tradingCardsSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Trading cards", total: data.tradingCards ?? 0) {
            TradingCardsInlineView(vm: tradingCardsVM)
        }
    }

    func coinsSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Graded coins", total: data.coins ?? 0) {
            CoinsInlineView(vm: coinsVM)
        }
    }
}
