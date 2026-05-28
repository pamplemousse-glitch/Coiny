import SwiftUI

struct RealEstateView: View {
    @Environment(RealEstateViewModel.self) private var vm
    @State private var showingAdd = false
    @State private var newAddress = ""
    @State private var newLabel = ""

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else if vm.assets.isEmpty {
                emptyState
            } else {
                assetsList
            }
            if let error = vm.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.top, 4)
            }
        }
        .sheet(isPresented: $showingAdd) { addSheet }
    }

    private var emptyState: some View {
        HStack {
            Text("No properties added")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Button { showingAdd = true } label: {
                Label("Add", systemImage: "plus.circle").font(.caption)
            }
        }
        .padding(.top, 4)
    }

    private var assetsList: some View {
        VStack(spacing: 0) {
            ForEach(vm.assets) { asset in
                Divider().padding(.vertical, 6)
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(asset.label ?? asset.address)
                            .font(.subheadline)
                            .lineLimit(1)
                        if asset.label != nil {
                            Text(asset.address)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }
                    Spacer()
                    if let value = asset.lastValueUsd {
                        Text(value, format: .currency(code: "USD"))
                            .font(.subheadline.monospacedDigit())
                    } else {
                        Text("—")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .swipeActions {
                    Button(role: .destructive) {
                        Task { await vm.removeAsset(asset) }
                    } label: {
                        Label("Remove", systemImage: "trash")
                    }
                }
            }
            HStack {
                Button { showingAdd = true } label: {
                    Label("Add", systemImage: "plus.circle").font(.caption)
                }
                Spacer()
                Button { Task { await vm.sync() } } label: {
                    if let synced = vm.lastSynced {
                        Label("Synced \(synced)", systemImage: "checkmark.circle").font(.caption)
                    } else {
                        Label("Sync", systemImage: "arrow.clockwise").font(.caption)
                    }
                }
            }
            .padding(.top, 6)
        }
    }

    private var addSheet: some View {
        NavigationStack {
            Form {
                Section("Property address") {
                    TextField("123 Main St, City, State", text: $newAddress)
                        .textContentType(.fullStreetAddress)
                }
                Section("Label (optional)") {
                    TextField("e.g. Primary home", text: $newLabel)
                }
            }
            .navigationTitle("Add Property")
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
                        Task { await vm.addAsset(address: addr, label: lbl) }
                    }
                    .disabled(newAddress.isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }
}
