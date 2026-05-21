import SwiftUI

struct PetView: View {
    @Environment(PetStore.self) private var store

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Coiny")
                .refreshable {
                    await store.refresh()
                }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch store.state {
        case .idle, .loading:
            ProgressView("Loading your pet…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)

        case let .loaded(pet):
            PetLoadedView(pet: pet)

        case let .failed(message):
            ContentUnavailableView {
                Label("Couldn't load pet", systemImage: "exclamationmark.triangle")
            } description: {
                Text(message)
            } actions: {
                Button("Retry") {
                    Task { await store.refresh() }
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }
}

private struct PetLoadedView: View {
    let pet: PetState

    /// Placeholder pet face based on mood — replaced with real sprite art in Phase 3 polish.
    private var moodSymbol: String {
        switch pet.mood {
        case 80...: "face.smiling.inverse"
        case 60..<80: "face.smiling"
        case 40..<60: "face.dashed"
        default: "face.dashed.fill"
        }
    }

    private var moodTint: Color {
        switch pet.mood {
        case 70...: .green
        case 40..<70: .orange
        default: .red
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                Image(systemName: moodSymbol)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 180, height: 180)
                    .foregroundStyle(moodTint)
                    .padding(.top, 32)
                    .accessibilityLabel("Pet mood: \(pet.mood) out of 100")

                statRow(
                    label: "Health",
                    value: pet.healthScore,
                    color: .pink,
                    icon: "heart.fill"
                )

                statRow(
                    label: "Mood",
                    value: pet.mood,
                    color: moodTint,
                    icon: "sparkles"
                )

                if let last = pet.reactionHistory.first {
                    lastReactionCard(last)
                }

                Spacer(minLength: 32)
            }
            .padding(.horizontal)
        }
    }

    private func statRow(label: String, value: Int, color: Color, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(color)
                Text(label)
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text("\(value)")
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
            ProgressView(value: Double(value), total: 100)
                .tint(color)
        }
    }

    private func lastReactionCard(_ record: ReactionRecord) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Label("Last reaction", systemImage: "bell.fill")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text(record.at, style: .relative)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Text(record.reaction.reason)
                .font(.callout)
                .foregroundStyle(.primary)
        }
        .padding()
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
}

#Preview("Loaded - happy") {
    let store = PetStore()
    return PetView()
        .environment(store)
}
