import SwiftUI

// The shared primitives. Every surface builds from these three, so a change to
// the design system is a change to this file rather than a sweep.
//
// They are modelled on Home, the journey and Debt, which were built against the
// current design direction; the surfaces that predate it (Wealth, Manage
// Accounts, the provider inlines) are the ones being brought over.

// MARK: - Hairline

/// The one separator. `Divider()` is a system rule whose colour, thickness and
/// inset are the platform's, not the palette's, and it was used with six
/// different vertical paddings across the app.
struct CoinyHairline: View {
    var body: some View {
        Rectangle()
            .fill(CoinyTheme.rule)
            .frame(height: 1)
            .accessibilityHidden(true)
    }
}

// MARK: - Section

/// The one grouping primitive: a monospaced caption heading, an optional total
/// on the same line, a hairline, and rows.
///
/// It replaces `GroupBox`, which drew a card. Cards inside the scrolling card
/// of a screen were tell 7 in design-direction 3.1, and `GroupBox` also brings
/// the system's own fill and corner radius, neither of which is in the palette.
/// Flat sections separated by hairlines are what Home, the journey and Debt
/// already do.
struct CoinySection<Content: View>: View {
    let title: String
    /// Rendered on the heading line when the section sums to a figure.
    var total: Double?
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            heading
            CoinyHairline()
            content
        }
        .padding(.top, 24)
    }

    private var heading: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(title.uppercased())
                .font(.system(.caption, design: .monospaced).weight(.medium))
                .foregroundStyle(CoinyTheme.ink3)
            Spacer(minLength: 8)
            if let total {
                // Absolute values are always ink, whatever the sign
                // (design-direction 4.3 rule 1).
                Text(total, format: .currency(code: "USD"))
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(CoinyTheme.ink)
            }
        }
        .frame(minHeight: 44)
        .padding(.bottom, 4)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
    }
}

// MARK: - Error

/// THE error treatment. Part 3 counted five: a banner with a retry, a
/// `ContentUnavailableView` with a retry, a coloured caption with no action in
/// twelve provider sections, a floating overlay, and a coloured caption on two
/// more screens. A user who has hit three of them has learned nothing
/// transferable about what a failure looks like in this app.
///
/// One quiet line, and an action when there is one to offer. Not coloured:
/// design-direction 4.3 spends the moss-and-clay pair on *deltas* and the three
/// graded health metrics, and rule 3 requires colour never to be the only
/// channel, so the words carry it. A first run with no accounts connected
/// should not open twelve red captions at once.
struct CoinyErrorLine: View {
    let message: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(message)
                .font(.subheadline)
                .foregroundStyle(CoinyTheme.ink2)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(CoinyTheme.signal)
                    .frame(minHeight: 44, alignment: .leading)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}

#Preview("Primitives") {
    ScrollView {
        VStack(alignment: .leading, spacing: 0) {
            CoinySection(title: "Bank", total: 12_403.55) {
                Text("Chequing")
                    .font(.subheadline)
                    .foregroundStyle(CoinyTheme.ink)
                    .frame(minHeight: 44)
                CoinyHairline()
                Text("Savings")
                    .font(.subheadline)
                    .foregroundStyle(CoinyTheme.ink)
                    .frame(minHeight: 44)
            }
            CoinySection(title: "Crypto") {
                CoinyErrorLine(message: "Prices are not loading right now.", actionTitle: "Try again") {}
            }
        }
        .padding(.horizontal, 20)
    }
    .background(CoinyTheme.screen)
}
