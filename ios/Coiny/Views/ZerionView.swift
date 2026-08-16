import SwiftUI

struct ZerionView: View {
    @Environment(ZerionViewModel.self) private var vm
    @State private var showAddSheet = false
    @State private var newAddress = ""
    @State private var newLabel = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            headerRow

            if let portfolio = vm.portfolio {
                portfolioRow(portfolio)
            }

            walletList

            addButton

            if vm.isSyncing || !vm.wallets.isEmpty {
                syncRow
            }

            if let error = vm.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.negative)
            }
        }
        .sheet(isPresented: $showAddSheet) {
            addWalletSheet
        }
        .disabled(vm.isLoading)
    }

    private var headerRow: some View {
        HStack {
            Text("Zerion / DeFi Wallets")
                .font(.headline)
            Spacer()
            if vm.isLoading {
                ProgressView()
            }
        }
    }

    private func portfolioRow(_ portfolio: ZerionPortfolio) -> some View {
        HStack {
            Text("Portfolio value")
                .font(.subheadline)
                .foregroundStyle(CoinyTheme.ink2)
            Spacer()
            Text(portfolio.data.attributes.total.positions, format: .currency(code: "USD"))
                .font(.subheadline.weight(.semibold))
                .monospacedDigit()
        }
    }

    private var walletList: some View {
        ForEach(vm.wallets) { wallet in
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(wallet.address)
                        .font(.caption.monospaced())
                        .lineLimit(1)
                        .truncationMode(.middle)
                    if let label = wallet.label {
                        Text(label)
                            .font(.caption2)
                            .foregroundStyle(CoinyTheme.ink2)
                    }
                }
                Spacer()
                Button(role: .destructive) {
                    if let idx = vm.wallets.firstIndex(where: { $0.id == wallet.id }) {
                        Task { await vm.removeWallet(at: IndexSet(integer: idx)) }
                    }
                } label: {
                    Image(systemName: "trash")
                        .foregroundStyle(CoinyTheme.negative)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var addButton: some View {
        Button {
            newAddress = ""
            newLabel = ""
            showAddSheet = true
        } label: {
            Label("Add wallet", systemImage: "plus")
        }
        .buttonStyle(.bordered)
    }

    private var syncRow: some View {
        HStack {
            Button {
                Task { await vm.sync() }
            } label: {
                HStack {
                    if vm.isSyncing { ProgressView().controlSize(.small) }
                    Text("Sync now")
                }
            }
            .buttonStyle(.bordered)
            .disabled(vm.isSyncing)

            if let reacted = vm.lastSyncReacted {
                Text("\(reacted) reaction\(reacted == 1 ? "" : "s") fired")
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.ink2)
            }
        }
    }

    private var addWalletSheet: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("0x…", text: $newAddress)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                    TextField("Label (optional)", text: $newLabel)
                }
            }
            .navigationTitle("Add Wallet")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let address = newAddress
                        let label = newLabel.isEmpty ? nil : newLabel
                        showAddSheet = false
                        Task { await vm.addWallet(address: address, label: label) }
                    }
                    .disabled(newAddress.isEmpty)
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showAddSheet = false }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

#Preview {
    ZerionView()
        .environment(ZerionViewModel())
        .padding()
}
