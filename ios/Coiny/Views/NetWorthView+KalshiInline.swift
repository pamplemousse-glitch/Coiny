import SwiftUI

// Kalshi lived in `NetWorthView+WealthInlines.swift` until adding the
// read-only key guidance (runbook G2.12) pushed that file past the 550-line
// SwiftLint limit. It is the largest of the inlines by some way: it is the one
// vendor whose connect flow generates a keypair, walks the user through
// registering it, and renders market positions afterwards.

struct KalshiInlineView: View {
    let vm: KalshiViewModel
    let isConnected: Bool
    @State private var showingSetup = false
    @State private var generatedPair: KalshiKeyGen.KeyPair?
    @State private var keyId = ""

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else if isConnected {
                connectedView
            } else {
                disconnectedView
            }
            if let error = vm.errorMessage {
                CoinyErrorLine(message: error)
            }
        }
        .sheet(isPresented: $showingSetup) { setupSheet }
    }

    private var disconnectedView: some View {
        HStack {
            Text("Connect Kalshi prediction markets")
                .font(.caption)
                .foregroundStyle(CoinyTheme.ink2)
            Spacer()
            Button("Connect") {
                generatedPair = KalshiKeyGen.generate()
                showingSetup = true
            }
            .font(.caption)
            .buttonStyle(.bordered)
        }
        .padding(.top, 4)
    }

    private var connectedView: some View {
        VStack(spacing: 0) {
            // The cash/positions split. A single portfolio figure cannot tell
            // you whether an account is holding contracts or sitting in cash,
            // and those are different financial situations.
            if let cash = vm.cashUsd, let positions = vm.positionsUsd {
                splitRow(label: "Cash", value: cash)
                splitRow(label: "Positions", value: positions)
            }

            openContracts

            HStack {
                Button("Sync") { Task { await vm.sync() } }
                    .font(.caption)
                    .buttonStyle(.bordered)
                Spacer()
                Button("Disconnect", role: .destructive) { Task { await vm.disconnect() } }
                    .font(.caption)
            }
            .padding(.top, 4)
        }
        .task { await vm.loadPositions() }
    }

    private func splitRow(label: String, value: Double) -> some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundStyle(CoinyTheme.ink2)
            Spacer()
            Text(value, format: .currency(code: "USD"))
                .font(.caption.monospacedDigit())
        }
        .padding(.top, 4)
    }

    @ViewBuilder
    private var openContracts: some View {
        if vm.isLoadingPositions {
            ProgressView()
                .frame(maxWidth: .infinity)
                .padding(.vertical, 4)
                .accessibilityLabel("Loading positions")
        } else if vm.hasLoadedPositions && vm.markets.isEmpty {
            HStack {
                Text("No open contracts")
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.ink2)
                Spacer()
            }
            .padding(.top, 4)
        } else {
            ForEach(vm.markets) { market in
                CoinyHairline().padding(.vertical, 6)
                marketRow(market)
            }
        }
    }

    private func marketRow(_ market: KalshiMarketPosition) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(market.ticker)
                    .font(.subheadline)
                    .lineLimit(1)
                // A negative position is NO contracts, not a negative holding.
                // Rendering "-40 contracts" would read as a debt.
                Text(Self.contractsLabel(market.contracts))
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.ink2)
            }
            Spacer()
            Text(market.exposureUsd, format: .currency(code: "USD"))
                .font(.subheadline.monospacedDigit())
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            "\(market.ticker), \(Self.contractsLabel(market.contracts)), "
                + "worth \(market.exposureUsd.formatted(.currency(code: "USD")))"
        )
    }

    static func contractsLabel(_ contracts: Double) -> String {
        let side = contracts < 0 ? "NO" : "YES"
        let count = abs(contracts).formatted(.number.precision(.fractionLength(0...2)))
        return "\(count) \(side)"
    }

    private var setupSheet: some View {
        NavigationStack {
            Form {
                Section {
                    if let pem = generatedPair?.publicKeyPem {
                        Text(pem)
                            .font(.system(.caption2, design: .monospaced))
                            .textSelection(.enabled)
                    } else {
                        CoinyErrorLine(message: "Key generation failed")
                    }
                } header: {
                    Text("Step 1 — Your Public Key")
                } footer: {
                    // The scope instruction, which this screen walked straight
                    // past (runbook G2.12, audit 2.6.7). `privacy-policy.md`
                    // already tells the user we instruct them to create
                    // read-only keys for Kraken, Kalshi and Alpaca; Kraken said
                    // it and this screen did not, which made that sentence
                    // false for one of the two vendors whose keys can place
                    // trades.
                    Text(
                        "Copy this key, open Kalshi → Settings → API Keys → Add Key, paste it, " +
                        "and copy the Key ID you receive back. Give the key **read-only** " +
                        "access: Coiny reads your portfolio and never places trades."
                    )
                    .font(.caption2)
                }
                Section {
                    TextField("Key ID", text: $keyId)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                } header: {
                    Text("Step 2 — Key ID from Kalshi")
                } footer: {
                    // Says what actually happens, checked against the code
                    // rather than assumed: the private half IS sent to Coiny
                    // (KalshiViewModel.connect -> POST /api/kalshi/connect) and
                    // stored AES-256-GCM encrypted (api/kalshi-connect.ts calls
                    // encryptString). An earlier draft of this line claimed the
                    // key never leaves the device, which would have been a
                    // reassuring sentence that was not true.
                    Text("Coiny stores the matching private key encrypted, and uses it only to read your portfolio.")
                        .font(.caption2)
                }
            }
            .navigationTitle("Connect Kalshi")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showingSetup = false
                        keyId = ""
                        generatedPair = nil
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Connect") {
                        guard let pair = generatedPair else { return }
                        let k = keyId; let p = pair.privateKeyBase64
                        showingSetup = false
                        keyId = ""
                        generatedPair = nil
                        Task { await vm.connect(keyId: k, privateKeyBase64: p) }
                    }
                    .disabled(keyId.isEmpty || generatedPair == nil)
                }
            }
        }
        .presentationDetents([.medium])
    }
}
