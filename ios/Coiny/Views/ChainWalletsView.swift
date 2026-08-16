import SwiftUI

struct ChainWalletsView: View {
    @Environment(ChainWalletsViewModel.self) private var vm
    @State private var showAddSheet = false
    @State private var newChain = "bitcoin"
    @State private var newAddress = ""
    @State private var newLabel = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            headerRow
            walletList
            addButton
            if vm.isSyncing || !vm.wallets.isEmpty {
                syncRow
            }
            if let error = vm.errorMessage {
                CoinyErrorLine(message: error)
            }
        }
        .sheet(isPresented: $showAddSheet) {
            addWalletSheet
        }
        .disabled(vm.isLoading)
    }

    private var headerRow: some View {
        HStack {
            Text("On-chain Wallets")
                .font(.headline)
            Spacer()
            if vm.isLoading { ProgressView() }
        }
    }

    private var walletList: some View {
        ForEach(vm.wallets) { wallet in
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        Text(wallet.chain.uppercased())
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(CoinyTheme.ink2)
                        if let label = wallet.label {
                            Text("· \(label)")
                                .font(.caption2)
                                .foregroundStyle(CoinyTheme.ink2)
                        }
                    }
                    Text(wallet.address)
                        .font(.caption.monospaced())
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    if let usd = wallet.lastBalanceUsd {
                        Text(usd, format: .currency(code: "USD"))
                            .font(.subheadline.monospacedDigit())
                    } else {
                        Text("—")
                            .font(.subheadline)
                            .foregroundStyle(CoinyTheme.ink2)
                    }
                    Button(role: .destructive) {
                        let c = wallet.chain; let a = wallet.address
                        Task { await vm.removeWallet(chain: c, address: a) }
                    } label: {
                        Image(systemName: "trash")
                            .font(.caption)
                            .foregroundStyle(CoinyTheme.negative)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.vertical, 2)
        }
    }

    private var addButton: some View {
        Button {
            newChain = "bitcoin"
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

            if let updated = vm.lastSyncUpdated {
                Text("\(updated) updated")
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.ink2)
            }
        }
    }

    private var addWalletSheet: some View {
        NavigationStack {
            Form {
                Section("Chain") {
                    Picker("Chain", selection: $newChain) {
                        ForEach(ChainWalletsViewModel.supportedChains, id: \.id) { chain in
                            Text(chain.display).tag(chain.id)
                        }
                    }
                }
                Section("Address") {
                    TextField("Address", text: $newAddress)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                }
                Section("Label (optional)") {
                    TextField("My cold wallet", text: $newLabel)
                }
            }
            .navigationTitle("Add Wallet")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let chain = newChain
                        let address = newAddress
                        let label = newLabel.isEmpty ? nil : newLabel
                        showAddSheet = false
                        Task { await vm.addWallet(chain: chain, address: address, label: label) }
                    }
                    .disabled(newAddress.isEmpty)
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showAddSheet = false }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

#Preview {
    ChainWalletsView()
        .environment(ChainWalletsViewModel())
        .padding()
}
