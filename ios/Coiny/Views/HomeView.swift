import SwiftUI

/// Home: the creature and the journey as one surface at two resolutions
/// (DR-27, PRD R-4.1a). Collapsed is the default and the state a user with
/// nothing to do never leaves. Tapping the creature expands the journey
/// beneath it: the Window shrinks from Full to Panel and pins to the top
/// while the Foundation Ladder scrolls under it.
///
/// Expansion is a state change within this one view. Not a push, not a sheet.
/// Tab switch and process death both return to collapsed (`isExpanded` is
/// plain @State and resets in `onDisappear`). The creature is the only
/// affordance that expands (R-4.1b): no chevron, no "View plan" button.
struct HomeView: View {
    @Environment(PetStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize

    /// True while Home is the selected tab. Driven by RootView rather than
    /// `onDisappear`, which does not fire reliably for a TabView child.
    var isVisible: Bool = true

    @State private var isExpanded = false
    @State private var showSettings = false
    @State private var reactionOverride: CreatureCondition?
    @State private var connectFlow = ConnectAccountFlow()
    @State private var journeyStore = JourneyStore()
    @Namespace private var windowNamespace

    private var pet: PetState? { store.pet }

    private var condition: CreatureCondition {
        reactionOverride ?? HomePresentation.condition(for: pet)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                CoinyTheme.screen.ignoresSafeArea()
                if isExpanded {
                    expandedSurface
                        .transition(.opacity)
                } else {
                    collapsedSurface
                        .transition(.opacity)
                }
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { showSettings = true } label: {
                        Image(systemName: "gear")
                            .foregroundStyle(CoinyTheme.ink)
                    }
                    .accessibilityLabel("Settings")
                }
            }
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
        }
        // onDismiss is the only signal when the user swipes Link away without
        // LinkKit reporting an exit; without it the flow waits forever and no
        // link_result is ever recorded.
        .sheet(
            isPresented: Bindable(connectFlow).isPresentingLink,
            onDismiss: { connectFlow.linkSheetDismissed() },
            content: {
                if let session = connectFlow.session {
                    session.sheet()
                }
            }
        )
        .task {
            connectFlow.onLinked = { Task { await store.refresh() } }
            // CoinyApp triggers the first load; this loop keeps Home fresh.
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(30))
                await store.refresh()
            }
        }
        .onChange(of: store.pet?.lastReactionAt) { oldValue, newValue in
            guard let newValue, let oldValue, newValue != oldValue else { return }
            playReaction(store.pet?.reactionHistory.first?.reaction.animation ?? "neutral")
        }
        .onChange(of: isVisible) { _, nowVisible in
            // Tab switch returns to collapsed (R-4.1a). No animation: the
            // surface is offscreen when this fires.
            if !nowVisible { isExpanded = false }
        }
        .onDisappear {
            isExpanded = false
        }
    }

    // MARK: - Expansion

    private func setExpanded(_ value: Bool) {
        // Motion budget (design-direction 4.5): easeOut, no spring. Under
        // Reduce Motion the same state change becomes a pure cross-fade;
        // expansion itself is never disabled (R-11.5).
        withAnimation(.easeOut(duration: reduceMotion ? 0.3 : 0.26)) {
            isExpanded = value
        }
    }

    /// The Window, tagged for the Full-to-Panel morph. Under Reduce Motion
    /// the geometry match is dropped so the change is opacity-only.
    @ViewBuilder
    private func anchoredWindow(_ size: WindowSize) -> some View {
        let window = CoinyWindow(
            size: size,
            condition: condition,
            stage: HomePresentation.stage(for: pet)
        )
        if reduceMotion {
            window
        } else {
            window.matchedGeometryEffect(id: "coiny.window", in: windowNamespace)
        }
    }

    private func playReaction(_ animation: String) {
        switch animation {
        case "celebrate", "happy":
            reactionOverride = .celebrating
        case "sad", "concerned":
            reactionOverride = .concerned
        default:
            return
        }
        Task {
            try? await Task.sleep(for: .seconds(4))
            reactionOverride = nil
        }
    }

    // MARK: - Collapsed

    /// Non-scrolling by design (design-direction 6.1). At accessibility type
    /// sizes the same content becomes scrollable rather than clipping.
    @ViewBuilder
    private var collapsedSurface: some View {
        if typeSize.isAccessibilitySize {
            ScrollView { collapsedContent }
        } else {
            collapsedContent
        }
    }

    private var collapsedContent: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 8)

            anchoredWindow(.full)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(HomePresentation.windowAccessibilityLabel(for: pet))
                .accessibilityHint("Double tap to open the journey.")
                .accessibilityAddTraits(.isButton)
                .accessibilityAction { setExpanded(true) }
                .accessibilityIdentifier("home.window")

            speechArea
                .padding(.top, 20)
                .padding(.horizontal, 32)

            Spacer(minLength: 20)

            if let rung = HomePresentation.activeRungDisplay(for: pet) {
                ActiveRungBlock(rung: rung, ageLabel: HomePresentation.dataAgeLabel(for: pet))
                    .padding(.horizontal, 24)
                    .accessibilityElement(children: .combine)
                    .accessibilityIdentifier("home.rung.active")
            }

            actionArea
                .padding(.horizontal, 24)
                .padding(.top, 32)
                .padding(.bottom, 12)
        }
        .contentShape(Rectangle())
        // The creature and the active rung row are one tap target (R-4.1b).
        .onTapGesture { setExpanded(true) }
    }

    /// The speech line sits outside the Window: the pet speaks into the room.
    /// Empty is a real state (sleeping, nothing to say, or a backend error the
    /// pet never announces). Space is reserved so the layout does not jump.
    private var speechArea: some View {
        Text(HomePresentation.speechLine(for: pet) ?? "")
            .font(.system(.body, design: .monospaced))
            .foregroundStyle(CoinyTheme.ink)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity, minHeight: 88, alignment: .top)
            .accessibilityHidden(HomePresentation.speechLine(for: pet) == nil)
    }

    /// At most one action button; when there is no clear next action there is
    /// no button at all (design-direction 6.1).
    @ViewBuilder
    private var actionArea: some View {
        switch HomePresentation.primaryAction(for: pet) {
        case .connectAccount:
            VStack(spacing: 12) {
                Button {
                    connectFlow.start()
                } label: {
                    Text(connectFlow.isLoading ? "Opening Link…" : "Connect an account")
                        .frame(minHeight: 50)
                }
                .buttonStyle(.coinyFilled)
                .disabled(connectFlow.isLoading)
                .accessibilityIdentifier("home.action.connect")
                // Only a real failure lands here; abandonment leaves the
                // button alone and says nothing (G2.15).
                if let error = connectFlow.errorMessage {
                    CoinyErrorLine(message: error, actionTitle: "Try again") {
                        connectFlow.start()
                    }
                    .accessibilityIdentifier("home.connect.error")
                }
            }
        case nil:
            // Keeps the rung block from sitting on the tab bar.
            Color.clear.frame(height: 50)
        }
    }

    // MARK: - Expanded

    private var expandedSurface: some View {
        VStack(spacing: 0) {
            expandedHeader
            Rectangle()
                .fill(CoinyTheme.rule)
                .frame(height: 1)
            HomeJourneyView(
                rows: HomePresentation.journeyRows(for: pet),
                journey: journeyStore,
                onLadderChanged: { await store.refresh() }
            )
        }
    }

    /// The pinned Panel: the only character art on the expanded journey
    /// (R-4.4). Tapping it returns to collapsed.
    private var expandedHeader: some View {
        HStack(alignment: .center, spacing: 16) {
            anchoredWindow(.panel)
            if let rung = HomePresentation.activeRungDisplay(for: pet) {
                VStack(alignment: .leading, spacing: 2) {
                    // No line limit and no truncation: the audit reported this
                    // header as only partially supporting Dynamic Type, and a
                    // two-line cap on the one sentence that says what the rung
                    // means is exactly what breaks at the larger sizes.
                    Text("\(rung.code)  \(rung.nameTag)")
                        .font(.system(.caption, design: .monospaced).weight(.medium))
                        .foregroundStyle(CoinyTheme.ink3)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(rung.blurb)
                        .font(.subheadline)
                        .foregroundStyle(CoinyTheme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .contentShape(Rectangle())
        .onTapGesture { setExpanded(false) }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(HomePresentation.windowAccessibilityLabel(for: pet))
        .accessibilityHint("Double tap to close the journey.")
        .accessibilityAddTraits(.isButton)
        .accessibilityAction { setExpanded(false) }
        .accessibilityIdentifier("home.window")
    }
}

// MARK: - Active rung block (collapsed)

/// The active rung with progress, per design-direction 6.1: caption code line,
/// the rung's meaning, a 4pt flat bar in signal over rule, and a unit-aware
/// detail line. Indeterminate reads "too early to say", never zero.
private struct ActiveRungBlock: View {
    let rung: ActiveRungDisplay
    /// The age of the money in `detailLine` (R-8.2). Nil when there is no
    /// figure on screen to label.
    var ageLabel: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(rung.code)
                    .accessibilityLabel("Rung \(rung.code.dropFirst(5))")
                Spacer()
                Text(rung.nameTag)
            }
            .font(.system(.caption, design: .monospaced).weight(.medium))
            .foregroundStyle(CoinyTheme.ink3)

            Text(rung.blurb)
                .font(.headline)
                .foregroundStyle(CoinyTheme.ink)
                .fixedSize(horizontal: false, vertical: true)

            if let text = rung.indeterminateText {
                Text(text)
                    .font(.subheadline)
                    .foregroundStyle(CoinyTheme.ink2)
                    .fixedSize(horizontal: false, vertical: true)
            } else if let progress = rung.progress, let percent = rung.percentText {
                HStack(spacing: 12) {
                    RungProgressBar(progress: progress)
                    Text(percent)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundStyle(CoinyTheme.ink2)
                }
                if let detail = rung.detailLine {
                    Text(detail)
                        .font(.subheadline)
                        .foregroundStyle(CoinyTheme.ink2)
                    // R-8.2: the figure above is real money and carried no age
                    // anywhere on this screen. Wealth labelled every class;
                    // Home, the default tab, labelled nothing.
                    if let ageLabel {
                        Text(ageLabel)
                            .font(.caption)
                            .foregroundStyle(CoinyTheme.ink3)
                            .accessibilityIdentifier("home.rung.age")
                    }
                }
            }
        }
    }
}

/// 4pt flat bar, signal on rule. Not a ring, not a gauge, no gradient, and it
/// never carries the value alone: the percent text sits beside it.
struct RungProgressBar: View {
    let progress: Double

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Rectangle().fill(CoinyTheme.rule)
                Rectangle()
                    .fill(CoinyTheme.signal)
                    .frame(width: geo.size.width * min(max(progress, 0), 1))
            }
        }
        .frame(height: 4)
        .accessibilityHidden(true)
    }
}

#Preview("Home") {
    HomeView()
        .environment(PetStore())
}
