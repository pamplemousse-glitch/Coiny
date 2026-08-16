import SwiftUI

struct NftView: View {
    @Environment(NftViewModel.self) private var vm
    @State private var showingAdd = false
    @State private var newAddress = ""
    @State private var newLabel = ""

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else if vm.wallets.isEmpty {
                HStack {
                    Text("No NFT wallets added")
                        .font(.caption)
                        .foregroundStyle(CoinyTheme.ink2)
                    Spacer()
                    Button { showingAdd = true } label: {
                        Label("Add", systemImage: "plus.circle")
                            .font(.caption)
                    }
                }
                .padding(.top, 4)
            } else {
                ForEach(vm.wallets) { wallet in
                    Divider().padding(.vertical, 6)
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(wallet.label ?? wallet.address)
                                .font(.subheadline)
                                .lineLimit(1)
                            if wallet.label != nil {
                                Text(wallet.address)
                                    .font(.caption2)
                                    .foregroundStyle(CoinyTheme.ink2)
                                    .lineLimit(1)
                                    .truncationMode(.middle)
                            }
                        }
                        Spacer()
                        if let val = wallet.lastValueUsd {
                            Text(val, format: .currency(code: "USD"))
                                .font(.subheadline.monospacedDigit())
                        } else {
                            Text("—")
                                .font(.subheadline)
                                .foregroundStyle(CoinyTheme.ink2)
                        }
                    }
                    .swipeActions {
                        Button(role: .destructive) {
                            Task { await vm.removeWallet(wallet) }
                        } label: {
                            Label("Remove", systemImage: "trash")
                        }
                    }
                }
                HStack {
                    Button { showingAdd = true } label: {
                        Label("Add", systemImage: "plus.circle")
                            .font(.caption)
                    }
                    Spacer()
                    Button {
                        Task { await vm.sync() }
                    } label: {
                        if let updated = vm.lastSyncUpdated {
                            Label("Synced \(updated)", systemImage: "checkmark.circle")
                                .font(.caption)
                        } else {
                            Label("Sync", systemImage: "arrow.clockwise")
                                .font(.caption)
                        }
                    }
                }
                .padding(.top, 6)
            }
            if let error = vm.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.negative)
                    .padding(.top, 4)
            }
        }
        .sheet(isPresented: $showingAdd) { addSheet }
    }

    private var addSheet: some View {
        NavigationStack {
            Form {
                Section("Ethereum Wallet Address") {
                    TextField("0x…", text: $newAddress)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                }
                Section("Label (optional)") {
                    TextField("e.g. Main Wallet", text: $newLabel)
                }
            }
            .navigationTitle("Add NFT Wallet")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { resetForm(); showingAdd = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let addr = newAddress
                        let lbl = newLabel.isEmpty ? nil : newLabel
                        resetForm()
                        showingAdd = false
                        Task { await vm.addWallet(address: addr, label: lbl) }
                    }
                    .disabled(newAddress.isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func resetForm() {
        newAddress = ""
        newLabel = ""
    }
}
