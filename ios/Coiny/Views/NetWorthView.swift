import SwiftUI

struct NetWorthView: View {
    @Environment(NetWorthViewModel.self) private var vm

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Wealth")
                .refreshable { await vm.load() }
        }
        .task { await vm.load() }
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
                Button("Retry") { Task { await vm.load() } }
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
                if !data.connections.coinbase {
                    notConnectedPrompt("Connect Coinbase in the Crypto tab")
                } else if data.accounts.crypto.isEmpty {
                    Text("No crypto holdings")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.top, 8)
                } else {
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
            }
        }
    }

    private func defiSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "DeFi", total: data.defi, icon: "link.circle.fill", color: .purple)
                if !data.connections.zerion {
                    notConnectedPrompt("Add wallets in the Crypto tab")
                } else {
                    Divider().padding(.vertical, 6)
                    HStack {
                        Text("Portfolio total").font(.subheadline)
                        Spacer()
                        Text(data.accounts.defi.totalUSD, format: .currency(code: "USD"))
                            .font(.subheadline.monospacedDigit())
                    }
                }
            }
        }
    }

    private func debtsSection(_ data: NetWorthResponse) -> some View {
        GroupBox {
            VStack(spacing: 0) {
                sectionHeader(title: "Debts", total: data.debts, icon: "creditcard.fill", color: .red)
                if !data.connections.spinwheel {
                    notConnectedPrompt("Connect via Debt tab")
                } else if data.accounts.debts.isEmpty {
                    Text("No debts found")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.top, 8)
                } else {
                    ForEach(data.accounts.debts) { debt in
                        Divider().padding(.vertical, 6)
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(debt.type ?? "Debt").font(.subheadline)
                                if let payment = debt.monthlyPayment {
                                    Text("$\(Int(payment))/mo").font(.caption).foregroundStyle(.secondary)
                                }
                            }
                            Spacer()
                            Text(-debt.balance, format: .currency(code: "USD"))
                                .font(.subheadline.monospacedDigit())
                                .foregroundStyle(.red)
                        }
                    }
                }
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

    private func notConnectedPrompt(_ hint: String) -> some View {
        Text(hint)
            .font(.caption)
            .foregroundStyle(.secondary)
            .padding(.top, 8)
    }
}

#Preview {
    NetWorthView()
        .environment(NetWorthViewModel())
}
