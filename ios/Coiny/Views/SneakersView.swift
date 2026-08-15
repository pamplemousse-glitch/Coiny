import SwiftUI

struct SneakersView: View {
    @Environment(SneakersViewModel.self) private var vm
    @State private var showingAdd = false
    @State private var newSku = ""
    @State private var newSize = ""
    @State private var newDescription = ""
    @State private var newQuantity = "1"

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
                CoinyErrorLine(message: error)
                    .padding(.top, 4)
            }
        }
        .sheet(isPresented: $showingAdd) { addSheet }
    }

    private var emptyState: some View {
        HStack {
            Text("No sneakers added")
                .font(.caption)
                .foregroundStyle(CoinyTheme.ink2)
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
                        Text(holding.description ?? holding.sku)
                            .font(.subheadline)
                            .lineLimit(1)
                        HStack(spacing: 6) {
                            Text(holding.sku)
                                .font(.caption)
                                .foregroundStyle(CoinyTheme.ink2)
                            if let size = holding.size {
                                Text("Sz \(size)")
                                    .font(.caption)
                                    .foregroundStyle(CoinyTheme.ink2)
                            }
                            if holding.quantity > 1 {
                                Text("×\(holding.quantity)")
                                    .font(.caption)
                                    .foregroundStyle(CoinyTheme.ink2)
                            }
                        }
                    }
                    Spacer()
                    if let price = holding.lastPriceUsd {
                        Text(price * Double(holding.quantity), format: .currency(code: "USD"))
                            .font(.subheadline.monospacedDigit())
                    } else {
                        Text("—")
                            .font(.subheadline)
                            .foregroundStyle(CoinyTheme.ink2)
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
                Section("SKU") {
                    TextField("e.g. DD1391-100", text: $newSku)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.characters)
                }
                Section("Size (optional)") {
                    TextField("e.g. 10.5", text: $newSize)
                        .keyboardType(.decimalPad)
                }
                Section("Description (optional)") {
                    TextField("e.g. Air Jordan 1 Chicago", text: $newDescription)
                }
                Section("Quantity") {
                    TextField("1", text: $newQuantity)
                        .keyboardType(.numberPad)
                }
            }
            .navigationTitle("Add Sneaker")
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
                        let sku = newSku
                        let size = newSize.isEmpty ? nil : newSize
                        let desc = newDescription.isEmpty ? nil : newDescription
                        let qty = Int(newQuantity) ?? 1
                        showingAdd = false
                        resetForm()
                        Task { await vm.addHolding(sku: sku, size: size, description: desc, quantity: qty) }
                    }
                    .disabled(newSku.isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func resetForm() {
        newSku = ""
        newSize = ""
        newDescription = ""
        newQuantity = "1"
    }
}
