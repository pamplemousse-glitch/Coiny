import SwiftUI

/// The connect-and-manage directory, one section per provider. This is where
/// `not_connected` classes live (R-8.4: rendered only inside "Add an
/// account", never as an empty section on Wealth). Pushed from the Wealth
/// screen; the Wealth screen itself renders only the six groups.
struct ManageAccountsView: View {
    @Environment(NetWorthViewModel.self) private var vm
    @State private var coinbaseVM = CoinbaseViewModel()
    @State private var zerionVM = ZerionViewModel()
    @State private var spinwheelVM = SpinwheelViewModel()
    @State private var performanceVM = PerformanceViewModel()
    @State private var chainWalletsVM = ChainWalletsViewModel()
    @State private var hyperliquidVM = HyperliquidViewModel()
    @State private var metalsVM = MetalsViewModel()
    @State private var sneakersVM = SneakersViewModel()
    @State private var realEstateVM = RealEstateViewModel()
    @State private var vehiclesVM = VehiclesViewModel()
    @State private var krakenVM = KrakenViewModel()
    @State private var showKrakenKeyEntry = false
    @State private var ynabVM = YnabViewModel()
    @State private var kalshiVM = KalshiViewModel()
    @State private var discogsVM = DiscogsViewModel()
    @State private var polymarketVM = PolymarketViewModel()
    @State private var alpacaVM = AlpacaViewModel()
    @State private var nftVM = NftViewModel()
    @State private var manualAssetsVM = ManualAssetsViewModel()
    @State var truelayerVM = TruelayerViewModel()
    @State var pokemonCardsVM = PokemonCardsViewModel()
    @State var energyVM = EnergyViewModel()
    @State var farmlandVM = FarmlandViewModel()
    @State var tradingCardsVM = TradingCardsViewModel()
    @State var coinsVM = CoinsViewModel()

    var body: some View {
        content
            .navigationTitle("Accounts")
            .refreshable { await reload() }
            .task { await reload() }
            .environment(coinbaseVM)
            .environment(zerionVM)
            .environment(performanceVM)
            .environment(chainWalletsVM)
            .environment(hyperliquidVM)
            .environment(metalsVM)
            .environment(sneakersVM)
            .environment(realEstateVM)
            .environment(vehiclesVM)
            .environment(alpacaVM)
            .environment(nftVM)
            .environment(manualAssetsVM)
            .environment(truelayerVM)
            .environment(pokemonCardsVM)
            .environment(energyVM)
            .environment(farmlandVM)
            .environment(tradingCardsVM)
            .environment(coinsVM)
    }

    /// Provider status fan-out plus the free net-worth GET. No vendor
    /// refreshes happen here; each provider's own Sync button is explicit.
    private func reload() async {
        async let netWorth: () = vm.load()
        async let coinbase: () = coinbaseVM.loadStatus()
        async let zerion: () = zerionVM.loadWallets()
        async let spinwheel: () = spinwheelVM.loadStatus()
        async let performance: () = performanceVM.load()
        async let chainWallets: () = chainWalletsVM.loadWallets()
        async let hyperliquid: () = hyperliquidVM.loadAccounts()
        async let metals: () = metalsVM.loadHoldings()
        async let sneakers: () = sneakersVM.loadHoldings()
        async let realEstate: () = realEstateVM.loadAssets()
        async let vehicles: () = vehiclesVM.loadAssets()
        async let kalshi: () = kalshiVM.loadStatus()
        async let discogs: () = discogsVM.loadStatus()
        async let polymarket: () = polymarketVM.loadAccounts()
        async let alpaca: () = alpacaVM.loadStatus()
        async let nft: () = nftVM.loadWallets()
        async let manualAssets: () = manualAssetsVM.loadAssets()
        async let truelayer: () = truelayerVM.loadStatus()
        async let pokemonCards: () = pokemonCardsVM.loadHoldings()
        async let energy: () = energyVM.loadPositions()
        async let farmland: () = farmlandVM.loadParcels()
        async let tradingCards: () = tradingCardsVM.loadHoldings()
        async let coins: () = coinsVM.loadHoldings()
        _ = await (netWorth, coinbase, zerion, spinwheel, performance, chainWallets,
                   hyperliquid, metals, sneakers, realEstate, vehicles, kalshi, discogs,
                   polymarket, alpaca, nft, manualAssets, truelayer, pokemonCards,
                   energy, farmland, tradingCards, coins)
    }

    @ViewBuilder
    private var content: some View {
        switch vm.state {
        case .idle, .loading:
            ProgressView("Loading…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)

        case let .loaded(data):
            ScrollView {
                // Zero spacing: CoinySection carries its own leading gap, so
                // the container adding more would double it.
                VStack(spacing: 0) {
                    bankSection(data)
                    investmentsSection(data)
                    cryptoSection(data)
                    defiSection(data)
                    chainWalletsSection(data)
                    hyperliquidSection(data)
                    nftSection(data)
                    alpacaSection(data)
                    manualAssetsSection(data)
                    metalsSection(data)
                    realEstateSection(data)
                    vehiclesSection(data)
                    sneakersSection(data)
                    discogsSection(data)
                    krakenSection(data)
                    ynabSection(data)
                    kalshiSection(data)
                    polymarketSection(data)
                    truelayerSection(data)
                    pokemonCardsSection(data)
                    energySection(data)
                    farmlandSection(data)
                    tradingCardsSection(data)
                    coinsSection(data)
                    debtsSection(data)
                    performanceSection()
                    Spacer(minLength: 32)
                }
                .padding(.horizontal)
                .padding(.top, 8)
            }

        case let .failed(message):
            CoinyErrorLine(message: message, actionTitle: "Try again") {
                Task { await reload() }
            }
            .padding(.horizontal)
            .frame(maxHeight: .infinity, alignment: .top)
        }
    }
}

// MARK: - Section builders

extension ManageAccountsView {

    // MARK: - Plaid sections

    private func bankSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Bank", total: data.bank) {
            if let months = data.liquidCashMonths {
                AccountRow(
                    title: "Emergency runway",
                    detail: nil,
                    trailing: "\(months.formatted(.number.precision(.fractionLength(1)))) mo"
                )
            }
            if data.accounts.bank.isEmpty {
                EmptyClassLine(text: "No bank accounts linked")
            } else {
                ForEach(data.accounts.bank) { account in
                    AccountRow(
                        title: account.name,
                        detail: account.type.capitalized,
                        trailing: account.balance.formatted(.currency(code: "USD"))
                    )
                }
            }
        }
    }

    private func investmentsSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Investments", total: data.investments) {
            if data.accounts.investments.isEmpty {
                EmptyClassLine(text: "No investment accounts linked")
            } else {
                ForEach(data.accounts.investments) { holding in
                    AccountRow(
                        title: holding.name ?? holding.ticker ?? "Holding",
                        detail: holding.ticker,
                        trailing: holding.value.formatted(.currency(code: "USD"))
                    )
                }
            }
        }
    }

    // MARK: - Crypto sections

    private func cryptoSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Crypto", total: data.crypto) {
            ForEach(data.accounts.crypto) { position in
                AccountRow(
                    title: position.name,
                    detail: "\(position.amount.formatted(.number.precision(.fractionLength(4)))) \(position.symbol)",
                    trailing: position.valueUSD.formatted(.currency(code: "USD"))
                )
            }
            CoinbaseView()
        }
    }

    private func defiSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "DeFi", total: data.defi) {
            ZerionView()
        }
    }

    private func chainWalletsSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "On-chain", total: data.chainWallets) {
            ChainWalletsView()
        }
    }

    private func hyperliquidSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Hyperliquid", total: data.hyperliquid) {
            HyperliquidView()
        }
    }

    private func nftSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "NFT Wallets", total: data.nft ?? 0) {
            NftView()
        }
    }

    private func alpacaSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Alpaca", total: data.alpaca ?? 0) {
            AlpacaView()
        }
    }

    private func manualAssetsSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Other Assets", total: data.manual ?? 0) {
            ManualAssetsView()
        }
    }

    // MARK: - Add-your-own asset sections

    private func metalsSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Precious Metals", total: data.metals) {
            MetalsView()
        }
    }

    private func realEstateSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Real Estate", total: data.realEstate) {
            RealEstateView()
        }
    }

    private func vehiclesSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Vehicles", total: data.vehicles) {
            VehiclesView()
        }
    }

    private func sneakersSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Sneakers", total: data.sneakers) {
            SneakersView()
        }
    }

    // MARK: - Connect-style sections

    private func discogsSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Vinyl", total: data.vinyl ?? 0) {
            DiscogsInlineView(vm: discogsVM)
        }
    }

    private func krakenSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Kraken", total: data.kraken) {
            KrakenInlineView(vm: krakenVM, isConnected: data.connections.kraken, onConnect: {
                showKrakenKeyEntry = true
            })
        }
        .sheet(isPresented: $showKrakenKeyEntry) {
            KrakenKeyEntryView(vm: krakenVM)
        }
    }

    private func ynabSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "YNAB", total: data.ynab) {
            YnabInlineView(vm: ynabVM, isConnected: data.connections.ynab)
        }
    }

    private func kalshiSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Kalshi", total: data.kalshi ?? 0) {
            KalshiInlineView(vm: kalshiVM, isConnected: kalshiVM.isConnected || (data.connections.kalshi ?? false))
        }
    }

    private func polymarketSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Polymarket", total: data.polymarket ?? 0) {
            PolymarketInlineView(vm: polymarketVM)
        }
    }

    // MARK: - Debts + Performance

    private func debtsSection(_ data: NetWorthResponse) -> some View {
        CoinySection(title: "Debts", total: data.debts) {
            if spinwheelVM.isConnected {
                if let score = spinwheelVM.creditScore {
                    AccountRow(title: "Credit score", detail: nil, trailing: "\(score)")
                }
                if let utilization = spinwheelVM.creditUtilization {
                    VStack(alignment: .leading, spacing: 4) {
                        AccountRow(
                            title: "Credit utilization",
                            detail: nil,
                            trailing: "\(utilization.formatted(.number.precision(.fractionLength(1))))%"
                        )
                        ProgressView(value: min(utilization / 100, 1))
                            .tint(CoinyTheme.signal)
                    }
                }
            }
            SpinwheelInlineView(vm: spinwheelVM)
        }
    }

    private func performanceSection() -> some View {
        PerformanceView()
    }

}

// MARK: - Rows

/// One account, holding or figure inside a section. Hairline underneath, 44pt
/// minimum, the amount in ink whatever its sign: the same row Home, the journey
/// and Debt use, which is why `sectionHeader` and its per-section SF Symbol are
/// gone. Twenty-five glyphs on one screen were decoration carrying no
/// information that the heading beside them did not already carry.
struct AccountRow: View {
    let title: String
    let detail: String?
    let trailing: String

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .foregroundStyle(CoinyTheme.ink)
                if let detail {
                    Text(detail)
                        .font(.caption)
                        .foregroundStyle(CoinyTheme.ink2)
                }
            }
            Spacer(minLength: 8)
            Text(trailing)
                .font(.subheadline.monospacedDigit())
                .foregroundStyle(CoinyTheme.ink)
        }
        .padding(.vertical, 8)
        .frame(minHeight: 44)
        .overlay(alignment: .bottom) { CoinyHairline() }
        .accessibilityElement(children: .combine)
    }
}

/// A class with nothing in it yet. One line, no illustration.
struct EmptyClassLine: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.subheadline)
            .foregroundStyle(CoinyTheme.ink2)
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
    }
}

#Preview {
    NavigationStack {
        ManageAccountsView()
            .environment(NetWorthViewModel())
    }
}
