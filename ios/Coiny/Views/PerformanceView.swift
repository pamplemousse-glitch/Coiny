import SwiftUI

struct PerformanceView: View {
    @Environment(PerformanceViewModel.self) private var vm

    var body: some View {
        GroupBox {
            VStack(spacing: 0) {
                HStack {
                    Label("Performance", systemImage: "chart.line.uptrend.xyaxis")
                        .font(.headline)
                        .foregroundStyle(CoinyTheme.ink)
                        .accessibilityAddTraits(.isHeader)
                    Spacer()
                }

                if vm.isLoading {
                    Divider().padding(.vertical, 6)
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                } else {
                    if let perf = vm.coinbasePerformance, let pnl = perf.unrealizedPnl {
                        Divider().padding(.vertical, 6)
                        pnlRow(label: "Unrealized PnL (Coinbase)", value: pnl)
                    }

                    if let zerion = vm.zerionPnl {
                        Divider().padding(.vertical, 6)
                        pnlRow(label: "Total gain (DeFi)", value: zerion.totalGain)
                        Divider().padding(.vertical, 6)
                        pnlRow(label: "Unrealized gain (DeFi)", value: zerion.unrealizedGain)
                        Divider().padding(.vertical, 6)
                        pnlRow(label: "Realized gain (DeFi)", value: zerion.realizedGain)
                    }

                    if !vm.defiPositions.isEmpty {
                        Divider().padding(.vertical, 6)
                        ForEach(vm.defiPositions) { position in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(position.symbol)
                                        .font(.subheadline.weight(.semibold))
                                    Text(position.name)
                                        .font(.caption)
                                        .foregroundStyle(CoinyTheme.ink2)
                                    Text("\(position.quantity, specifier: "%.4f") \(position.symbol)")
                                        .font(.caption2)
                                        .foregroundStyle(CoinyTheme.ink2)
                                }
                                Spacer()
                                Text(position.valueUsd, format: .currency(code: "USD"))
                                    .font(.subheadline.monospacedDigit())
                            }
                            .padding(.vertical, 2)
                        }
                    }
                }
            }
        }
    }

    private func pnlRow(label: String, value: Double) -> some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundStyle(CoinyTheme.ink2)
            Spacer()
            // A gain or a loss is a delta, so it may be coloured, but the sign
            // has to be printed too: colour is never the only channel
            // (design-direction 4.3 rule 3). `.currency` emits a minus for
            // negatives and nothing for positives, which left a gain
            // indistinguishable from a level once colour was removed.
            Text(value, format: .currency(code: "USD").sign(strategy: .always()))
                .font(.caption.monospacedDigit().weight(.semibold))
                .foregroundStyle(value >= 0 ? CoinyTheme.positive : CoinyTheme.negative)
        }
    }
}
