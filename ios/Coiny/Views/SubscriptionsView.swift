import SwiftUI

struct SubscriptionsView: View {
    @State private var subscriptions: [DetectedSubscription] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        List {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .listRowBackground(Color.clear)
            } else if subscriptions.isEmpty {
                ContentUnavailableView(
                    "No subscriptions detected",
                    systemImage: "arrow.clockwise.circle",
                    description: Text("Recurring charges appear here once 3+ months of transactions have been synced.")
                )
                .listRowBackground(Color.clear)
            } else {
                Section {
                    ForEach(subscriptions) { sub in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(sub.merchantName)
                                    .font(.subheadline.weight(.medium))
                                Text("Every ~\(sub.cadenceDays) days · \(sub.count) payments")
                                    .font(.caption)
                                    .foregroundStyle(CoinyTheme.ink2)
                            }
                            Spacer()
                            Text(sub.amount, format: .currency(code: "USD"))
                                .font(.subheadline.monospacedDigit())
                        }
                        .padding(.vertical, 2)
                    }
                } header: {
                    Text("Detected monthly charges")
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
        .navigationTitle("Subscriptions")
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

    private func load() async {
        isLoading = true
        errorMessage = nil
        do {
            subscriptions = try await API.shared.getSubscriptions()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

#Preview {
    NavigationStack {
        SubscriptionsView()
    }
}
