import SwiftUI

/// The expanded journey: the eight rungs of the Foundation Ladder, scrolling
/// beneath the pinned Panel Window. Deliberately quiet (R-4.4): no animation,
/// no speech, no character art anywhere in this list. Completed rungs stay
/// visible and stay marked done; the ladder is a record of achievement, not a
/// to-do list. No rung can be failed, so no failure UI exists here.
struct HomeJourneyView: View {
    let rows: [JourneyRow]

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
                    JourneyRowView(row: row)
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
        .background(CoinyTheme.screen)
        .accessibilityIdentifier("home.journey")
    }
}

/// One rung row: minimum 44pt tall (R-11.5), a hairline below, state carried
/// by words ("done", "ACTIVE", "skipped"), never by colour alone.
private struct JourneyRowView: View {
    let row: JourneyRow

    var body: some View {
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
            annotation
        }
        .padding(.bottom, annotationExists ? 8 : 0)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(CoinyTheme.rule)
                .frame(height: 1)
        }
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }

    private var isActive: Bool {
        if case .active = row.detail { return true }
        return false
    }

    private var annotationExists: Bool {
        switch row.detail {
        case .done(reopened: true): return true
        case .skipped(reason: .some): return true
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
                    .foregroundStyle(CoinyTheme.screen)
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
    /// task, never a demotion; the completion stands.
    @ViewBuilder
    private var annotation: some View {
        switch row.detail {
        case .done(reopened: true):
            Text("Came loose. Worth another look; the completion stands.")
                .font(.footnote)
                .foregroundStyle(CoinyTheme.ink2)
                .padding(.leading, 28)
        case let .skipped(reason: .some(reason)):
            Text(reason)
                .font(.footnote)
                .foregroundStyle(CoinyTheme.ink2)
                .padding(.leading, 28)
        default:
            EmptyView()
        }
    }
}

#Preview("Journey") {
    HomeJourneyView(rows: HomePresentation.journeyRows(for: nil))
        .background(CoinyTheme.screen)
}
