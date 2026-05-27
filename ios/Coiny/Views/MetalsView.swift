import SwiftUI

struct MetalsView: View {
    @Environment(MetalsViewModel.self) private var vm
    @State private var showingAdd = false
    @State private var newMetal = "XAU"
    @State private var newWeightOz = ""
    @State private var newLabel = ""

    private let metalOptions = ["XAU", "XAG", "XPT", "XPD"]
    private let metalNames = ["XAU": "Gold", "XAG": "Silver", "XPT": "Platinum", "XPD": "Palladium"]

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else if vm.holdings.isEmpty {
                emptyState
            } else {
                holdingsList
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
            Text("No metals added")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Button { showingAdd = true } label: {
                Label("Add", systemImage: "plus.circle").font(.caption)
            }
        }
        .padding(.top, 4)
    }

    private var holdingsList: some View {
        VStack(spacing: 0) {
            ForEach(vm.holdings) { holding in
                Divider().padding(.vertical, 6)
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(holding.label ?? metalNames[holding.metal] ?? holding.metal)
                            .font(.subheadline)
                        Text("\(holding.weightOz, specifier: "%.3f") oz \(holding.metal)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    if let value = holding.lastValueUsd {
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
                        Task { await vm.removeHolding(holding) }
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
                Section("Metal") {
                    Picker("Metal", selection: $newMetal) {
                        ForEach(metalOptions, id: \.self) { m in
                            Text(metalNames[m] ?? m).tag(m)
                        }
                    }
                    .pickerStyle(.segmented)
                }
                Section("Weight (troy oz)") {
                    TextField("e.g. 1.000", text: $newWeightOz)
                        .keyboardType(.decimalPad)
                }
                Section("Label (optional)") {
                    TextField("e.g. Gold bar", text: $newLabel)
                }
            }
            .navigationTitle("Add Metal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showingAdd = false
                        resetForm()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let m = newMetal
                        let oz = Double(newWeightOz) ?? 0
                        let lbl = newLabel.isEmpty ? nil : newLabel
                        showingAdd = false
                        resetForm()
                        Task { await vm.addHolding(metal: m, weightOz: oz, label: lbl) }
                    }
                    .disabled((Double(newWeightOz) ?? 0) <= 0)
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func resetForm() {
        newMetal = "XAU"
        newWeightOz = ""
        newLabel = ""
    }
}
