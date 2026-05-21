import SwiftUI

struct SpendingView: View {
    @Environment(PetStore.self) private var store

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Spending")
                .refreshable {
                    await store.refresh()
                }
        }
    }

    @ViewBuilder
    private var content: some View {
        if let pet = store.pet {
            if pet.reactionHistory.isEmpty {
                ContentUnavailableView(
                    "No reactions yet",
                    systemImage: "tray",
                    description: Text("Reactions will appear once your bank starts sending transactions.")
                )
            } else {
                List(pet.reactionHistory) { record in
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
                .listStyle(.plain)
            }
        } else {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

#Preview {
    SpendingView()
        .environment(PetStore())
}
