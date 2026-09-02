import SwiftUI

struct AlpacaView: View {
    @Environment(AlpacaViewModel.self) private var vm
    @State private var showingConnect = false
    @State private var apiKeyId = ""
    @State private var apiSecretKey = ""
    @State private var selectedEnv = "paper"

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else if vm.isConnected {
                connectedView
            } else {
                disconnectedView
            }
            if let error = vm.errorMessage {
                CoinyErrorLine(message: error)
                    .padding(.top, 4)
            }
        }
        .sheet(isPresented: $showingConnect) { connectSheet }
    }

    private var disconnectedView: some View {
        HStack {
            Text("Connect Alpaca brokerage")
                .font(.caption)
                .foregroundStyle(CoinyTheme.ink2)
            Spacer()
            Button("Connect") { showingConnect = true }
                .font(.caption)
                .buttonStyle(.bordered)
        }
        .padding(.top, 4)
    }

    private var connectedView: some View {
        VStack(spacing: 6) {
            if let equity = vm.lastEquityUsd {
                HStack {
                    Label("Portfolio", systemImage: "chart.bar.fill")
                        .font(.caption)
                        .foregroundStyle(CoinyTheme.ink2)
                    Spacer()
                    Text(equity, format: .currency(code: "USD"))
                        .font(.caption.monospacedDigit())
                }
            }
            holdings

            HStack {
                Button("Sync") { Task { await vm.sync() } }
                    .font(.caption)
                    .buttonStyle(.bordered)
                Spacer()
                Button("Disconnect", role: .destructive) { Task { await vm.disconnect() } }
                    .font(.caption)
            }
        }
        .padding(.top, 4)
        // On appear rather than on a button: the equity figure above is
        // meaningless on its own, which was the entire complaint. Loading is
        // still explicit and separate from the tab's fan-out, because the
        // backend reads this live from Alpaca.
        .task { await vm.loadPositions() }
    }

    /// The individual positions behind the equity figure. Before this the
    /// brokerage was a single opaque number, which is the shallow end of the
    /// one axis this product competes on.
    @ViewBuilder
    private var holdings: some View {
        if vm.isLoadingPositions {
            ProgressView()
                .frame(maxWidth: .infinity)
                .padding(.vertical, 4)
                .accessibilityLabel("Loading holdings")
        } else if vm.hasLoadedPositions && vm.positions.isEmpty {
            // An empty account is a real answer, so say so rather than
            // rendering nothing and looking like a failed load.
            HStack {
                Text("No open positions")
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.ink2)
                Spacer()
            }
        } else {
            ForEach(vm.positions) { position in
                CoinyHairline().padding(.vertical, 6)
                positionRow(position)
            }
        }
    }

    private func positionRow(_ position: AlpacaPosition) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(position.symbol)
                    .font(.subheadline)
                    .lineLimit(1)
                Text(Self.subtitle(for: position))
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.ink2)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(position.marketValueUsd, format: .currency(code: "USD"))
                    .font(.subheadline.monospacedDigit())
                Text(Self.gainLabel(for: position))
                    .font(.caption.monospacedDigit())
                    // Colour is a reinforcement, never the only carrier: the
                    // sign is in the text too, so this reads correctly without
                    // colour vision.
                    .foregroundStyle(position.unrealizedPlUsd < 0 ? CoinyTheme.negative : CoinyTheme.positive)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Self.accessibilityLabel(for: position))
    }

    /// Quantity is formatted rather than interpolated: a fractional share or a
    /// crypto amount renders as 0.045, not 4.5e-2.
    private static func quantityText(_ qty: Double) -> String {
        qty.formatted(.number.precision(.fractionLength(0...4)))
    }

    private static func subtitle(for position: AlpacaPosition) -> String {
        let asset = position.assetClass.replacingOccurrences(of: "_", with: " ")
        return "\(quantityText(position.qty)) × \(position.currentPriceUsd.formatted(.currency(code: "USD"))) · \(asset)"
    }

    private static func gainLabel(for position: AlpacaPosition) -> String {
        let sign = position.unrealizedPlUsd < 0 ? "-" : "+"
        return sign + abs(position.unrealizedPlUsd).formatted(.currency(code: "USD"))
    }

    private static func accessibilityLabel(for position: AlpacaPosition) -> String {
        let direction = position.unrealizedPlUsd < 0 ? "down" : "up"
        return """
            \(position.symbol), \(quantityText(position.qty)) units, \
            worth \(position.marketValueUsd.formatted(.currency(code: "USD"))), \
            \(direction) \(abs(position.unrealizedPlUsd).formatted(.currency(code: "USD")))
            """
    }

    private var connectSheet: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("API Key ID", text: $apiKeyId)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                } header: {
                    Text("API Key ID")
                } footer: {
                    // The scope instruction, not just where to find the key
                    // (runbook G2.12, audit 2.6.7). `privacy-policy.md` already
                    // tells the user we instruct them to create read-only keys
                    // for Kraken, Kalshi and Alpaca; Kraken said it and these
                    // two did not, which made the sentence in the policy false
                    // for the two vendors whose keys can carry TRADE rights.
                    Text(
                        "Found in your Alpaca dashboard under API Keys. "
                            + "Create the key with **read-only** access. Coiny reads "
                            + "positions and balances and never places orders."
                    )
                    .font(.caption2)
                }
                Section("API Secret Key") {
                    SecureField("Secret key", text: $apiSecretKey)
                        .autocorrectionDisabled()
                }
                Section {
                    Picker("Environment", selection: $selectedEnv) {
                        Text("Paper (simulation)").tag("paper")
                        Text("Live").tag("live")
                    }
                    .pickerStyle(.segmented)
                } header: {
                    Text("Environment")
                } footer: {
                    // Live is the one that touches real money, and it is the
                    // option a reader skims past. Naming the consequence beside
                    // the switch is the whole mitigation.
                    Text("Live keys reach a real brokerage account. Read-only access is enough for either.")
                        .font(.caption2)
                }
            }
            .navigationTitle("Connect Alpaca")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { resetForm(); showingConnect = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Connect") {
                        let k = apiKeyId; let s = apiSecretKey; let e = selectedEnv
                        resetForm()
                        showingConnect = false
                        Task { await vm.connect(apiKeyId: k, apiSecretKey: s, env: e) }
                    }
                    .disabled(apiKeyId.isEmpty || apiSecretKey.isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func resetForm() {
        apiKeyId = ""
        apiSecretKey = ""
        selectedEnv = "paper"
    }
}
