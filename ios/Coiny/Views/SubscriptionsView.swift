import SwiftUI

struct SubscriptionsView: View {
    @State private var summary: RecurringSummary = .empty
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        List {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .listRowBackground(Color.clear)
            } else if summary.outflow.isEmpty && summary.inflow.isEmpty {
                ContentUnavailableView(
                    "No recurring charges detected",
                    systemImage: "arrow.clockwise.circle",
                    description: Text("Recurring charges appear here once your bank has sent a few months of transactions.")
                )
                .listRowBackground(Color.clear)
            } else {
                if !summary.outflow.isEmpty {
                    Section {
                        ForEach(summary.outflow) { row(for: $0) }
                    } header: {
                        Text("Recurring charges")
                    } footer: {
                        totalFooter(
                            summary.monthlyOutflowTotal,
                            noun: "charges",
                            excluded: summary.excludedFromTotals
                        )
                    }
                }

                // Kept in its own section rather than mixed in. Plaid reports
                // recurring income from the same endpoint, and a paycheck
                // listed among subscriptions reads as a bug.
                if !summary.inflow.isEmpty {
                    Section {
                        ForEach(summary.inflow) { row(for: $0) }
                    } header: {
                        Text("Recurring income")
                    } footer: {
                        totalFooter(summary.monthlyInflowTotal, noun: "income", excluded: 0)
                    }
                }
            }
        }
        .listStyle(.plain)
        // The only themed surface here was the error inset, so the list drew
        // on the system background and the screen had a hard seam across it:
        // warm #151711 down to the inset, pure #000000 below. Same omission as
        // the paywall's, found the same way, by looking at it in dark.
        .scrollContentBackground(.hidden)
        .background(CoinyTheme.screen)
        // "Recurring", not "Subscriptions": the screen now carries recurring
        // income as well as charges, and a paycheck under a heading that says
        // Subscriptions reads as a bug.
        .navigationTitle("Recurring")
        .refreshable { await load() }
        .task { await load() }
        .safeAreaInset(edge: .top) {
            // In the flow, not floating over the list: an overlay covered the
            // rows it was explaining and had no way to be retried.
            if let errorMessage {
                CoinyErrorLine(message: errorMessage, actionTitle: "Try again") {
                    Task { await load() }
                }
                .padding(.horizontal)
                .background(CoinyTheme.screen)
            }
        }
    }

    private func row(for item: RecurringItem) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(.subheadline.weight(.medium))
                Text(Self.cadenceLabel(item))
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.ink2)
            }
            Spacer()
            Text(item.amount, format: .currency(code: "USD"))
                .font(.subheadline.monospacedDigit())
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }

    /// "$9.99 monthly", and for anything not already monthly, what that works
    /// out to per month. An annual subscription is the one people forget, so
    /// the comparable number is the point of showing it at all.
    static func cadenceLabel(_ item: RecurringItem) -> String {
        let cadence = item.frequency.lowercased().replacingOccurrences(of: "_", with: "-")
        guard let monthly = item.monthlyAmount, item.frequency.uppercased() != "MONTHLY" else {
            return cadence
        }
        return "\(cadence) · \(MoneyText.usd(monthly))/mo"
    }

    @ViewBuilder
    private func totalFooter(_ total: Double, noun: String, excluded: Int) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("\(MoneyText.usd(total)) a month in \(noun).")
            // Never silently drop rows from a total. Plaid returns UNKNOWN for
            // some cadences and those cannot be restated per month, so they
            // are shown in the list and named here rather than counted as zero.
            if excluded > 0 {
                Text(excluded == 1
                     ? "1 more has no regular schedule, so it is not in that total."
                     : "\(excluded) more have no regular schedule, so they are not in that total.")
            }
        }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        do {
            summary = try await API.shared.getSubscriptions()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
