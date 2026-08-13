import SwiftUI

/// The payoff plan (R-7.14, R-7.15): strategy picker with the dollar cost of
/// the choice always visible in both directions, the debt-free headline, the
/// extra-payment control that drives it, the never_pays_off findings, and the
/// realized payoff order with dates. All math is the server's; this view only
/// states it.
struct DebtPlanSection: View {
    let store: DebtStore

    /// Local mirror of the extra payment so the slider moves smoothly; the
    /// store is committed when the gesture ends or a step button fires.
    @State private var localExtra: Double = 0
    @State private var sliderCap: Double = 2000
    @State private var hasSeededExtra = false

    var body: some View {
        if store.planDebts.isEmpty {
            EmptyView()
        } else {
            VStack(alignment: .leading, spacing: 0) {
                Text("THE PLAN")
                    .font(.system(.caption, design: .monospaced).weight(.medium))
                    .foregroundStyle(CoinyTheme.ink3)
                    .padding(.top, 40)
                    .padding(.bottom, 8)
                    .accessibilityAddTraits(.isHeader)

                content
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch store.planState {
        case .loading:
            RoundedRectangle(cornerRadius: 4)
                .fill(CoinyTheme.rule)
                .frame(height: 44)
                .accessibilityHidden(true)
        case .failed:
            Text("The plan is not loading right now.")
                .font(.subheadline)
                .foregroundStyle(CoinyTheme.ink2)
                .frame(minHeight: 44, alignment: .leading)
        case let .loaded(plan):
            VStack(alignment: .leading, spacing: 16) {
                strategyPicker(plan: plan)
                planNumbers(plan: plan)
                extraControl
                findingsBlock(plan: plan)
                orderBlock(plan: plan)
            }
            .opacity(store.isUpdatingPlan ? 0.6 : 1)
            .onAppear { seedExtra(from: plan) }
            .onChange(of: plan.extraMonthly) { _, newValue in
                localExtra = newValue
                sliderCap = max(sliderCap, cap(for: newValue))
            }
        }
    }

    // MARK: - Strategy (R-7.14)

    private func strategyPicker(plan: DebtPlanResponse) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                ForEach(DebtStrategy.allCases, id: \.rawValue) { strategy in
                    strategyButton(strategy, selected: plan.strategy == strategy)
                }
            }
            Text(DebtPresentation.strategyBlurb(plan.strategy))
                .font(.footnote)
                .foregroundStyle(CoinyTheme.ink3)
            // The cost of the choice, always shown, both directions. A picker
            // that hides its cost is the thing PRD 7.4 argues against.
            Text(DebtPresentation.strategyCostSentence(chosen: plan.strategy, comparison: plan.comparison))
                .font(.subheadline)
                .foregroundStyle(CoinyTheme.ink)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityIdentifier("debts.plan.cost")
        }
    }

    private func strategyButton(_ strategy: DebtStrategy, selected: Bool) -> some View {
        Button {
            Task { await store.selectStrategy(strategy) }
        } label: {
            Text(DebtPresentation.strategyName(strategy))
                .font(.subheadline.weight(selected ? .semibold : .regular))
                .foregroundStyle(selected ? CoinyTheme.screen : CoinyTheme.ink)
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(
                    selected ? AnyShapeStyle(CoinyTheme.signalFill) : AnyShapeStyle(CoinyTheme.surface),
                    in: RoundedRectangle(cornerRadius: 8)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(CoinyTheme.rule, lineWidth: selected ? 0 : 1)
                )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(DebtPresentation.strategyName(strategy)). \(DebtPresentation.strategyBlurb(strategy))")
        .accessibilityAddTraits(selected ? [.isSelected] : [])
        .accessibilityIdentifier("debts.plan.strategy.\(strategy.rawValue)")
    }

    // MARK: - The headline numbers

    private func planNumbers(plan: DebtPlanResponse) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(DebtPresentation.planHeadline(plan: plan))
                .font(.body.weight(.semibold))
                .foregroundStyle(CoinyTheme.ink)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityIdentifier("debts.plan.headline")
            if let minimums = DebtPresentation.minimumsOnlyLine(plan: plan) {
                Text(minimums)
                    .font(.footnote)
                    .foregroundStyle(CoinyTheme.ink2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .combine)
    }

    // MARK: - Extra payment (R-7.15)

    private var extraControl: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("EXTRA EACH MONTH")
                .font(.system(.caption2, design: .monospaced).weight(.medium))
                .foregroundStyle(CoinyTheme.ink3)
            HStack(spacing: 12) {
                stepButton(label: "minus", symbol: "minus", delta: -25)
                Text(DebtPresentation.currency(localExtra))
                    .font(.system(.title3, design: .monospaced).weight(.semibold))
                    .foregroundStyle(CoinyTheme.ink)
                    .frame(minWidth: 80)
                    .accessibilityHidden(true)
                stepButton(label: "plus", symbol: "plus", delta: 25)
            }
            Slider(
                value: $localExtra,
                in: 0...sliderCap,
                step: 25,
                onEditingChanged: { editing in
                    if !editing {
                        Task { await store.setExtraMonthly(localExtra) }
                    }
                }
            )
            .tint(CoinyTheme.signal)
            .accessibilityLabel("Extra payment each month")
            .accessibilityValue(DebtPresentation.currency(localExtra))
            .accessibilityIdentifier("debts.plan.extra")
        }
    }

    private func stepButton(label: String, symbol: String, delta: Double) -> some View {
        Button {
            localExtra = max(0, min(sliderCap, localExtra + delta))
            Task { await store.setExtraMonthly(localExtra) }
        } label: {
            Image(systemName: symbol)
                .font(.body.weight(.semibold))
                .foregroundStyle(CoinyTheme.signal)
                .frame(width: 44, height: 44)
                .background(CoinyTheme.surface, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(CoinyTheme.rule, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(delta > 0 ? "Add" : "Remove") 25 dollars of extra payment")
    }

    // MARK: - never_pays_off findings

    /// The most important thing this screen can say, said plainly with the
    /// payment that fixes it. Never a blank date, never an absurd year.
    @ViewBuilder
    private func findingsBlock(plan: DebtPlanResponse) -> some View {
        let findings = plan.findings.filter(\.isNeverPaysOff)
        if !findings.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                ForEach(findings, id: \.id) { finding in
                    let name = store.debtName(id: finding.id)
                    let line = DebtPresentation.neverPaysOffLine(
                        minPayment: store.debt(id: finding.id)?.minPayment,
                        finding: finding
                    )
                    Text("\(name): \(line)")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(CoinyTheme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("debts.plan.finding.\(finding.id)")
                }
            }
            .padding(12)
            .background(CoinyTheme.surface, in: RoundedRectangle(cornerRadius: 8))
        }
    }

    // MARK: - Payoff order

    private func orderBlock(plan: DebtPlanResponse) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("PAYOFF ORDER")
                .font(.system(.caption2, design: .monospaced).weight(.medium))
                .foregroundStyle(CoinyTheme.ink3)
                .padding(.bottom, 4)
            ForEach(plan.perDebt, id: \.id) { entry in
                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    Text(String(entry.order))
                        .font(.system(.footnote, design: .monospaced))
                        .foregroundStyle(CoinyTheme.ink3)
                        .frame(width: 16, alignment: .leading)
                    Text(DebtPresentation.orderLine(entry: entry, name: store.debtName(id: entry.id)))
                        .font(.subheadline)
                        .foregroundStyle(CoinyTheme.ink2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(minHeight: 32)
                .accessibilityElement(children: .combine)
                .accessibilityLabel(
                    "Position \(entry.order). \(DebtPresentation.orderLine(entry: entry, name: store.debtName(id: entry.id)))"
                )
            }
        }
    }

    // MARK: - Helpers

    private func seedExtra(from plan: DebtPlanResponse) {
        guard !hasSeededExtra else { return }
        hasSeededExtra = true
        localExtra = plan.extraMonthly
        sliderCap = cap(for: plan.extraMonthly)
    }

    /// Slider ceiling: generous headroom over the current value, grown in
    /// $500 steps so the range never shrinks under the thumb.
    private func cap(for extra: Double) -> Double {
        max(2000, (((extra * 2) / 500).rounded(.up)) * 500)
    }
}
