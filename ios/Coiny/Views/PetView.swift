import SwiftUI

struct PetView: View {
    @Environment(PetStore.self) private var store
    @State private var celebrating = false
    @State private var sadTriggered = false

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Coiny")
                .refreshable {
                    await store.refresh()
                }
        }
        .task {
            // CoinyApp triggers the first load; this loop keeps PetView fresh.
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(30))
                await store.refresh()
            }
        }
        .onChange(of: store.pet?.lastReactionAt) { oldValue, newValue in
            guard let newValue, let oldValue, newValue != oldValue else { return }
            let animation = store.pet?.reactionHistory.first?.reaction.animation ?? "neutral"
            if animation == "celebrate" || animation == "happy" {
                celebrating = true
                Task {
                    try? await Task.sleep(for: .seconds(3))
                    celebrating = false
                }
            } else if animation == "sad" || animation == "concerned" || animation == "sleeping" {
                sadTriggered = true
                Task {
                    try? await Task.sleep(for: .seconds(4))
                    sadTriggered = false
                }
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
            PetLoadedView(pet: pet, celebrating: celebrating, sadTriggered: sadTriggered)

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
    let celebrating: Bool
    let sadTriggered: Bool

    private var moodSymbol: String {
        if celebrating { return "face.smiling.inverse" }
        switch pet.mood {
        case 80...: return "face.smiling.inverse"
        case 60..<80: return "face.smiling"
        case 40..<60: return "face.dashed"
        default: return "face.dashed.fill"
        }
    }

    private var moodTint: Color {
        if celebrating { return .green }
        switch pet.mood {
        case 70...: return .green
        case 40..<70: return .orange
        default: return .red
        }
    }

    @State private var breathing = false

    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                Image(systemName: moodSymbol)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 180, height: 180)
                    .foregroundStyle(moodTint)
                    // gentle breathing
                    .scaleEffect(breathing ? 1.04 : 1.0)
                    .animation(.easeInOut(duration: 2.2).repeatForever(autoreverses: true), value: breathing)
                    // celebrate bounce — compounds with breathing scale
                    .scaleEffect(celebrating ? 1.1 : 1.0)
                    .animation(.spring(response: 0.35, dampingFraction: 0.45), value: celebrating)
                    // sad droop — shift down + desaturate
                    .offset(y: sadTriggered ? 14 : 0)
                    .animation(.easeInOut(duration: 0.9), value: sadTriggered)
                    .saturation(sadTriggered ? 0.25 : 1.0)
                    .animation(.easeInOut(duration: 0.9), value: sadTriggered)
                    .onAppear { breathing = true }
                    .padding(.top, 32)
                    .accessibilityLabel("Pet mood: \(pet.mood) out of 100")

                statRow(label: "Health", value: pet.healthScore, color: .pink, icon: "heart.fill")
                statRow(label: "Mood", value: pet.mood, color: moodTint, icon: "sparkles")

                if pet.reactionHistory.isEmpty {
                    WaitingForFirstReactionView()
                } else if let last = pet.reactionHistory.first {
                    lastReactionCard(last)
                }

                #if DEBUG
                debugControls
                #endif

                Spacer(minLength: 32)
            }
            .padding(.horizontal)
        }
    }

    private func statRow(label: String, value: Int, color: Color, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon).foregroundStyle(color)
                Text(label).font(.subheadline.weight(.semibold))
                Spacer()
                Text("\(value)").font(.subheadline.monospacedDigit()).foregroundStyle(.secondary)
            }
            ProgressView(value: Double(value), total: 100).tint(color)
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

    #if DEBUG
    private var debugControls: some View {
        Button {
            Task { try? await API.shared.fireTestTransaction() }
        } label: {
            Label("Fire test transaction", systemImage: "bolt.fill")
                .font(.caption)
                .foregroundStyle(.orange)
        }
        .buttonStyle(.bordered)
    }
    #endif
}

#Preview("Loaded - happy") {
    PetView()
        .environment(PetStore())
}
