import SwiftUI

/// The DEBT block of the expanded journey: one quiet navigation row into the
/// debt surface. Data loads on the pushed screen, not here, so opening the
/// journey costs nothing extra.
struct JourneyDebtSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("DEBT")
                .font(.system(.caption, design: .monospaced).weight(.medium))
                .foregroundStyle(CoinyTheme.ink3)
                .padding(.top, 40)
                .padding(.bottom, 8)
                .accessibilityAddTraits(.isHeader)

            NavigationLink {
                DebtView()
            } label: {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text("Balances, rates and the payoff plan")
                        .font(.body.weight(.medium))
                        .foregroundStyle(CoinyTheme.ink)
                        .multilineTextAlignment(.leading)
                    Spacer(minLength: 8)
                    Text("open")
                        .font(.system(.footnote, design: .monospaced))
                        .foregroundStyle(CoinyTheme.signal)
                }
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .overlay(alignment: .bottom) {
                Rectangle()
                    .fill(CoinyTheme.rule)
                    .frame(height: 1)
            }
            .accessibilityHint("Opens the debt list and payoff plan.")
            .accessibilityIdentifier("journey.debt.open")
        }
    }
}

/// The debt surface (PRD 7.4): merged accounts, the strategy picker with the
/// dollar cost of the choice always visible, the payoff plan, and the manual
/// merge/split affordances. States the number and the next action; never
/// shames, never uses red, never renders a blank date.
struct DebtView: View {
    @State private var store = DebtStore()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                content
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
        .background(CoinyTheme.screen)
        .navigationTitle("Debts")
        .navigationBarTitleDisplayMode(.inline)
        .accessibilityIdentifier("debts.screen")
        .task {
            await store.load()
        }
    }

    @ViewBuilder
    private var content: some View {
        switch store.debtsState {
        case .loading:
            skeleton
        case .failed:
            Text("Debts are not loading right now.")
                .font(.subheadline)
                .foregroundStyle(CoinyTheme.ink2)
                .frame(minHeight: 44, alignment: .leading)
                .padding(.top, 20)
        case .loaded:
            if store.debts.isEmpty {
                emptyState
            } else {
                loadedContent
            }
        }
    }

    private var skeleton: some View {
        VStack(spacing: 12) {
            ForEach(0..<3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 4)
                    .fill(CoinyTheme.rule)
                    .frame(height: 44)
            }
        }
        .padding(.top, 20)
        .accessibilityHidden(true)
    }

    /// One plain line, not an empty-state illustration (PRD 8.3 spirit).
    private var emptyState: some View {
        Text("Nothing here yet. Debts appear when a connected bank or the credit bureau reports one.")
            .font(.subheadline)
            .foregroundStyle(CoinyTheme.ink2)
            .fixedSize(horizontal: false, vertical: true)
            .frame(minHeight: 44, alignment: .leading)
            .padding(.top, 20)
    }

    @ViewBuilder
    private var loadedContent: some View {
        totalHeader
        DebtPlanSection(store: store)
        accountsSection
        syncFooter
    }

    /// The number, stated. "Owed" matches the Wealth group of the same name;
    /// the phrase "you owe" never appears (PRD 10).
    private var totalHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("OWED")
                .font(.system(.caption, design: .monospaced).weight(.medium))
                .foregroundStyle(CoinyTheme.ink3)
            Text(DebtPresentation.currency(DebtPresentation.totalOwed(debts: store.debts)))
                .font(.system(.largeTitle, design: .monospaced).weight(.semibold))
                .foregroundStyle(CoinyTheme.ink)
        }
        .padding(.top, 20)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            "Owed, \(DebtPresentation.currency(DebtPresentation.totalOwed(debts: store.debts)))"
        )
    }

    private var accountsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("ACCOUNTS")
                .font(.system(.caption, design: .monospaced).weight(.medium))
                .foregroundStyle(CoinyTheme.ink3)
                .padding(.top, 40)
                .padding(.bottom, 8)
                .accessibilityAddTraits(.isHeader)

            ForEach(store.debts) { debt in
                NavigationLink {
                    DebtDetailView(store: store, debtId: debt.debtId)
                } label: {
                    DebtRowView(debt: debt, finding: finding(for: debt))
                }
                .buttonStyle(.plain)
                .accessibilityHint("Opens this debt's details.")
                .accessibilityIdentifier("debts.row.\(debt.debtId)")
            }
        }
    }

    private func finding(for debt: DebtAccount) -> DebtPlanFinding? {
        store.plan?.findings.first { $0.isNeverPaysOff && $0.id == debt.debtId }
    }

    private var syncFooter: some View {
        Button {
            Task { await store.sync() }
        } label: {
            Text(store.isSyncing ? "Refreshing…" : "Refresh from your bank and the bureau")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(CoinyTheme.signal)
                .frame(minHeight: 44, alignment: .leading)
        }
        .disabled(store.isSyncing)
        .padding(.top, 24)
        .accessibilityIdentifier("debts.sync")
    }
}

/// One merged debt: name and balance, the R-7.16 primary number (the payment
/// that clears it in 36 months), the demoted minimum, and the APR stated as
/// fact or flagged as an assumption. State is carried by words, never colour.
struct DebtRowView: View {
    let debt: DebtAccount
    /// The plan's never_pays_off finding for this debt, when present. It
    /// replaces the 36-month headline: the trap is the headline.
    var finding: DebtPlanFinding?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(DebtPresentation.displayName(for: debt))
                    .font(.body.weight(.medium))
                    .foregroundStyle(CoinyTheme.ink)
                if let tag = DebtPresentation.statusTag(debt.status) {
                    Text(tag)
                        .font(.system(.footnote, design: .monospaced))
                        .foregroundStyle(CoinyTheme.ink3)
                }
                Spacer(minLength: 8)
                if let balance = debt.balance {
                    Text(DebtPresentation.currency(balance))
                        .font(.system(.body, design: .monospaced))
                        .foregroundStyle(CoinyTheme.ink)
                }
            }

            Text("\(DebtPresentation.typeLabel(debt.type)) · \(DebtPresentation.aprLine(for: debt))")
                .font(.footnote)
                .foregroundStyle(debt.aprAssumed ? CoinyTheme.signal : CoinyTheme.ink3)
                .fixedSize(horizontal: false, vertical: true)

            if let finding {
                Text(DebtPresentation.neverPaysOffLine(minPayment: debt.minPayment, finding: finding))
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(CoinyTheme.ink)
                    .fixedSize(horizontal: false, vertical: true)
            } else if debt.payment36 > 0 {
                Text(DebtPresentation.clearsIn36Line(payment36: debt.payment36))
                    .font(.subheadline)
                    .foregroundStyle(CoinyTheme.ink2)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if let minimum = DebtPresentation.minimumLine(minPayment: debt.minPayment) {
                Text(minimum)
                    .font(.footnote)
                    .foregroundStyle(CoinyTheme.ink3)
            }
        }
        .padding(.vertical, 10)
        .frame(minHeight: 44)
        .contentShape(Rectangle())
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(CoinyTheme.rule)
                .frame(height: 1)
        }
        .accessibilityElement(children: .combine)
    }
}

#Preview("Debts") {
    NavigationStack {
        DebtView()
    }
}
