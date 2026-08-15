import SwiftUI

/// The expanded journey: the eight rungs of the Foundation Ladder, then target
/// goals and habit guardrails, scrolling beneath the pinned Panel Window.
/// Deliberately quiet (R-4.4): no animation, no speech, no character art
/// anywhere in this list. Completed rungs stay visible and stay marked done;
/// the ladder is a record of achievement, not a to-do list. No rung can be
/// failed, so no failure UI exists here.
struct HomeJourneyView: View {
    let rows: [JourneyRow]
    let journey: JourneyStore
    /// Called after a skip or un-skip changed the ladder so the owner can
    /// refresh the pet state everything renders from.
    var onLadderChanged: () async -> Void = {}

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("The Climb")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(CoinyTheme.ink)
                    .padding(.top, 20)
                    .padding(.bottom, 12)
                    .accessibilityAddTraits(.isHeader)

                ForEach(rows) { row in
                    JourneyRowView(
                        row: row,
                        onSkip: { status, reason in
                            Task {
                                if await journey.skipRung(row.id, status: status, reason: reason) != nil {
                                    await onLadderChanged()
                                }
                            }
                        },
                        onUnskip: {
                            Task {
                                if await journey.unskipRung(row.id) != nil {
                                    await onLadderChanged()
                                }
                            }
                        }
                    )
                }

                JourneyGoalsSection(store: journey)
                JourneyGuardrailsSection(store: journey)
                // The debt surface hangs off the journey (PRD 4 has no debt
                // tab; three tabs only). One quiet row, data loads on push.
                JourneyDebtSection()
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
        .background(CoinyTheme.screen)
        .accessibilityIdentifier("home.journey")
        .task {
            await journey.load()
        }
    }
}

/// One rung row: minimum 44pt tall (R-11.5), a hairline below, state carried
/// by words ("done", "ACTIVE", "skipped"), never by colour alone. Rungs that
/// are not yet done can be skipped with a stated reason (R-7.4); a skip is
/// the user's to reverse, and no rung can ever be failed.
private struct JourneyRowView: View {
    let row: JourneyRow
    var onSkip: (RungSkipStatus, RungSkipReason?) -> Void = { _, _ in }
    var onUnskip: () -> Void = {}

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            // The combined element covers the rung's name, state and detail;
            // the annotation below stays separate so its "Take it back"
            // button remains its own focusable, hittable target (R-11.5).
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    Text(String(row.id))
                        .font(.system(.footnote, design: .monospaced))
                        .foregroundStyle(CoinyTheme.ink3)
                        .frame(width: 16, alignment: .leading)

                    Text(row.name)
                        .font(isActive ? .body.weight(.semibold) : .body)
                        .foregroundStyle(isActive ? CoinyTheme.ink : CoinyTheme.ink3)

                    Spacer(minLength: 8)

                    trailing
                }
                .frame(minHeight: 44)

                activeDetail
            }
            .accessibilityElement(children: .combine)
            .accessibilityActions {
                if isSkippable {
                    ForEach(RungSkipReason.allCases, id: \.rawValue) { reason in
                        Button("Skip: \(JourneyPresentation.skipMenuLabel(reason))") {
                            onSkip(.skipped, reason)
                        }
                    }
                    Button("Mark not applicable") { onSkip(.notApplicable, nil) }
                }
            }

            annotation
        }
        .padding(.bottom, annotationExists ? 8 : 0)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(CoinyTheme.rule)
                .frame(height: 1)
        }
        .contentShape(Rectangle())
        .contextMenu {
            if isSkippable {
                skipMenu
            }
        }
    }

    private var isActive: Bool {
        if case .active = row.detail { return true }
        return false
    }

    /// Pending and active rungs can be skipped; a completed rung's completion
    /// stands, and an already-skipped rung offers "take it back" instead.
    private var isSkippable: Bool {
        switch row.detail {
        case .pending, .active: return true
        case .done, .skipped, .notApplicable: return false
        }
    }

    private var isOptedOut: Bool {
        switch row.detail {
        case .skipped, .notApplicable: return true
        default: return false
        }
    }

    /// The reason picker (R-7.4): a closed set of stated reasons, plus the
    /// structural "not applicable". No failure option exists anywhere.
    @ViewBuilder
    private var skipMenu: some View {
        Section("Skip with a reason") {
            ForEach(RungSkipReason.allCases, id: \.rawValue) { reason in
                Button(JourneyPresentation.skipMenuLabel(reason)) {
                    onSkip(.skipped, reason)
                }
            }
        }
        Button("Does not apply to me") { onSkip(.notApplicable, nil) }
    }

    private var annotationExists: Bool {
        switch row.detail {
        case .done(reopened: true): return true
        case .skipped, .notApplicable: return true
        default: return false
        }
    }

    @ViewBuilder
    private var trailing: some View {
        switch row.detail {
        case .done:
            Text("done")
                .font(.system(.footnote, design: .monospaced))
                .foregroundStyle(CoinyTheme.ink3)
        case let .active(display):
            // Rung 7 never completes by design: it reports its percentage
            // forever, so the trailing slot shows the number, not a tag.
            if row.id == RungCatalog.freedomRungId, let percent = display.percentText {
                Text(percent)
                    .font(.system(.footnote, design: .monospaced))
                    .foregroundStyle(CoinyTheme.ink)
            } else {
                Text("ACTIVE")
                    .font(.system(.caption2, design: .monospaced).weight(.semibold))
                    .foregroundStyle(CoinyTheme.onSignal)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(CoinyTheme.signal, in: Capsule())
            }
        case .pending:
            EmptyView()
        case .skipped:
            Text("skipped")
                .font(.system(.footnote, design: .monospaced))
                .foregroundStyle(CoinyTheme.ink3)
        case .notApplicable:
            Text("not applicable")
                .font(.system(.footnote, design: .monospaced))
                .foregroundStyle(CoinyTheme.ink3)
        }
    }

    /// Progress detail for the active rung only. Indeterminate reads "too
    /// early to say" plus what would resolve it; never zero, never a failure.
    @ViewBuilder
    private var activeDetail: some View {
        if case let .active(display) = row.detail {
            VStack(alignment: .leading, spacing: 6) {
                Text(display.blurb)
                    .font(.subheadline)
                    .foregroundStyle(CoinyTheme.ink2)
                    .fixedSize(horizontal: false, vertical: true)

                if let text = display.indeterminateText {
                    Text(text)
                        .font(.subheadline)
                        .foregroundStyle(CoinyTheme.ink2)
                        .fixedSize(horizontal: false, vertical: true)
                } else if let progress = display.progress, let percent = display.percentText {
                    HStack(spacing: 12) {
                        RungProgressBar(progress: progress)
                        Text(percent)
                            .font(.system(.caption, design: .monospaced))
                            .foregroundStyle(CoinyTheme.ink2)
                    }
                    if let detail = display.detailLine {
                        Text(detail)
                            .font(.subheadline)
                            .foregroundStyle(CoinyTheme.ink2)
                    }
                }
            }
            .padding(.leading, 28)
            .padding(.bottom, 12)
        }
    }

    /// Secondary line for reopened or skipped rungs. A reopened rung is a
    /// task, never a demotion; a skip shows its stated reason and the way
    /// back (R-7.4: user-reversible).
    @ViewBuilder
    private var annotation: some View {
        switch row.detail {
        case .done(reopened: true):
            Text("Came loose. Worth another look; the completion stands.")
                .font(.footnote)
                .foregroundStyle(CoinyTheme.ink2)
                .padding(.leading, 28)
        case let .skipped(reason):
            optOutAnnotation(reasonText: JourneyPresentation.skipReasonText(reason))
        case .notApplicable:
            optOutAnnotation(reasonText: nil)
        default:
            EmptyView()
        }
    }

    @ViewBuilder
    private func optOutAnnotation(reasonText: String?) -> some View {
        HStack(spacing: 12) {
            if let reasonText {
                Text(reasonText)
                    .font(.footnote)
                    .foregroundStyle(CoinyTheme.ink2)
            }
            if isOptedOut {
                Button("Take it back", action: onUnskip)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(CoinyTheme.signal)
                    .frame(minHeight: 44)
                    .accessibilityIdentifier("journey.rung.\(row.id).unskip")
            }
        }
        .padding(.leading, 28)
    }
}

#Preview("Journey") {
    HomeJourneyView(
        rows: HomePresentation.journeyRows(for: nil),
        journey: JourneyStore()
    )
    .background(CoinyTheme.screen)
}
