import SwiftUI

private let categoryLabels: [String: String] = [
    "art": "Art",
    "life_insurance": "Life Insurance",
    "luxury_handbags": "Luxury Handbags",
    "watches": "Watches",
    "wine": "Wine",
    "annuities": "Annuities",
    "pension": "Pension",
    "mineral_rights": "Mineral Rights",
    "intellectual_property": "Intellectual Property",
    "fractional_collectibles": "Fractional Collectibles",
    "crowdfunded_equity": "Crowdfunded Equity",
    "timeshare": "Timeshare",
    "aircraft": "Aircraft",
    "other": "Other",
]

private let allCategories: [String] = categoryLabels.keys.sorted()

struct ManualAssetsView: View {
    @Environment(ManualAssetsViewModel.self) private var vm
    @State private var showingAdd = false
    @State private var newName = ""
    @State private var newCategory = "other"
    @State private var newValue = ""
    @State private var newNotes = ""

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else if vm.assets.isEmpty {
                HStack {
                    Text("No manual assets added")
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
                ForEach(vm.assets) { asset in
                    Divider().padding(.vertical, 6)
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(asset.name)
                                .font(.subheadline)
                                .lineLimit(1)
                            Text(categoryLabels[asset.category] ?? asset.category)
                                .font(.caption2)
                                .foregroundStyle(CoinyTheme.ink2)
                        }
                        Spacer()
                        Text(asset.selfReportedValueUsd, format: .currency(code: "USD"))
                            .font(.subheadline.monospacedDigit())
                    }
                    .swipeActions {
                        Button(role: .destructive) {
                            Task { await vm.removeAsset(asset) }
                        } label: {
                            Label("Remove", systemImage: "trash")
                        }
                    }
                }
                Button { showingAdd = true } label: {
                    Label("Add Asset", systemImage: "plus.circle")
                        .font(.caption)
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
                Section("Asset Name") {
                    TextField("e.g. Rolex Submariner", text: $newName)
                }
                Section("Category") {
                    Picker("Category", selection: $newCategory) {
                        ForEach(allCategories, id: \.self) { cat in
                            Text(categoryLabels[cat] ?? cat).tag(cat)
                        }
                    }
                    .pickerStyle(.menu)
                }
                Section("Estimated Value (USD)") {
                    TextField("0.00", text: $newValue)
                        .keyboardType(.decimalPad)
                }
                Section("Notes (optional)") {
                    TextField("Purchased in 2019…", text: $newNotes)
                }
            }
            .navigationTitle("Add Manual Asset")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { resetForm(); showingAdd = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let name = newName
                        let category = newCategory
                        let value = Double(newValue) ?? 0
                        let notes = newNotes.isEmpty ? nil : newNotes
                        resetForm()
                        showingAdd = false
                        Task { await vm.addAsset(name: name, category: category, valueUsd: value, notes: notes) }
                    }
                    .disabled(newName.isEmpty || Double(newValue) == nil)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func resetForm() {
        newName = ""
        newCategory = "other"
        newValue = ""
        newNotes = ""
    }
}
