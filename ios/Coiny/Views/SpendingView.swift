import SwiftUI

struct SpendingView: View {
    @Environment(PetStore.self) private var store
    @State private var summary: SpendingSummaryResponse?
    @State private var overrides: [SpendingOverride] = []
    @State private var showAddOverride = false
    @State private var newMerchant = ""
    @State private var newCategory = ""

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Activity")
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        NavigationLink {
                            SubscriptionsView()
                        } label: {
                            Image(systemName: "arrow.clockwise.circle")
                        }
                        .accessibilityLabel("Subscriptions")
                    }
                }
                .refreshable {
                    await store.refresh()
                    summary = try? await API.shared.getSpendingSummary()
                    overrides = (try? await API.shared.getSpendingOverrides()) ?? []
                }
        }
        .task {
            summary = try? await API.shared.getSpendingSummary()
            overrides = (try? await API.shared.getSpendingOverrides()) ?? []
        }
        .alert("Add Override", isPresented: $showAddOverride) {
            TextField("Merchant name", text: $newMerchant)
            TextField("Category (e.g. groceries)", text: $newCategory)
            Button("Save") {
                let m = newMerchant.trimmingCharacters(in: .whitespaces)
                let c = newCategory.trimmingCharacters(in: .whitespaces)
                guard !m.isEmpty, !c.isEmpty else { return }
                Task {
                    _ = try? await API.shared.setSpendingOverride(merchantName: m, category: c)
                    overrides = (try? await API.shared.getSpendingOverrides()) ?? []
                }
                newMerchant = ""
                newCategory = ""
            }
            Button("Cancel", role: .cancel) {
                newMerchant = ""
                newCategory = ""
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        if let pet = store.pet {
            if pet.reactionHistory.isEmpty && summary == nil {
                ContentUnavailableView(
                    "No reactions yet",
                    systemImage: "tray",
                    description: Text("Reactions will appear once your bank starts sending transactions.")
                )
            } else {
                List {
                    if let s = summary {
                        Section {
                            savingsCard(s)
                        }
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                    }
                    ForEach(pet.reactionHistory) { record in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(record.eventType.replacingOccurrences(of: "_", with: " ").capitalized)
                                    .font(.subheadline.weight(.semibold))
                                Spacer()
                                Text(record.at, style: .relative)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Text(record.reaction.reason)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }

                    if !overrides.isEmpty {
                        Section {
                            ForEach(overrides) { override in
                                HStack {
                                    Text(override.merchantName)
                                        .font(.subheadline)
                                    Spacer()
                                    Text(override.category)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .onDelete { indexSet in
                                let toDelete = indexSet.map { overrides[$0] }
                                Task {
                                    for o in toDelete {
                                        try? await API.shared.deleteSpendingOverride(merchantName: o.merchantName)
                                    }
                                    overrides = (try? await API.shared.getSpendingOverrides()) ?? []
                                }
                            }
                            Button {
                                showAddOverride = true
                            } label: {
                                Label("Add override", systemImage: "plus")
                                    .font(.subheadline)
                            }
                        } header: {
                            Text("Category overrides")
                        }
                    }
                }
                .listStyle(.plain)
            }
        } else {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func savingsCard(_ s: SpendingSummaryResponse) -> some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Savings rate")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if let rate = s.savingsRate {
                    Text("\(rate)%")
                        .font(.title2.weight(.bold).monospacedDigit())
                        .foregroundStyle(rate >= 20 ? .green : rate >= 5 ? .orange : .red)
                } else {
                    Text("—")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(.secondary)
                }
                Text("30-day average")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("Spend")
                    .font(.caption2).foregroundStyle(.secondary)
                Text(s.monthlySpend, format: .currency(code: "USD"))
                    .font(.caption.monospacedDigit())
                Text("Income")
                    .font(.caption2).foregroundStyle(.secondary)
                    .padding(.top, 2)
                Text(s.monthlyIncome, format: .currency(code: "USD"))
                    .font(.caption.monospacedDigit())
            }
        }
        .padding()
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
        .padding(.vertical, 4)
    }
}

#Preview {
    SpendingView()
        .environment(PetStore())
}
