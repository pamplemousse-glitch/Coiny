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
                // Not ContentUnavailableView: its description text renders in
                // the system secondary grey, which the audit measured below AA
                // on this background and which no palette token can reach.
                VStack(alignment: .leading, spacing: 8) {
                    Text("No reactions yet")
                        .font(.headline)
                        .foregroundStyle(CoinyTheme.ink)
                    Text("Reactions will appear once your bank starts sending transactions.")
                        .font(.subheadline)
                        .foregroundStyle(CoinyTheme.ink2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.horizontal, 20)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            } else {
                List {
                    if let s = summary {
                        Section {
                            savingsCard(s)
                        }
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                        let cats = s.spendByCategory ?? [:]
                        if !cats.isEmpty {
                            Section {
                                categoryCard(cats)
                            }
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                        }
                    }
                    ForEach(pet.reactionHistory) { record in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(record.eventType.replacingOccurrences(of: "_", with: " ").capitalized)
                                    .font(.subheadline.weight(.semibold))
                                Spacer()
                                Text(record.at, style: .relative)
                                    .font(.caption)
                                    .foregroundStyle(CoinyTheme.ink2)
                            }
                            Text(record.reaction.reason)
                                .font(.caption)
                                .foregroundStyle(CoinyTheme.ink2)
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
                                        .foregroundStyle(CoinyTheme.ink2)
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

    private func categoryCard(_ cats: [String: Double]) -> some View {
        let top = cats.sorted { $0.value > $1.value }.prefix(5)
        return VStack(alignment: .leading, spacing: 8) {
            Text("Top categories")
                .font(.caption)
                .foregroundStyle(CoinyTheme.ink2)
            ForEach(Array(top), id: \.key) { cat, amount in
                HStack {
                    Text(cat.replacingOccurrences(of: "_", with: " ").capitalized)
                        .font(.subheadline)
                    Spacer()
                    Text(amount, format: .currency(code: "USD"))
                        .font(.subheadline.monospacedDigit())
                }
            }
        }
        .padding()
        .background(CoinyTheme.surface, in: RoundedRectangle(cornerRadius: 10))
        // `surface` is a near-white in light mode, so on the system background
        // the card needs the hairline to read as a card at all. The translucent
        // material it replaces got its edge from whatever was behind it.
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(CoinyTheme.rule, lineWidth: 1))
        .padding(.horizontal)
        .padding(.vertical, 4)
    }

    private func savingsCard(_ s: SpendingSummaryResponse) -> some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Savings rate")
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.ink2)
                if let rate = s.savingsRate {
                    // The rate is a level, not a delta, so it renders in ink
                    // (design-direction 4.3 rule 1) and the band is carried by
                    // the sentence beneath it. It used to be three hues with no
                    // threshold shown, which meant the only thing distinguishing
                    // good from bad was colour: identical in greyscale, and to
                    // anyone with a red-green deficiency (WCAG 1.4.1).
                    Text("\(rate)%")
                        .font(.title2.weight(.bold).monospacedDigit())
                        .foregroundStyle(CoinyTheme.ink)
                    Text(Self.savingsBandText(rate))
                        .font(.caption)
                        .foregroundStyle(CoinyTheme.ink2)
                        .fixedSize(horizontal: false, vertical: true)
                } else {
                    Text("—")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(CoinyTheme.ink2)
                    Text("Needs a month of transactions")
                        .font(.caption)
                        .foregroundStyle(CoinyTheme.ink2)
                }
                Text("30-day average")
                    .font(.caption2)
                    .foregroundStyle(CoinyTheme.ink2)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("Spend")
                    .font(.caption2).foregroundStyle(CoinyTheme.ink2)
                Text(s.monthlySpend, format: .currency(code: "USD"))
                    .font(.caption.monospacedDigit())
                Text("Income")
                    .font(.caption2).foregroundStyle(CoinyTheme.ink2)
                    .padding(.top, 2)
                Text(s.monthlyIncome, format: .currency(code: "USD"))
                    .font(.caption.monospacedDigit())
            }
        }
        .padding()
        .background(CoinyTheme.surface, in: RoundedRectangle(cornerRadius: 10))
        // `surface` is a near-white in light mode, so on the system background
        // the card needs the hairline to read as a card at all. The translucent
        // material it replaces got its edge from whatever was behind it.
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(CoinyTheme.rule, lineWidth: 1))
        .padding(.horizontal)
        .padding(.vertical, 4)
    }

    /// The band, in words, with its own boundary printed. The 20 and the 5 were
    /// previously implicit in the colour and nowhere in the text, so the number
    /// could not be read against anything. Stated plainly and without praise or
    /// blame: the PRD's second principle is never shame.
    static func savingsBandText(_ rate: Int) -> String {
        if rate >= 20 { return "At or above the 20% mark" }
        if rate >= 5 { return "Between 5% and 20%" }
        return "Under the 5% mark"
    }
}

#Preview {
    SpendingView()
        .environment(PetStore())
}
