import SwiftUI

extension ManageAccountsView {

    // MARK: - New asset class sections

    func truelayerSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "UK/EU Bank", total: data.truelayer ?? 0, icon: "building.columns")
                Divider().padding(.vertical, 6)
                TruelayerInlineView(vm: truelayerVM)
            }
        }
    }

    func pokemonCardsSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Pokemon Cards", total: data.pokemonCards ?? 0, icon: "menucard.fill")
                Divider().padding(.vertical, 6)
                PokemonCardsInlineView(vm: pokemonCardsVM)
            }
        }
    }

    func energySection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Energy", total: data.energy ?? 0, icon: "bolt.circle.fill")
                Divider().padding(.vertical, 6)
                EnergyInlineView(vm: energyVM)
            }
        }
    }

    func farmlandSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Farmland", total: data.farmland ?? 0, icon: "leaf.fill")
                Divider().padding(.vertical, 6)
                FarmlandInlineView(vm: farmlandVM)
            }
        }
    }

    func tradingCardsSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Trading Cards", total: data.tradingCards ?? 0, icon: "rectangle.stack.fill")
                Divider().padding(.vertical, 6)
                TradingCardsInlineView(vm: tradingCardsVM)
            }
        }
    }

    func coinsSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Graded Coins", total: data.coins ?? 0, icon: "circle.fill")
                Divider().padding(.vertical, 6)
                CoinsInlineView(vm: coinsVM)
            }
        }
    }
}
