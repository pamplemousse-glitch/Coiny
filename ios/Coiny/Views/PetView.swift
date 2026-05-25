import SwiftUI

struct PetView: View {
    @Environment(PetStore.self) private var store
    @State private var celebrating = false
    @State private var sadTriggered = false
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Coiny")
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button { showSettings = true } label: {
                            Image(systemName: "gear")
                        }
                        .accessibilityLabel("Settings")
                    }
                }
                .refreshable {
                    await store.refresh()
                }
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
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
    @Environment(PetStore.self) private var store
    @State private var isFiring = false
    @State private var fireStatus: String?
    @State private var isResetting = false
    @State private var resetStatus: String?

    private var debugControls: some View {
        VStack(spacing: 6) {
            Button {
                Task {
                    isResetting = true
                    resetStatus = nil
                    do {
                        let r = try await API.shared.resetCursor()
                        resetStatus = "Reset \(r.itemsReset) item(s), cleared \(r.eventsCleared) events"
                    } catch {
                        resetStatus = "Reset failed: \(error.localizedDescription)"
                    }
                    isResetting = false
                }
            } label: {
                Label(isResetting ? "Resetting…" : "Reset cursor", systemImage: "arrow.counterclockwise")
                    .font(.caption)
                    .foregroundStyle(.blue)
            }
            .buttonStyle(.bordered)
            .disabled(isResetting)

            if let status = resetStatus {
                Text(status)
                    .font(.caption2)
                    .foregroundStyle(status.hasPrefix("Reset failed") ? .red : .secondary)
                    .multilineTextAlignment(.center)
            }

            Button {
                Task {
                    isFiring = true
                    fireStatus = nil
                    do {
                        try await API.shared.fireTestTransaction()
                        // Webhook is processed async server-side — wait before polling results.
                        try await Task.sleep(for: .seconds(2))
                        if let result = try? await API.shared.debugTransactions(),
                           let latest = result.transactions.first {
                            if let rule = latest.ruleMatched {
                                fireStatus = "Fired: \(rule.replacingOccurrences(of: "_", with: " "))"
                            } else {
                                fireStatus = "No rule matched (category: \(latest.category ?? "nil"))"
                            }
                        }
                        await store.refresh()
                    } catch {}
                    isFiring = false
                }
            } label: {
                Label(isFiring ? "Firing…" : "Fire test transaction", systemImage: "bolt.fill")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }
            .buttonStyle(.bordered)
            .disabled(isFiring)

            if isFiring {
                ProgressView().scaleEffect(0.7)
            } else if let status = fireStatus {
                Text(status)
                    .font(.caption2)
                    .foregroundStyle(status.hasPrefix("Fired:") ? .green : .secondary)
                    .multilineTextAlignment(.center)
            }
        }
    }
    #endif
}

#Preview("Loaded - happy") {
    PetView()
        .environment(PetStore())
}
