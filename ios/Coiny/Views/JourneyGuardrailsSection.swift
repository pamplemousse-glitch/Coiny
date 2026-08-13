import SwiftUI

/// The GUARDRAILS block of the expanded journey (R-7.11, R-7.12). Seven rows,
/// each with its period, latest outcome, streak and banked repair tokens.
/// A guardrail is never rendered as a failure: a miss resets the counter and
/// says so plainly, an unmeasurable guardrail names the missing data source,
/// and outcome is always carried by words, never colour alone (R-11).
struct JourneyGuardrailsSection: View {
    let store: JourneyStore

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("GUARDRAILS")
                .font(.system(.caption, design: .monospaced).weight(.medium))
                .foregroundStyle(CoinyTheme.ink3)
                .padding(.top, 40)
                .padding(.bottom, 8)
                .accessibilityAddTraits(.isHeader)

            content
        }
        // No container-level identifier: SwiftUI would stamp it onto every
        // descendant element, clobbering the per-row identifiers.
    }

    @ViewBuilder
    private var content: some View {
        switch store.guardrails {
        case .loading:
            RoundedRectangle(cornerRadius: 4)
                .fill(CoinyTheme.rule)
                .frame(height: 44)
                .accessibilityHidden(true)
        case .failed:
            Text("Guardrails are not loading right now.")
                .font(.subheadline)
                .foregroundStyle(CoinyTheme.ink2)
                .frame(minHeight: 44, alignment: .leading)
        case let .loaded(guardrails):
            ForEach(guardrails) { guardrail in
                GuardrailRowView(guardrail: guardrail)
            }
        }
    }
}

/// One guardrail row. Minimum 44pt (R-11.5), hairline below, words for state.
struct GuardrailRowView: View {
    let guardrail: GuardrailStatus

    var body: some View {
        let display = JourneyPresentation.display(for: guardrail)
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(display.label)
                    .font(.body)
                    .foregroundStyle(display.isIndeterminate ? CoinyTheme.ink3 : CoinyTheme.ink)
                Spacer(minLength: 8)
                Text(display.periodNoun == "week" ? "weekly" : "monthly")
                    .font(.system(.footnote, design: .monospaced))
                    .foregroundStyle(CoinyTheme.ink3)
            }

            Text(display.outcomeText)
                .font(.footnote)
                .foregroundStyle(CoinyTheme.ink2)
                .fixedSize(horizontal: false, vertical: true)

            if display.streakText != nil || display.repairText != nil {
                HStack(spacing: 12) {
                    if let streak = display.streakText {
                        Text(streak)
                            .font(.system(.caption, design: .monospaced))
                            .foregroundStyle(CoinyTheme.ink2)
                    }
                    if let repairs = display.repairText {
                        Text(repairs)
                            .font(.system(.caption, design: .monospaced))
                            .foregroundStyle(CoinyTheme.ink3)
                    }
                }
            }
        }
        .padding(.vertical, 10)
        .frame(minHeight: 44)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(CoinyTheme.rule)
                .frame(height: 1)
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("journey.guardrail.\(guardrail.key)")
    }
}
