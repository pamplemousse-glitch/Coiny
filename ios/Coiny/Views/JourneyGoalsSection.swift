import SwiftUI

/// The GOALS block of the expanded journey (R-7.7, R-7.9, R-7.10). Quiet like
/// the ladder above it: no animation, no character voice, state carried by
/// words, never colour alone (R-4.4, R-11).
struct JourneyGoalsSection: View {
    let store: JourneyStore

    @State private var editorDraft: GoalDraft?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("GOALS")
                .font(.system(.caption, design: .monospaced).weight(.medium))
                .foregroundStyle(CoinyTheme.ink3)
                .padding(.top, 40)
                .padding(.bottom, 8)
                .accessibilityAddTraits(.isHeader)

            content
        }
        // No container-level identifier: SwiftUI would stamp it onto every
        // descendant element, clobbering the per-row identifiers.
        .sheet(item: $editorDraft) { draft in
            GoalEditorView(store: store, draft: draft) {
                editorDraft = nil
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch store.goals {
        case .loading:
            // Skeleton row (PRD 8.3, Home expanded / loading).
            RoundedRectangle(cornerRadius: 4)
                .fill(CoinyTheme.rule)
                .frame(height: 44)
                .accessibilityHidden(true)
        case .failed:
            // The last thing this section may do is announce a backend error
            // loudly; one quiet line, and the section stays reachable.
            Text("Goals are not loading right now.")
                .font(.subheadline)
                .foregroundStyle(CoinyTheme.ink2)
                .frame(minHeight: 44, alignment: .leading)
        case .loaded:
            if store.activeGoals.isEmpty {
                emptyState
            } else {
                ForEach(store.activeGoals) { goal in
                    GoalRowView(goal: goal) {
                        editorDraft = GoalDraft(goal: goal)
                    }
                }
                if store.activeGoals.count < store.maxActiveGoals {
                    addButton
                } else {
                    Text("Three goals is the limit. Archive one to start another.")
                        .font(.footnote)
                        .foregroundStyle(CoinyTheme.ink3)
                        .frame(minHeight: 44, alignment: .leading)
                }
            }
        }
    }

    /// One line inviting the first goal, not an empty-state illustration
    /// (PRD 8.3, "Home, expanded").
    private var emptyState: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Name a number and a date, and the pace math runs nightly.")
                .font(.subheadline)
                .foregroundStyle(CoinyTheme.ink2)
                .fixedSize(horizontal: false, vertical: true)
            addButton
        }
    }

    private var addButton: some View {
        Button {
            editorDraft = GoalDraft()
        } label: {
            Text("Add a goal")
                .font(.body.weight(.semibold))
                .foregroundStyle(CoinyTheme.signal)
                .frame(minHeight: 44, alignment: .leading)
        }
        .accessibilityIdentifier("journey.goals.add")
    }
}

/// One goal row: name, bar plus percent where the current amount is known,
/// and the pace sentence. A null pace renders its "too early" line; it is
/// never a zero bar and never "Off pace" (R-7.8).
struct GoalRowView: View {
    let goal: TargetGoal
    var onEdit: () -> Void

    var body: some View {
        let display = JourneyPresentation.display(for: goal)
        Button(action: onEdit) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    if let emoji = goal.emoji, !emoji.isEmpty {
                        Text(emoji)
                            .font(.body)
                            .accessibilityHidden(true)
                    }
                    Text(display.name)
                        .font(.body.weight(.medium))
                        .foregroundStyle(CoinyTheme.ink)
                    Spacer(minLength: 8)
                    if let band = display.bandLabel {
                        Text(band)
                            .font(.system(.footnote, design: .monospaced))
                            .foregroundStyle(CoinyTheme.ink2)
                    }
                }

                if let progress = display.progress, let percent = display.percentText {
                    HStack(spacing: 12) {
                        RungProgressBar(progress: progress)
                        Text(percent)
                            .font(.system(.caption, design: .monospaced))
                            .foregroundStyle(CoinyTheme.ink2)
                    }
                }
                if let amountLine = display.amountLine {
                    Text(amountLine)
                        .font(.subheadline)
                        .foregroundStyle(CoinyTheme.ink2)
                }
                if let statusLine = display.statusLine {
                    Text(statusLine)
                        .font(.footnote)
                        .foregroundStyle(CoinyTheme.ink2)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(.vertical, 10)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(CoinyTheme.rule)
                .frame(height: 1)
        }
        .accessibilityElement(children: .combine)
        .accessibilityHint("Double tap to edit this goal.")
        .accessibilityIdentifier("journey.goal.\(goal.id)")
    }
}
