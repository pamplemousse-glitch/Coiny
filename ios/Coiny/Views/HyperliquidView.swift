import SwiftUI

struct HyperliquidView: View {
    @Environment(HyperliquidViewModel.self) private var vm
    @State private var showingAdd = false
    @State private var newAddress = ""
    @State private var newLabel = ""

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else if vm.accounts.isEmpty {
                HStack {
                    Text("No Hyperliquid accounts added")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Button { showingAdd = true } label: {
                        Label("Add", systemImage: "plus.circle")
                            .font(.caption)
                    }
                }
                .padding(.top, 4)
            } else {
                ForEach(vm.accounts) { account in
                    Divider().padding(.vertical, 6)
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(account.label ?? account.address)
                                .font(.subheadline)
                                .lineLimit(1)
                            if account.label != nil {
                                Text(account.address)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                                    .truncationMode(.middle)
                            }
                        }
                        Spacer()
                        if let val = account.lastAccountValueUsd {
                            Text(val, format: .currency(code: "USD"))
                                .font(.subheadline.monospacedDigit())
                        } else {
                            Text("—")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .swipeActions {
                        Button(role: .destructive) {
                            Task { await vm.removeAccount(account) }
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
                    .foregroundStyle(.red)
                    .padding(.top, 4)
            }
        }
        .sheet(isPresented: $showingAdd) {
            addAccountSheet
        }
    }

    private var addAccountSheet: some View {
        NavigationStack {
            Form {
                Section("Wallet address") {
                    TextField("0x...", text: $newAddress)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                }
                Section("Label (optional)") {
                    TextField("e.g. Main", text: $newLabel)
                }
            }
            .navigationTitle("Add Hyperliquid Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showingAdd = false
                        newAddress = ""
                        newLabel = ""
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let addr = newAddress
                        let lbl = newLabel.isEmpty ? nil : newLabel
                        showingAdd = false
                        newAddress = ""
                        newLabel = ""
                        Task { await vm.addAccount(address: addr, label: lbl) }
                    }
                    .disabled(newAddress.isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }
}
