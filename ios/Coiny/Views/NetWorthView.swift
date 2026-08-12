import SwiftUI

struct NetWorthView: View {
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
        NavigationStack {
            content
                .navigationTitle("Wealth")
                .refreshable { await reload() }
        }
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
                    netWorthHeader(data)
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
                    .buttonStyle(.borderedProminent)
            }
        }
    }

    // MARK: - Header

    private func netWorthHeader(_ data: NetWorthResponse) -> some View {
        VStack(spacing: 4) {
            Text("Net Worth")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text(data.total, format: .currency(code: "USD"))
                .font(.system(size: 48, weight: .bold, design: .rounded))
                .foregroundStyle(data.total >= 0 ? .green : .red)
        }
        .padding(.vertical, 16)
    }
}

// MARK: - Section builders

extension NetWorthView {

    // MARK: - Plaid sections

    private func bankSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Bank", total: data.bank, icon: "building.columns.fill", color: .blue)
                if let months = data.liquidCashMonths {
                    Divider().padding(.vertical, 6)
                    HStack {
                        Label("Emergency runway", systemImage: "shield.fill")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("\(months, specifier: "%.1f") mo")
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(months >= 3 ? .green : months >= 1 ? .orange : .red)
                    }
                }
                if data.accounts.bank.isEmpty {
                    Text("No bank accounts linked")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.top, 8)
                } else {
                    ForEach(data.accounts.bank) { account in
                        Divider().padding(.vertical, 6)
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(account.name).font(.subheadline)
                                Text(account.type.capitalized).font(.caption).foregroundStyle(.secondary)
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
                sectionHeader(title: "Investments", total: data.investments, icon: "chart.bar.fill", color: .green)
                if data.accounts.investments.isEmpty {
                    Text("No investment accounts linked")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.top, 8)
                } else {
                    ForEach(data.accounts.investments) { holding in
                        Divider().padding(.vertical, 6)
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(holding.name ?? holding.ticker ?? "Holding").font(.subheadline)
                                if let ticker = holding.ticker {
                                    Text(ticker).font(.caption).foregroundStyle(.secondary)
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
                sectionHeader(title: "Crypto", total: data.crypto, icon: "bitcoinsign.circle.fill", color: .orange)
                if !data.accounts.crypto.isEmpty {
                    ForEach(data.accounts.crypto) { position in
                        Divider().padding(.vertical, 6)
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(position.name).font(.subheadline)
                                Text("\(position.amount, specifier: "%.4f") \(position.symbol)")
                                    .font(.caption).foregroundStyle(.secondary)
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
                sectionHeader(title: "DeFi", total: data.defi, icon: "link.circle.fill", color: .purple)
                Divider().padding(.vertical, 6)
                ZerionView()
            }
        }
    }

    private func chainWalletsSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "On-chain", total: data.chainWallets, icon: "bitcoinsign.square.fill", color: .yellow)
                Divider().padding(.vertical, 6)
                ChainWalletsView()
            }
        }
    }

    private func hyperliquidSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Hyperliquid", total: data.hyperliquid, icon: "chart.line.uptrend.xyaxis", color: .indigo)
                Divider().padding(.vertical, 6)
                HyperliquidView()
            }
        }
    }

    private func nftSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "NFT Wallets", total: data.nft ?? 0, icon: "photo.stack", color: .purple)
                Divider().padding(.vertical, 6)
                NftView()
            }
        }
    }


    private func alpacaSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Alpaca", total: data.alpaca ?? 0, icon: "chart.bar.xaxis", color: .green)
                Divider().padding(.vertical, 6)
                AlpacaView()
            }
        }
    }

    private func manualAssetsSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Other Assets", total: data.manual ?? 0, icon: "archivebox.fill", color: .brown)
                Divider().padding(.vertical, 6)
                ManualAssetsView()
            }
        }
    }

    // MARK: - Add-your-own asset sections

    private func metalsSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Precious Metals", total: data.metals, icon: "sparkles", color: .yellow)
                Divider().padding(.vertical, 6)
                MetalsView()
            }
        }
    }

    private func realEstateSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Real Estate", total: data.realEstate, icon: "house.fill", color: .brown)
                Divider().padding(.vertical, 6)
                RealEstateView()
            }
        }
    }

    private func vehiclesSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Vehicles", total: data.vehicles, icon: "car.fill", color: .teal)
                Divider().padding(.vertical, 6)
                VehiclesView()
            }
        }
    }

    private func sneakersSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Sneakers", total: data.sneakers, icon: "figure.walk", color: .pink)
                Divider().padding(.vertical, 6)
                SneakersView()
            }
        }
    }

    // MARK: - Connect-style sections

    private func discogsSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Vinyl", total: data.vinyl ?? 0, icon: "music.note", color: .purple)
                Divider().padding(.vertical, 6)
                DiscogsInlineView(vm: discogsVM)
            }
        }
    }

    private func krakenSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Kraken", total: data.kraken, icon: "chart.line.uptrend.xyaxis.circle.fill", color: .cyan)
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
                sectionHeader(title: "YNAB", total: data.ynab, icon: "dollarsign.circle.fill", color: .green)
                Divider().padding(.vertical, 6)
                YnabInlineView(vm: ynabVM, isConnected: data.connections.ynab)
            }
        }
    }

    private func kalshiSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Kalshi", total: data.kalshi ?? 0, icon: "chart.pie.fill", color: .indigo)
                Divider().padding(.vertical, 6)
                KalshiInlineView(vm: kalshiVM, isConnected: kalshiVM.isConnected || (data.connections.kalshi ?? false))
            }
        }
    }

    private func polymarketSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Polymarket", total: data.polymarket ?? 0, icon: "chart.xyaxis.line", color: .purple)
                Divider().padding(.vertical, 6)
                PolymarketInlineView(vm: polymarketVM)
            }
        }
    }

    // MARK: - Debts + Performance

    private func debtsSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Debts", total: data.debts, icon: "creditcard.fill", color: .red)
                if spinwheelVM.isConnected {
                    if let score = spinwheelVM.creditScore {
                        Divider().padding(.vertical, 6)
                        HStack {
                            Label("Credit score", systemImage: "chart.bar.fill")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text("\(score)")
                                .font(.caption.monospacedDigit().weight(.semibold))
                                .foregroundStyle(score >= 740 ? .green : score >= 670 ? .orange : .red)
                        }
                    }
                    if let utilization = spinwheelVM.creditUtilization {
                        Divider().padding(.vertical, 6)
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Label("Credit utilization", systemImage: "percent")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Text("\(utilization, specifier: "%.1f")%")
                                    .font(.caption.monospacedDigit())
                                    .foregroundStyle(utilization <= 30 ? .green : utilization <= 50 ? .orange : .red)
                            }
                            ProgressView(value: min(utilization / 100, 1))
                                .tint(utilization <= 30 ? .green : utilization <= 50 ? .orange : .red)
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

    func sectionHeader(title: String, total: Double, icon: String, color: Color) -> some View {
        HStack {
            Label(title, systemImage: icon)
                .font(.headline)
                .foregroundStyle(color)
            Spacer()
            Text(total, format: .currency(code: "USD"))
                .font(.headline.monospacedDigit())
                .foregroundStyle(total < 0 ? .red : .primary)
        }
    }
}

#Preview {
    NetWorthView()
        .environment(NetWorthViewModel())
}
