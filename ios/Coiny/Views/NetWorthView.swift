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
    @State private var snaptradeVM = SnapTradeViewModel()
    @State private var ynabVM = YnabViewModel()
    @State private var kalshiVM = KalshiViewModel()
    @State private var discogsVM = DiscogsViewModel()

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
        _ = await (netWorth, coinbase, zerion, spinwheel, performance, chainWallets,
                   hyperliquid, metals, sneakers, realEstate, vehicles, kalshi, discogs)
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
                    metalsSection(data)
                    realEstateSection(data)
                    vehiclesSection(data)
                    sneakersSection(data)
                    discogsSection(data)
                    krakenSection(data)
                    snaptradeSection(data)
                    ynabSection(data)
                    kalshiSection(data)
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
                KrakenInlineView(vm: krakenVM, isConnected: data.connections.kraken)
            }
        }
    }

    private func snaptradeSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Brokerage", total: data.snaptrade, icon: "building.2.fill", color: .mint)
                Divider().padding(.vertical, 6)
                SnapTradeInlineView(vm: snaptradeVM, isConnected: data.connections.snaptrade)
            }
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

    private func sectionHeader(title: String, total: Double, icon: String, color: Color) -> some View {
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

// MARK: - Spinwheel inline (existing, unchanged)

private struct SpinwheelInlineView: View {
    let vm: SpinwheelViewModel

    var body: some View {
        if vm.isLoading {
            ProgressView("Checking status…")
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
        } else if vm.isConnected {
            connectedContent
        } else if vm.showOtpEntry {
            OtpInlineView(vm: vm)
        } else {
            PhoneInlineView(vm: vm)
        }
    }

    @ViewBuilder
    private var connectedContent: some View {
        if vm.debts.isEmpty {
            Text("No debts found")
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.top, 4)
        } else {
            ForEach(vm.debts) { debt in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(debt.debtType?.capitalized ?? "Debt").font(.subheadline)
                        if let monthly = debt.monthlyPayment {
                            Text("\(monthly, format: .currency(code: "USD"))/mo")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    Spacer()
                    if let balance = debt.balance {
                        Text(-balance, format: .currency(code: "USD"))
                            .font(.subheadline.monospacedDigit())
                            .foregroundStyle(.red)
                    }
                }
                .padding(.vertical, 2)
            }
        }
        Button("Disconnect Spinwheel", role: .destructive) {
            Task { await vm.disconnect() }
        }
        .font(.caption)
        .padding(.top, 4)
    }
}

private struct PhoneInlineView: View {
    let vm: SpinwheelViewModel
    @State private var phone = ""
    @State private var dob = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Connect debt tracker")
                .font(.subheadline.weight(.semibold))
            TextField("Phone (+1…)", text: $phone)
                .keyboardType(.phonePad)
                .textContentType(.telephoneNumber)
                .textFieldStyle(.roundedBorder)
            TextField("Date of birth (YYYY-MM-DD)", text: $dob)
                .keyboardType(.numbersAndPunctuation)
                .textFieldStyle(.roundedBorder)
            if let error = vm.errorMessage {
                Text(error).font(.caption).foregroundStyle(.red)
            }
            Button("Send code") {
                let p = phone; let d = dob
                Task { await vm.sendOtp(phone: p, dateOfBirth: d) }
            }
            .buttonStyle(.borderedProminent)
            .disabled(phone.isEmpty || dob.isEmpty)
        }
        .padding(.top, 4)
    }
}

private struct OtpInlineView: View {
    let vm: SpinwheelViewModel
    @State private var code = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Enter the code sent to \(vm.pendingPhone)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            TextField("6-digit code", text: $code)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .textFieldStyle(.roundedBorder)
            if let error = vm.errorMessage {
                Text(error).font(.caption).foregroundStyle(.red)
            }
            Button("Verify") {
                let c = code
                Task { await vm.verifyOtp(code: c) }
            }
            .buttonStyle(.borderedProminent)
            .disabled(code.isEmpty)
        }
        .padding(.top, 4)
    }
}

// MARK: - Kraken inline

private struct KrakenInlineView: View {
    let vm: KrakenViewModel
    let isConnected: Bool
    @State private var showingConnect = false
    @State private var apiKey = ""
    @State private var privateKey = ""

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else if isConnected {
                connectedView
            } else {
                disconnectedView
            }
            if let error = vm.errorMessage {
                Text(error).font(.caption).foregroundStyle(.red).padding(.top, 4)
            }
        }
        .sheet(isPresented: $showingConnect) { connectSheet }
    }

    private var disconnectedView: some View {
        HStack {
            Text("Connect Kraken exchange")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Button("Connect") { showingConnect = true }
                .font(.caption)
                .buttonStyle(.bordered)
        }
        .padding(.top, 4)
    }

    private var connectedView: some View {
        HStack {
            Button("Sync") { Task { await vm.sync() } }
                .font(.caption)
                .buttonStyle(.bordered)
            Spacer()
            Button("Disconnect", role: .destructive) { Task { await vm.disconnect() } }
                .font(.caption)
        }
        .padding(.top, 4)
    }

    private var connectSheet: some View {
        NavigationStack {
            Form {
                Section("API Key") {
                    TextField("API Key", text: $apiKey)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                }
                Section("Private Key") {
                    SecureField("Private Key", text: $privateKey)
                }
            }
            .navigationTitle("Connect Kraken")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showingConnect = false
                        apiKey = ""
                        privateKey = ""
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Connect") {
                        let k = apiKey; let p = privateKey
                        showingConnect = false
                        apiKey = ""
                        privateKey = ""
                        Task { await vm.connect(apiKey: k, privateKey: p) }
                    }
                    .disabled(apiKey.isEmpty || privateKey.isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - SnapTrade inline

private struct SnapTradeInlineView: View {
    let vm: SnapTradeViewModel
    let isConnected: Bool
    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else if isConnected {
                connectedView
            } else {
                disconnectedView
            }
            if let error = vm.errorMessage {
                Text(error).font(.caption).foregroundStyle(.red).padding(.top, 4)
            }
        }
        .onChange(of: vm.redirectUrl) { _, url in
            guard let url, let u = URL(string: url) else { return }
            openURL(u)
        }
    }

    private var disconnectedView: some View {
        HStack {
            Text("Link your brokerages")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Button("Connect") { Task { await vm.connect() } }
                .font(.caption)
                .buttonStyle(.bordered)
        }
        .padding(.top, 4)
    }

    private var connectedView: some View {
        HStack {
            Button("Sync") { Task { await vm.sync() } }
                .font(.caption)
                .buttonStyle(.bordered)
            Spacer()
            Button("Disconnect", role: .destructive) { Task { await vm.disconnect() } }
                .font(.caption)
        }
        .padding(.top, 4)
    }
}

// MARK: - YNAB inline

private struct YnabInlineView: View {
    let vm: YnabViewModel
    let isConnected: Bool
    @State private var showingConnect = false
    @State private var apiKey = ""

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else if isConnected {
                connectedView
            } else {
                disconnectedView
            }
            if let error = vm.errorMessage {
                Text(error).font(.caption).foregroundStyle(.red).padding(.top, 4)
            }
        }
        .sheet(isPresented: $showingConnect) { connectSheet }
    }

    private var disconnectedView: some View {
        HStack {
            Text("Connect YNAB budgeting")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Button("Connect") { showingConnect = true }
                .font(.caption)
                .buttonStyle(.bordered)
        }
        .padding(.top, 4)
    }

    private var connectedView: some View {
        HStack {
            Button("Sync") { Task { await vm.sync() } }
                .font(.caption)
                .buttonStyle(.bordered)
            Spacer()
            Button("Disconnect", role: .destructive) { Task { await vm.disconnect() } }
                .font(.caption)
        }
        .padding(.top, 4)
    }

    private var connectSheet: some View {
        NavigationStack {
            Form {
                Section {
                    SecureField("Personal access token", text: $apiKey)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                } header: {
                    Text("YNAB API Key")
                } footer: {
                    Text("Find your token at app.ynab.com → Account Settings → Developer Settings")
                        .font(.caption2)
                }
            }
            .navigationTitle("Connect YNAB")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showingConnect = false
                        apiKey = ""
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Connect") {
                        let k = apiKey
                        showingConnect = false
                        apiKey = ""
                        Task { await vm.connect(apiKey: k) }
                    }
                    .disabled(apiKey.isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Kalshi inline

private struct KalshiInlineView: View {
    let vm: KalshiViewModel
    let isConnected: Bool
    @State private var showingConnect = false
    @State private var keyId = ""
    @State private var privateKeyBase64 = ""

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else if isConnected {
                connectedView
            } else {
                disconnectedView
            }
            if let error = vm.errorMessage {
                Text(error).font(.caption).foregroundStyle(.red).padding(.top, 4)
            }
        }
        .sheet(isPresented: $showingConnect) { connectSheet }
    }

    private var disconnectedView: some View {
        HStack {
            Text("Connect Kalshi prediction markets")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Button("Connect") { showingConnect = true }
                .font(.caption)
                .buttonStyle(.bordered)
        }
        .padding(.top, 4)
    }

    private var connectedView: some View {
        HStack {
            Button("Sync") { Task { await vm.sync() } }
                .font(.caption)
                .buttonStyle(.bordered)
            Spacer()
            Button("Disconnect", role: .destructive) { Task { await vm.disconnect() } }
                .font(.caption)
        }
        .padding(.top, 4)
    }

    private var connectSheet: some View {
        NavigationStack {
            Form {
                Section("Key ID") {
                    TextField("Key ID", text: $keyId)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                }
                Section("Private Key (Base64)") {
                    SecureField("Base64-encoded private key", text: $privateKeyBase64)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                }
            }
            .navigationTitle("Connect Kalshi")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showingConnect = false
                        keyId = ""
                        privateKeyBase64 = ""
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Connect") {
                        let k = keyId; let p = privateKeyBase64
                        showingConnect = false
                        keyId = ""
                        privateKeyBase64 = ""
                        Task { await vm.connect(keyId: k, privateKeyBase64: p) }
                    }
                    .disabled(keyId.isEmpty || privateKeyBase64.isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Discogs inline (OAuth OOB)

private struct DiscogsInlineView: View {
    let vm: DiscogsViewModel
    @State private var pin = ""
    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else if vm.isConnected {
                connectedView
            } else if vm.authorizeUrl != nil {
                pinEntryView
            } else {
                disconnectedView
            }
            if let error = vm.errorMessage {
                Text(error).font(.caption).foregroundStyle(.red).padding(.top, 4)
            }
        }
        .onChange(of: vm.authorizeUrl) { _, url in
            guard let url, let u = URL(string: url) else { return }
            openURL(u)
        }
    }

    private var disconnectedView: some View {
        HStack {
            Text("Connect Discogs vinyl collection")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Button("Connect") { Task { await vm.requestToken() } }
                .font(.caption)
                .buttonStyle(.bordered)
        }
        .padding(.top, 4)
    }

    private var pinEntryView: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Authorize in Discogs, then enter the PIN")
                .font(.caption)
                .foregroundStyle(.secondary)
            HStack {
                TextField("PIN", text: $pin)
                    .keyboardType(.numberPad)
                    .textFieldStyle(.roundedBorder)
                Button("Verify") {
                    let p = pin
                    pin = ""
                    Task { await vm.verifyPin(p) }
                }
                .buttonStyle(.bordered)
                .disabled(pin.isEmpty)
            }
        }
        .padding(.top, 4)
    }

    private var connectedView: some View {
        VStack(spacing: 6) {
            if let username = vm.username {
                HStack {
                    Label(username, systemImage: "person.fill")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                }
            }
            HStack {
                Button("Sync") { Task { await vm.sync() } }
                    .font(.caption)
                    .buttonStyle(.bordered)
                Spacer()
                Button("Disconnect", role: .destructive) { Task { await vm.disconnect() } }
                    .font(.caption)
            }
        }
        .padding(.top, 4)
    }
}

#Preview {
    NetWorthView()
        .environment(NetWorthViewModel())
}
