import SwiftUI

// The subviews of the six-group Wealth screen. Status is always carried in
// text, never colour alone (PRD section 11); every interactive element is at
// least 44pt tall.

// MARK: - Banner

struct WealthBannerView: View {
    let text: String
    let systemImage: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .foregroundStyle(CoinyTheme.ink2)
                .accessibilityHidden(true)
            Text(text)
                .font(.subheadline)
                .frame(maxWidth: .infinity, alignment: .leading)
            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .font(.subheadline.weight(.semibold))
                    .buttonStyle(.coinyFilledInline)
            }
        }
        .padding(12)
        .frame(minHeight: 44)
        .background(CoinyTheme.surface, in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(CoinyTheme.rule, lineWidth: 1))
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Composition bar

/// The one 8pt stacked horizontal composition bar (R-7.27, never a donut).
/// The bar is a summary; its meaning is carried by the legend text and the
/// accessibility label, not the colours.
struct CompositionBarView: View {
    let segments: [(group: WealthGroup, fraction: Double)]

    var body: some View {
        if segments.isEmpty {
            EmptyView()
        } else {
            VStack(alignment: .leading, spacing: 6) {
                GeometryReader { geo in
                    HStack(spacing: 1) {
                        ForEach(segments, id: \.group) { segment in
                            Rectangle()
                                .fill(Self.color(for: segment.group))
                                .frame(width: max(2, geo.size.width * segment.fraction))
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                }
                .frame(height: 8)
                legend
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(accessibilitySummary)
        }
    }

    private var legend: some View {
        HStack(spacing: 12) {
            ForEach(segments, id: \.group) { segment in
                HStack(spacing: 4) {
                    Circle()
                        .fill(Self.color(for: segment.group))
                        .frame(width: 8, height: 8)
                    Text("\(segment.group.title) \(Self.percentText(segment.fraction))")
                        .font(.caption2)
                        .foregroundStyle(CoinyTheme.ink2)
                }
            }
        }
    }

    private var accessibilitySummary: Text {
        let parts = segments.map { "\($0.group.title) \(Self.percentText($0.fraction))" }
        return Text("Composition: \(parts.joined(separator: ", "))")
    }

    static func percentText(_ fraction: Double) -> String {
        "\(Int((fraction * 100).rounded())) percent"
    }

    /// Six opacity steps of `ink`, not six hues (design-direction 6.3 rule 4).
    /// Six chromatic segments made the app read as having six accents when it
    /// has one, and one of them was the purple 3.1 exists to remove. The values
    /// are safe to grade by opacity because the legend beside each swatch
    /// carries the number, so no reader has to tell two segments apart by
    /// appearance (WCAG 1.4.11 is not engaged).
    static func color(for group: WealthGroup) -> Color {
        switch group {
        case .liquid: return CoinyTheme.ink
        case .invested: return CoinyTheme.ink.opacity(0.85)
        case .crypto: return CoinyTheme.ink.opacity(0.70)
        case .owned: return CoinyTheme.ink.opacity(0.55)
        case .speculative: return CoinyTheme.ink.opacity(0.40)
        case .owed: return CoinyTheme.ink.opacity(0.25)
        }
    }
}

// MARK: - Group section

struct WealthGroupBoxView: View {
    let section: WealthGroupSection
    let bankNeedsRepair: Bool
    let onRefresh: () -> Void
    let onRepairBank: () -> Void

    var body: some View {
        GroupBox {
            VStack(spacing: 0) {
                header
                ForEach(section.rows) { row in
                    Divider().padding(.vertical, 2)
                    WealthRowView(
                        row: row,
                        treatment: WealthPresenter.treatment(for: row),
                        bankNeedsRepair: bankNeedsRepair,
                        onRefresh: onRefresh,
                        onRepairBank: onRepairBank
                    )
                }
            }
        }
    }

    private var header: some View {
        HStack {
            Text(section.group.title)
                .font(.headline)
            Spacer()
            // Absolute values in ink; debt is a fact, never red.
            Text(section.includedTotal, format: .currency(code: "USD"))
                .font(.headline.monospacedDigit())
                .foregroundStyle(CoinyTheme.ink)
        }
        .frame(minHeight: 44)
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Class row

struct WealthRowView: View {
    let row: WealthRow
    let treatment: WealthRowTreatment
    let bankNeedsRepair: Bool
    let onRefresh: () -> Void
    let onRepairBank: () -> Void

    private var isPlaidClass: Bool { row.cls == .bank || row.cls == .investments }

    var body: some View {
        HStack(alignment: .center, spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                Text(row.cls.displayName)
                    .font(.subheadline)
                if let subtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(CoinyTheme.ink2)
                }
            }
            Spacer(minLength: 8)
            trailing
        }
        .frame(minHeight: 44)
        .contentShape(Rectangle())
        .onTapGesture {
            if case .aged = treatment { onRefresh() }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityText)
    }

    private var subtitle: String? {
        switch treatment {
        case .plain:
            return nil
        case let .aged(label), let .selfReported(label):
            return label
        case let .mutedExcluded(label):
            return label
        case let .failure(message):
            return message
        case .disconnected:
            return "Disconnected"
        case let .reauthRequired(label):
            return "Sign in again. \(label)"
        case .expiring:
            return "Connection expires soon. Renew to keep data flowing."
        case .pending:
            return "Waiting for the first sync"
        }
    }

    @ViewBuilder
    private var trailing: some View {
        switch treatment {
        case .plain, .aged, .selfReported, .expiring:
            valueText(muted: false)
        case .mutedExcluded:
            HStack(spacing: 8) {
                valueText(muted: true)
                actionButton("Refresh", action: refreshOrRepair)
            }
        case .failure:
            actionButton("Retry", action: refreshOrRepair)
        case .disconnected:
            NavigationLink {
                ManageAccountsView()
            } label: {
                Text("Re-link")
                    .font(.caption)
                    .frame(minHeight: 44)
            }
        case .reauthRequired:
            HStack(spacing: 8) {
                valueText(muted: true)
                actionButton("Reconnect", action: repairOrRefresh)
            }
        case .pending:
            ProgressView()
                .accessibilityHidden(true)
        }
    }

    private func valueText(muted: Bool) -> some View {
        Text(row.reading.value ?? 0, format: .currency(code: "USD"))
            .font(.subheadline.monospacedDigit())
            .foregroundStyle(muted ? CoinyTheme.ink2 : CoinyTheme.ink)
    }

    private func actionButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(title, action: action)
            .font(.caption)
            .buttonStyle(.bordered)
            .frame(minHeight: 44)
    }

    /// Broken Plaid classes route to Link update mode; everything else can
    /// only be refreshed.
    private func refreshOrRepair() {
        if isPlaidClass && bankNeedsRepair {
            onRepairBank()
        } else {
            onRefresh()
        }
    }

    private func repairOrRefresh() {
        if isPlaidClass {
            onRepairBank()
        } else {
            onRefresh()
        }
    }

    private var accessibilityText: Text {
        var parts: [String] = [row.cls.displayName]
        if case .failure = treatment {
            // A failure reads as a failure, never as a zero.
        } else if case .pending = treatment {
            // No value yet.
        } else if case .disconnected = treatment {
            // Revoked data is not spoken.
        } else if let value = row.reading.value {
            parts.append(value.formatted(.currency(code: "USD")))
        }
        if let subtitle {
            parts.append(subtitle)
        }
        return Text(parts.joined(separator: ", "))
    }
}
