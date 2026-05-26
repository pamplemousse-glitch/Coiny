import SwiftUI

struct NetWorthView: View {
    @Environment(NetWorthViewModel.self) private var vm
    @State private var coinbaseVM = CoinbaseViewModel()
    @State private var zerionVM = ZerionViewModel()
    @State private var spinwheelVM = SpinwheelViewModel()
    @State private var chainWalletsVM = ChainWalletsViewModel()
    @State private var hyperliquidVM = HyperliquidViewModel()

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Wealth")
                .refreshable { await reload() }
        }
        .task { await reload() }
        .environment(coinbaseVM)
        .environment(zerionVM)
        .environment(chainWalletsVM)
        .environment(hyperliquidVM)
    }

    private func reload() async {
        async let netWorth: () = vm.load()
        async let coinbase: () = coinbaseVM.loadStatus()
        async let zerion: () = zerionVM.loadWallets()
        async let spinwheel: () = spinwheelVM.loadStatus()
        async let chainWallets: () = chainWalletsVM.loadWallets()
        async let hyperliquid: () = hyperliquidVM.loadAccounts()
        _ = await (netWorth, coinbase, zerion, spinwheel, chainWallets, hyperliquid)
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
                    cryptoSection(data)
                    defiSection(data)
                    chainWalletsSection(data)
                    hyperliquidSection(data)
                    debtsSection(data)
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

#Preview {
    NetWorthView()
        .environment(NetWorthViewModel())
}
