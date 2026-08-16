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
                VStack(spacing: 24) {
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
            ContentUnavailableView {
                Label("Couldn't load", systemImage: "exclamationmark.triangle")
            } description: {
                Text(message)
            } actions: {
                Button("Retry") { Task { await reload() } }
                    .buttonStyle(.coinyFilledInline)
            }
        }
    }
}

// MARK: - Section builders

extension ManageAccountsView {

    // MARK: - Plaid sections

    private func bankSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Bank", total: data.bank, icon: "building.columns.fill")
                if let months = data.liquidCashMonths {
                    Divider().padding(.vertical, 6)
                    HStack {
                        Label("Emergency runway", systemImage: "shield.fill")
                            .font(.caption)
                            .foregroundStyle(CoinyTheme.ink2)
                        Spacer()
                        Text("\(months, specifier: "%.1f") mo")
                            .font(.caption.monospacedDigit())
                    }
                }
                if data.accounts.bank.isEmpty {
                    Text("No bank accounts linked")
                        .font(.caption)
                        .foregroundStyle(CoinyTheme.ink2)
                        .padding(.top, 8)
                } else {
                    ForEach(data.accounts.bank) { account in
                        Divider().padding(.vertical, 6)
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(account.name).font(.subheadline)
                                Text(account.type.capitalized).font(.caption).foregroundStyle(CoinyTheme.ink2)
                            }
                            Spacer()
                            Text(account.balance, format: .currency(code: "USD"))
                                .font(.subheadline.monospacedDigit())
                        }
                    }
                }
            }
        }
    }

    private func investmentsSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Investments", total: data.investments, icon: "chart.bar.fill")
                if data.accounts.investments.isEmpty {
                    Text("No investment accounts linked")
                        .font(.caption)
                        .foregroundStyle(CoinyTheme.ink2)
                        .padding(.top, 8)
                } else {
                    ForEach(data.accounts.investments) { holding in
                        Divider().padding(.vertical, 6)
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(holding.name ?? holding.ticker ?? "Holding").font(.subheadline)
                                if let ticker = holding.ticker {
                                    Text(ticker).font(.caption).foregroundStyle(CoinyTheme.ink2)
                                }
                            }
                            Spacer()
                            Text(holding.value, format: .currency(code: "USD"))
                                .font(.subheadline.monospacedDigit())
                        }
                    }
                }
            }
        }
    }

    // MARK: - Crypto sections

    private func cryptoSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Crypto", total: data.crypto, icon: "bitcoinsign.circle.fill")
                if !data.accounts.crypto.isEmpty {
                    ForEach(data.accounts.crypto) { position in
                        Divider().padding(.vertical, 6)
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(position.name).font(.subheadline)
                                Text("\(position.amount, specifier: "%.4f") \(position.symbol)")
                                    .font(.caption).foregroundStyle(CoinyTheme.ink2)
                            }
                            Spacer()
                            Text(position.valueUSD, format: .currency(code: "USD"))
                                .font(.subheadline.monospacedDigit())
                        }
                    }
                }
                Divider().padding(.vertical, 6)
                CoinbaseView()
            }
        }
    }

    private func defiSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "DeFi", total: data.defi, icon: "link.circle.fill")
                Divider().padding(.vertical, 6)
                ZerionView()
            }
        }
    }

    private func chainWalletsSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "On-chain", total: data.chainWallets, icon: "bitcoinsign.square.fill")
                Divider().padding(.vertical, 6)
                ChainWalletsView()
            }
        }
    }

    private func hyperliquidSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Hyperliquid", total: data.hyperliquid, icon: "chart.line.uptrend.xyaxis")
                Divider().padding(.vertical, 6)
                HyperliquidView()
            }
        }
    }

    private func nftSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "NFT Wallets", total: data.nft ?? 0, icon: "photo.stack")
                Divider().padding(.vertical, 6)
                NftView()
            }
        }
    }

    private func alpacaSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Alpaca", total: data.alpaca ?? 0, icon: "chart.bar.xaxis")
                Divider().padding(.vertical, 6)
                AlpacaView()
            }
        }
    }

    private func manualAssetsSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Other Assets", total: data.manual ?? 0, icon: "archivebox.fill")
                Divider().padding(.vertical, 6)
                ManualAssetsView()
            }
        }
    }

    // MARK: - Add-your-own asset sections

    private func metalsSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Precious Metals", total: data.metals, icon: "sparkles")
                Divider().padding(.vertical, 6)
                MetalsView()
            }
        }
    }

    private func realEstateSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Real Estate", total: data.realEstate, icon: "house.fill")
                Divider().padding(.vertical, 6)
                RealEstateView()
            }
        }
    }

    private func vehiclesSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Vehicles", total: data.vehicles, icon: "car.fill")
                Divider().padding(.vertical, 6)
                VehiclesView()
            }
        }
    }

    private func sneakersSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Sneakers", total: data.sneakers, icon: "figure.walk")
                Divider().padding(.vertical, 6)
                SneakersView()
            }
        }
    }

    // MARK: - Connect-style sections

    private func discogsSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Vinyl", total: data.vinyl ?? 0, icon: "music.note")
                Divider().padding(.vertical, 6)
                DiscogsInlineView(vm: discogsVM)
            }
        }
    }

    private func krakenSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Kraken", total: data.kraken, icon: "chart.line.uptrend.xyaxis.circle.fill")
                Divider().padding(.vertical, 6)
                KrakenInlineView(vm: krakenVM, isConnected: data.connections.kraken, onConnect: {
                    showKrakenKeyEntry = true
                })
            }
        }
        .sheet(isPresented: $showKrakenKeyEntry) {
            KrakenKeyEntryView(vm: krakenVM)
        }
    }

    private func ynabSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "YNAB", total: data.ynab, icon: "dollarsign.circle.fill")
                Divider().padding(.vertical, 6)
                YnabInlineView(vm: ynabVM, isConnected: data.connections.ynab)
            }
        }
    }

    private func kalshiSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Kalshi", total: data.kalshi ?? 0, icon: "chart.pie.fill")
                Divider().padding(.vertical, 6)
                KalshiInlineView(vm: kalshiVM, isConnected: kalshiVM.isConnected || (data.connections.kalshi ?? false))
            }
        }
    }

    private func polymarketSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Polymarket", total: data.polymarket ?? 0, icon: "chart.xyaxis.line")
                Divider().padding(.vertical, 6)
                PolymarketInlineView(vm: polymarketVM)
            }
        }
    }

    // MARK: - Debts + Performance

    private func debtsSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Debts", total: data.debts, icon: "creditcard.fill")
                if spinwheelVM.isConnected {
                    if let score = spinwheelVM.creditScore {
                        Divider().padding(.vertical, 6)
                        HStack {
                            Label("Credit score", systemImage: "chart.bar.fill")
                                .font(.caption)
                                .foregroundStyle(CoinyTheme.ink2)
                            Spacer()
                            Text("\(score)")
                                .font(.caption.monospacedDigit().weight(.semibold))
                        }
                    }
                    if let utilization = spinwheelVM.creditUtilization {
                        Divider().padding(.vertical, 6)
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Label("Credit utilization", systemImage: "percent")
                                    .font(.caption)
                                    .foregroundStyle(CoinyTheme.ink2)
                                Spacer()
                                Text("\(utilization, specifier: "%.1f")%")
                                    .font(.caption.monospacedDigit())
                            }
                            ProgressView(value: min(utilization / 100, 1))
                        }
                    }
                }
                Divider().padding(.vertical, 6)
                SpinwheelInlineView(vm: spinwheelVM)
            }
        }
    }

    private func performanceSection() -> some View {
        PerformanceView()
    }

    // MARK: - Shared header helper

    /// One heading treatment for all 25 sections. It used to take a per-section
    /// `color:` and paint the heading text with it, which produced eleven hues
    /// on one screen (design-direction 4.2: exactly one accent) and put 23 of
    /// the 25 headings below 4.5:1. Headings are ink; the amount beside them is
    /// ink too, because an amount is an absolute value (4.3 rule 1).
    func sectionHeader(title: String, total: Double, icon: String) -> some View {
        HStack {
            Label(title, systemImage: icon)
                .font(.headline)
                .foregroundStyle(CoinyTheme.ink)
                .accessibilityAddTraits(.isHeader)
            Spacer()
            Text(total, format: .currency(code: "USD"))
                .font(.headline.monospacedDigit())
                .foregroundStyle(CoinyTheme.ink)
        }
    }
}

#Preview {
    NavigationStack {
        ManageAccountsView()
            .environment(NetWorthViewModel())
    }
}
