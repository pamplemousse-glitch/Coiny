import SwiftUI

struct VehiclesView: View {
    @Environment(VehiclesViewModel.self) private var vm
    @State private var showingAdd = false
    @State private var newVin = ""
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
                CoinyErrorLine(message: error)
                    .padding(.top, 4)
            }
        }
        .sheet(isPresented: $showingAdd) { addSheet }
    }

    private var emptyState: some View {
        HStack {
            Text("No vehicles added")
                .font(.caption)
                .foregroundStyle(CoinyTheme.ink2)
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
                        Text(asset.label ?? asset.vin)
                            .font(.subheadline)
                            .lineLimit(1)
                        if asset.label != nil {
                            Text(asset.vin)
                                .font(.caption2)
                                .foregroundStyle(CoinyTheme.ink2)
                        }
                    }
                    Spacer()
                    if let value = asset.lastValueUsd {
                        Text(value, format: .currency(code: "USD"))
                            .font(.subheadline.monospacedDigit())
                    } else {
                        Text("—")
                            .font(.subheadline)
                            .foregroundStyle(CoinyTheme.ink2)
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
                Section("VIN") {
                    TextField("17-character VIN", text: $newVin)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.characters)
                }
                Section("Label (optional)") {
                    TextField("e.g. Daily driver", text: $newLabel)
                }
            }
            .navigationTitle("Add Vehicle")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showingAdd = false
                        newVin = ""
                        newLabel = ""
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let vin = newVin
                        let lbl = newLabel.isEmpty ? nil : newLabel
                        showingAdd = false
                        newVin = ""
                        newLabel = ""
                        Task { await vm.addAsset(vin: vin, label: lbl) }
                    }
                    .disabled(newVin.isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }
}
