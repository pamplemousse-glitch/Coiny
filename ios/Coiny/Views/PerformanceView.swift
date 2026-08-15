import SwiftUI

struct PerformanceView: View {
    @Environment(PerformanceViewModel.self) private var vm

    var body: some View {
        CoinySection(title: "Performance") {
            if vm.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 44)
            } else {
                if let perf = vm.coinbasePerformance, let pnl = perf.unrealizedPnl {
                    pnlRow(label: "Unrealized PnL (Coinbase)", value: pnl)
                }

                if let zerion = vm.zerionPnl {
                    pnlRow(label: "Total gain (DeFi)", value: zerion.totalGain)
                    pnlRow(label: "Unrealized gain (DeFi)", value: zerion.unrealizedGain)
                    pnlRow(label: "Realized gain (DeFi)", value: zerion.realizedGain)
                }

                ForEach(vm.defiPositions) { position in
                    AccountRow(
                        title: position.symbol,
                        detail: "\(position.name) · "
                            + "\(position.quantity.formatted(.number.precision(.fractionLength(4)))) \(position.symbol)",
                        trailing: position.valueUsd.formatted(.currency(code: "USD"))
                    )
                }
            }
        }
    }

    private func pnlRow(label: String, value: Double) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(CoinyTheme.ink2)
            Spacer(minLength: 8)
            // A gain or a loss is a delta, so it may be coloured, but the sign
            // has to be printed too: colour is never the only channel
            // (design-direction 4.3 rule 3). `.currency` emits a minus for
            // negatives and nothing for positives, which left a gain
            // indistinguishable from a level once colour was removed.
            Text(value, format: .currency(code: "USD").sign(strategy: .always()))
                .font(.subheadline.monospacedDigit().weight(.semibold))
                .foregroundStyle(value >= 0 ? CoinyTheme.positive : CoinyTheme.negative)
        }
        .padding(.vertical, 8)
        .frame(minHeight: 44)
        .overlay(alignment: .bottom) { CoinyHairline() }
        .accessibilityElement(children: .combine)
    }
}
