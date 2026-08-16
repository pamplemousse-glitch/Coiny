import Security
import SwiftUI

// MARK: - Kraken inline

struct KrakenInlineView: View {
    let vm: KrakenViewModel
    let isConnected: Bool
    let onConnect: () -> Void

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
    }

    private var disconnectedView: some View {
        HStack {
            Text("Add read-only Kraken API keys")
                .font(.caption)
                .foregroundStyle(CoinyTheme.ink2)
            Spacer()
            Button("Connect") { onConnect() }
                .font(.caption)
                .buttonStyle(.bordered)
        }
        .padding(.top, 4)
    }

    private var connectedView: some View {
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
}

// MARK: - YNAB inline

struct YnabInlineView: View {
    let vm: YnabViewModel
    let isConnected: Bool

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
    }

    private var disconnectedView: some View {
        HStack {
            Text("Connect YNAB budgeting")
                .font(.caption)
                .foregroundStyle(CoinyTheme.ink2)
            Spacer()
            Button("Connect") { Task { await vm.startOAuth() } }
                .font(.caption)
                .buttonStyle(.bordered)
        }
        .padding(.top, 4)
    }

    private var connectedView: some View {
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
}

// MARK: - Kalshi inline

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
                    Text(
                        "Copy this key, open Kalshi → Settings → API Keys → Add Key, paste it, " +
                        "and copy the Key ID you receive back."
                    )
                    .font(.caption2)
                }
                Section("Step 2 — Key ID from Kalshi") {
                    TextField("Key ID", text: $keyId)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
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

// MARK: - Discogs inline (OAuth OOB)

struct DiscogsInlineView: View {
    let vm: DiscogsViewModel
    @State private var pin = ""
    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else if vm.isConnected {
                connectedView
            } else if vm.authorizeUrl != nil {
                pinEntryView
            } else {
                disconnectedView
            }
            if let error = vm.errorMessage {
                CoinyErrorLine(message: error)
            }
        }
        .onChange(of: vm.authorizeUrl) { _, url in
            guard let url, let u = URL(string: url) else { return }
            openURL(u)
        }
    }

    private var disconnectedView: some View {
        HStack {
            Text("Connect Discogs vinyl collection")
                .font(.caption)
                .foregroundStyle(CoinyTheme.ink2)
            Spacer()
            Button("Connect") { Task { await vm.requestToken() } }
                .font(.caption)
                .buttonStyle(.bordered)
        }
        .padding(.top, 4)
    }

    private var pinEntryView: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Authorize in Discogs, then enter the PIN")
                .font(.caption)
                .foregroundStyle(CoinyTheme.ink2)
            HStack {
                TextField("PIN", text: $pin)
                    .keyboardType(.numberPad)
                    .textFieldStyle(.roundedBorder)
                Button("Verify") {
                    let p = pin
                    pin = ""
                    Task { await vm.verifyPin(p) }
                }
                .buttonStyle(.bordered)
                .disabled(pin.isEmpty)
            }
        }
        .padding(.top, 4)
    }

    private var connectedView: some View {
        VStack(spacing: 6) {
            if let username = vm.username {
                HStack {
                    Label(username, systemImage: "person.fill")
                        .font(.caption)
                        .foregroundStyle(CoinyTheme.ink2)
                    Spacer()
                }
            }
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
    }
}

// MARK: - Polymarket inline

struct PolymarketInlineView: View {
    let vm: PolymarketViewModel
    @State private var newAddress = ""
    @State private var newLabel = ""
    @State private var isAdding = false

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView().frame(maxWidth: .infinity).padding(.vertical, 8)
            } else if vm.accounts.isEmpty {
                emptyView
            } else {
                accountsList
            }
            if let error = vm.errorMessage {
                CoinyErrorLine(message: error)
            }
        }
    }

    private var emptyView: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Add your Polygon wallet address to track Polymarket positions.")
                .font(.caption)
                .foregroundStyle(CoinyTheme.ink2)
            addForm
        }
        .padding(.top, 4)
    }

    private var accountsList: some View {
        VStack(spacing: 4) {
            ForEach(vm.accounts) { account in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(account.label ?? "Polymarket Wallet")
                            .font(.subheadline)
                        Text(String(account.walletAddress.prefix(10)) + "…")
                            .font(.caption2.monospaced())
                            .foregroundStyle(CoinyTheme.ink2)
                    }
                    Spacer()
                    if let value = account.lastValueUsd {
                        Text(value, format: .currency(code: "USD"))
                            .font(.subheadline.monospacedDigit())
                    }
                    Button {
                        Task { await vm.removeAccount(address: account.walletAddress) }
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(CoinyTheme.ink2)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.vertical, 2)
            }
            CoinyHairline().padding(.vertical, 8)
            HStack {
                Button(vm.isSyncing ? "Syncing…" : "Sync") {
                    Task { await vm.sync() }
                }
                .font(.caption)
                .buttonStyle(.bordered)
                .disabled(vm.isSyncing)
                Spacer()
                Button("Add wallet") { isAdding.toggle() }
                    .font(.caption)
            }
            if isAdding {
                addForm
            }
        }
        .padding(.top, 4)
    }

    private var addForm: some View {
        VStack(alignment: .leading, spacing: 6) {
            TextField("Polygon address (0x…)", text: $newAddress)
                .font(.caption.monospaced())
                .textFieldStyle(.roundedBorder)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
            TextField("Label (optional)", text: $newLabel)
                .font(.caption)
                .textFieldStyle(.roundedBorder)
            Button("Add") {
                let addr = newAddress; let lbl = newLabel.isEmpty ? nil : newLabel
                Task {
                    await vm.addAccount(walletAddress: addr, label: lbl)
                    newAddress = ""; newLabel = ""; isAdding = false
                }
            }
            .buttonStyle(.coinyFilledInline)
            .disabled(newAddress.isEmpty)
        }
        .padding(.top, 4)
    }
}

// MARK: - Kraken key entry
//
// Kraken previously had no connect path of its own: the section's Connect button
// called SnapTrade's flow, so the integration could never actually be connected
// from the app. Kraken uses user-supplied API keys rather than an OAuth redirect,
// so it needs its own entry point.
//
// Ask for read-only keys explicitly. A Kraken key with trade or withdrawal
// permission stored server-side is a far larger liability than a balance reader,
// and the user is the only one who can scope it correctly at creation time.
struct KrakenKeyEntryView: View {
    let vm: KrakenViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var apiKey = ""
    @State private var privateKey = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    SecureField("API key", text: $apiKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    SecureField("Private key", text: $privateKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } header: {
                    Text("Kraken API keys")
                } footer: {
                    Text(
                        "Create a key in Kraken with **Query Funds** permission only. "
                            + "Do not enable trading or withdrawal. Coiny reads balances "
                            + "and never places orders."
                    )
                }

                if let error = vm.errorMessage {
                    CoinyErrorLine(message: error)
                }
            }
            .navigationTitle("Connect Kraken")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Connect") {
                        Task {
                            await vm.connect(apiKey: apiKey, privateKey: privateKey)
                            if vm.errorMessage == nil { dismiss() }
                        }
                    }
                    .disabled(apiKey.isEmpty || privateKey.isEmpty || vm.isLoading)
                }
            }
        }
    }
}
