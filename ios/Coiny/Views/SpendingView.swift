import SwiftUI

struct SpendingView: View {
    @Environment(PetStore.self) private var store
    @State private var summary: SpendingSummaryResponse?

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Activity")
                .refreshable {
                    await store.refresh()
                    summary = try? await API.shared.getSpendingSummary()
                }
        }
        .task {
            summary = try? await API.shared.getSpendingSummary()
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
