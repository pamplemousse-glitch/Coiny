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
                Text(error).font(.caption).foregroundStyle(.red).padding(.top, 4)
            }
        }
    }

    private var disconnectedView: some View {
        HStack {
            Text("Link Kraken via SnapTrade")
                .font(.caption)
                .foregroundStyle(.secondary)
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

// MARK: - SnapTrade inline

struct SnapTradeInlineView: View {
    let vm: SnapTradeViewModel
    let isConnected: Bool
    @Environment(\.openURL) private var openURL

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
                Text(error).font(.caption).foregroundStyle(.red).padding(.top, 4)
            }
        }
        .onChange(of: vm.redirectUrl) { _, url in
            guard let url, let u = URL(string: url) else { return }
            openURL(u)
        }
    }

    private var disconnectedView: some View {
        HStack {
            Text("Link your brokerages")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Button("Connect") { Task { await vm.connect() } }
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
                Text(error).font(.caption).foregroundStyle(.red).padding(.top, 4)
            }
        }
    }

    private var disconnectedView: some View {
        HStack {
            Text("Connect YNAB budgeting")
                .font(.caption)
                .foregroundStyle(.secondary)
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
                Text(error).font(.caption).foregroundStyle(.red).padding(.top, 4)
            }
        }
        .sheet(isPresented: $showingSetup) { setupSheet }
    }

    private var disconnectedView: some View {
        HStack {
            Text("Connect Kalshi prediction markets")
                .font(.caption)
                .foregroundStyle(.secondary)
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

    private var setupSheet: some View {
        NavigationStack {
            Form {
                Section {
                    if let pem = generatedPair?.publicKeyPem {
                        Text(pem)
                            .font(.system(.caption2, design: .monospaced))
                            .textSelection(.enabled)
                    } else {
                        Text("Key generation failed").font(.caption).foregroundStyle(.red)
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
                Text(error).font(.caption).foregroundStyle(.red).padding(.top, 4)
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
                .foregroundStyle(.secondary)
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
                .foregroundStyle(.secondary)
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
                        .foregroundStyle(.secondary)
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
                Text(error).font(.caption).foregroundStyle(.red).padding(.top, 4)
            }
        }
    }

    private var emptyView: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Add your Polygon wallet address to track Polymarket positions.")
                .font(.caption)
                .foregroundStyle(.secondary)
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
                            .foregroundStyle(.secondary)
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
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.vertical, 2)
            }
            Divider().padding(.vertical, 4)
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
            .font(.caption)
            .buttonStyle(.borderedProminent)
            .disabled(newAddress.isEmpty)
        }
        .padding(.top, 4)
    }
}

// MARK: - TrueLayer inline

struct TruelayerInlineView: View {
    let vm: TruelayerViewModel

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView().frame(maxWidth: .infinity).padding(.vertical, 8)
            } else if vm.isConnected {
                connectedView
            } else {
                disconnectedView
            }
            if let error = vm.errorMessage {
                Text(error).font(.caption).foregroundStyle(.red).padding(.top, 4)
            }
        }
    }

    private var disconnectedView: some View {
        HStack {
            Text("Connect UK/EU bank account").font(.caption).foregroundStyle(.secondary)
            Spacer()
            Text("Via TrueLayer").font(.caption2).foregroundStyle(.tertiary)
        }
        .padding(.top, 4)
    }

    private var connectedView: some View {
        HStack {
            Button("Sync") { Task { await vm.sync() } }.font(.caption).buttonStyle(.bordered)
            Spacer()
            Button("Disconnect", role: .destructive) { Task { await vm.disconnect() } }.font(.caption)
        }
        .padding(.top, 4)
    }
}

// MARK: - Pokemon Cards inline

struct PokemonCardsInlineView: View {
    let vm: PokemonCardsViewModel
    @State private var showingAdd = false
    @State private var newCardName = ""
    @State private var newSetName = ""
    @State private var newVariant = ""
    @State private var newQuantity = "1"

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView().frame(maxWidth: .infinity).padding(.vertical, 8)
            } else if vm.holdings.isEmpty {
                emptyView
            } else {
                holdingsList
            }
            if let error = vm.errorMessage {
                Text(error).font(.caption).foregroundStyle(.red).padding(.top, 4)
            }
        }
        .sheet(isPresented: $showingAdd) { addSheet }
    }

    private var emptyView: some View {
        HStack {
            Text("No cards added").font(.caption).foregroundStyle(.secondary)
            Spacer()
            Button { showingAdd = true } label: { Label("Add", systemImage: "plus.circle").font(.caption) }
        }
        .padding(.top, 4)
    }

    private var holdingsList: some View {
        VStack(spacing: 0) {
            ForEach(vm.holdings) { holding in
                Divider().padding(.vertical, 6)
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(holding.label ?? holding.cardName).font(.subheadline).lineLimit(1)
                        HStack(spacing: 4) {
                            if let set = holding.setName { Text(set).font(.caption).foregroundStyle(.secondary) }
                            if let v = holding.variant { Text(v).font(.caption).foregroundStyle(.secondary) }
                            if holding.quantity > 1 { Text("×\(holding.quantity)").font(.caption).foregroundStyle(.secondary) }
                        }
                    }
                    Spacer()
                    if let value = holding.valueUsd {
                        Text(value, format: .currency(code: "USD")).font(.subheadline.monospacedDigit())
                    } else {
                        Text("—").font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                .swipeActions {
                    Button(role: .destructive) { Task { await vm.removeHolding(holding) } } label: { Label("Remove", systemImage: "trash") }
                }
            }
            HStack {
                Button { showingAdd = true } label: { Label("Add", systemImage: "plus.circle").font(.caption) }
                Spacer()
                Button { Task { await vm.sync() } } label: {
                    if let n = vm.lastSynced { Label("Synced \(n)", systemImage: "checkmark.circle").font(.caption) }
                    else { Label("Sync", systemImage: "arrow.clockwise").font(.caption) }
                }
            }
            .padding(.top, 6)
        }
    }

    private var addSheet: some View {
        NavigationStack {
            Form {
                Section("Card Name") { TextField("e.g. Charizard", text: $newCardName) }
                Section("Set (optional)") { TextField("e.g. Base Set", text: $newSetName) }
                Section("Variant (optional)") { TextField("e.g. Holofoil", text: $newVariant) }
                Section("Quantity") { TextField("1", text: $newQuantity).keyboardType(.numberPad) }
            }
            .navigationTitle("Add Pokemon Card")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { showingAdd = false; resetForm() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let cn = newCardName
                        let sn = newSetName.isEmpty ? nil : newSetName
                        let vr = newVariant.isEmpty ? nil : newVariant
                        let qty = Int(newQuantity) ?? 1
                        showingAdd = false; resetForm()
                        Task { await vm.addHolding(cardName: cn, setName: sn, variant: vr, quantity: qty, label: nil) }
                    }
                    .disabled(newCardName.isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func resetForm() { newCardName = ""; newSetName = ""; newVariant = ""; newQuantity = "1" }
}

// MARK: - Energy Positions inline

struct EnergyInlineView: View {
    let vm: EnergyViewModel
    @State private var showingAdd = false
    @State private var newCommodity = "wti_crude"
    @State private var newQuantity = ""
    @State private var newLabel = ""

    private let commodities = [("wti_crude", "WTI Crude Oil"), ("brent", "Brent Crude"), ("natural_gas", "Natural Gas")]

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView().frame(maxWidth: .infinity).padding(.vertical, 8)
            } else if vm.positions.isEmpty {
                emptyView
            } else {
                positionsList
            }
            if let error = vm.errorMessage {
                Text(error).font(.caption).foregroundStyle(.red).padding(.top, 4)
            }
        }
        .sheet(isPresented: $showingAdd) { addSheet }
    }

    private var emptyView: some View {
        HStack {
            Text("No energy positions added").font(.caption).foregroundStyle(.secondary)
            Spacer()
            Button { showingAdd = true } label: { Label("Add", systemImage: "plus.circle").font(.caption) }
        }
        .padding(.top, 4)
    }

    private var positionsList: some View {
        VStack(spacing: 0) {
            ForEach(vm.positions) { pos in
                Divider().padding(.vertical, 6)
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(pos.label ?? commodityName(pos.commodity)).font(.subheadline).lineLimit(1)
                        Text("\(pos.quantity, specifier: "%.2f") \(pos.quantityUnit)").font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    if let value = pos.valueUsd {
                        Text(value, format: .currency(code: "USD")).font(.subheadline.monospacedDigit())
                    } else {
                        Text("—").font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                .swipeActions {
                    Button(role: .destructive) { Task { await vm.removePosition(pos) } } label: { Label("Remove", systemImage: "trash") }
                }
            }
            HStack {
                Button { showingAdd = true } label: { Label("Add", systemImage: "plus.circle").font(.caption) }
                Spacer()
                Button { Task { await vm.sync() } } label: {
                    if let n = vm.lastUpdated { Label("Synced \(n)", systemImage: "checkmark.circle").font(.caption) }
                    else { Label("Sync", systemImage: "arrow.clockwise").font(.caption) }
                }
            }
            .padding(.top, 6)
        }
    }

    private var addSheet: some View {
        NavigationStack {
            Form {
                Section("Commodity") {
                    Picker("Commodity", selection: $newCommodity) {
                        ForEach(commodities, id: \.0) { Text($1).tag($0) }
                    }
                }
                Section("Quantity") { TextField("e.g. 100", text: $newQuantity).keyboardType(.decimalPad) }
                Section("Label (optional)") { TextField("e.g. Futures position", text: $newLabel) }
            }
            .navigationTitle("Add Energy Position")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { showingAdd = false; resetForm() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let c = newCommodity; let q = Double(newQuantity) ?? 0; let l = newLabel.isEmpty ? nil : newLabel
                        showingAdd = false; resetForm()
                        Task { await vm.addPosition(commodity: c, quantity: q, label: l) }
                    }
                    .disabled(Double(newQuantity) == nil || (Double(newQuantity) ?? 0) <= 0)
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func commodityName(_ key: String) -> String {
        commodities.first { $0.0 == key }?.1 ?? key
    }
    private func resetForm() { newCommodity = "wti_crude"; newQuantity = ""; newLabel = "" }
}

// MARK: - Farmland Parcels inline

struct FarmlandInlineView: View {
    let vm: FarmlandViewModel
    @State private var showingAdd = false
    @State private var newState = ""
    @State private var newAcres = ""
    @State private var newLabel = ""

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView().frame(maxWidth: .infinity).padding(.vertical, 8)
            } else if vm.parcels.isEmpty {
                emptyView
            } else {
                parcelsList
            }
            if let error = vm.errorMessage {
                Text(error).font(.caption).foregroundStyle(.red).padding(.top, 4)
            }
        }
        .sheet(isPresented: $showingAdd) { addSheet }
    }

    private var emptyView: some View {
        HStack {
            Text("No farmland parcels added").font(.caption).foregroundStyle(.secondary)
            Spacer()
            Button { showingAdd = true } label: { Label("Add", systemImage: "plus.circle").font(.caption) }
        }
        .padding(.top, 4)
    }

    private var parcelsList: some View {
        VStack(spacing: 0) {
            ForEach(vm.parcels) { parcel in
                Divider().padding(.vertical, 6)
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(parcel.label ?? String(format: "%.1f ac, %@", parcel.acres, parcel.stateCode))
                            .font(.subheadline).lineLimit(1)
                        Text("\(parcel.acres, specifier: "%.1f") acres in \(parcel.stateCode)")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    if let value = parcel.valueUsd {
                        Text(value, format: .currency(code: "USD")).font(.subheadline.monospacedDigit())
                    } else {
                        Text("—").font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                .swipeActions {
                    Button(role: .destructive) { Task { await vm.removeParcel(parcel) } } label: { Label("Remove", systemImage: "trash") }
                }
            }
            HStack {
                Button { showingAdd = true } label: { Label("Add", systemImage: "plus.circle").font(.caption) }
                Spacer()
                Button { Task { await vm.sync() } } label: {
                    if let n = vm.lastUpdated { Label("Synced \(n)", systemImage: "checkmark.circle").font(.caption) }
                    else { Label("Sync", systemImage: "arrow.clockwise").font(.caption) }
                }
            }
            .padding(.top, 6)
        }
    }

    private var addSheet: some View {
        NavigationStack {
            Form {
                Section("State (2-letter code)") {
                    TextField("e.g. IA", text: $newState).autocorrectionDisabled().textInputAutocapitalization(.characters)
                }
                Section("Acres") { TextField("e.g. 50", text: $newAcres).keyboardType(.decimalPad) }
                Section("Label (optional)") { TextField("e.g. Iowa parcel", text: $newLabel) }
            }
            .navigationTitle("Add Farmland")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { showingAdd = false; resetForm() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let s = newState; let a = Double(newAcres) ?? 0; let l = newLabel.isEmpty ? nil : newLabel
                        showingAdd = false; resetForm()
                        Task { await vm.addParcel(stateCode: s, acres: a, label: l) }
                    }
                    .disabled(newState.count != 2 || (Double(newAcres) ?? 0) <= 0)
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func resetForm() { newState = ""; newAcres = ""; newLabel = "" }
}

// MARK: - Trading Cards inline

struct TradingCardsInlineView: View {
    let vm: TradingCardsViewModel
    @State private var showingAdd = false
    @State private var newGame = ""
    @State private var newCardName = ""
    @State private var newSetName = ""
    @State private var newIsFoil = false
    @State private var newQuantity = "1"

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView().frame(maxWidth: .infinity).padding(.vertical, 8)
            } else if vm.holdings.isEmpty {
                emptyView
            } else {
                holdingsList
            }
            if let error = vm.errorMessage {
                Text(error).font(.caption).foregroundStyle(.red).padding(.top, 4)
            }
        }
        .sheet(isPresented: $showingAdd) { addSheet }
    }

    private var emptyView: some View {
        HStack {
            Text("No trading cards added").font(.caption).foregroundStyle(.secondary)
            Spacer()
            Button { showingAdd = true } label: { Label("Add", systemImage: "plus.circle").font(.caption) }
        }
        .padding(.top, 4)
    }

    private var holdingsList: some View {
        VStack(spacing: 0) {
            ForEach(vm.holdings) { holding in
                Divider().padding(.vertical, 6)
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(holding.label ?? holding.cardName).font(.subheadline).lineLimit(1)
                        HStack(spacing: 4) {
                            Text(holding.game.capitalized).font(.caption).foregroundStyle(.secondary)
                            if let set = holding.setName { Text(set).font(.caption).foregroundStyle(.secondary) }
                            if holding.quantity > 1 { Text("×\(holding.quantity)").font(.caption).foregroundStyle(.secondary) }
                        }
                    }
                    Spacer()
                    if let value = holding.valueUsd {
                        Text(value, format: .currency(code: "USD")).font(.subheadline.monospacedDigit())
                    } else {
                        Text("—").font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                .swipeActions {
                    Button(role: .destructive) { Task { await vm.removeHolding(holding) } } label: { Label("Remove", systemImage: "trash") }
                }
            }
            HStack {
                Button { showingAdd = true } label: { Label("Add", systemImage: "plus.circle").font(.caption) }
                Spacer()
                Button { Task { await vm.sync() } } label: {
                    if let n = vm.lastUpdated { Label("Synced \(n)", systemImage: "checkmark.circle").font(.caption) }
                    else { Label("Sync", systemImage: "arrow.clockwise").font(.caption) }
                }
            }
            .padding(.top, 6)
        }
    }

    private var addSheet: some View {
        NavigationStack {
            Form {
                Section("Game") { TextField("e.g. magic, yugioh, sports", text: $newGame).autocorrectionDisabled() }
                Section("Card Name") { TextField("e.g. Black Lotus", text: $newCardName) }
                Section("Set (optional)") { TextField("e.g. Alpha", text: $newSetName) }
                Section("Quantity") { TextField("1", text: $newQuantity).keyboardType(.numberPad) }
                Section { Toggle("Foil", isOn: $newIsFoil) }
            }
            .navigationTitle("Add Trading Card")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { showingAdd = false; resetForm() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let g = newGame; let cn = newCardName
                        let sn = newSetName.isEmpty ? nil : newSetName
                        let qty = Int(newQuantity) ?? 1
                        showingAdd = false; resetForm()
                        Task { await vm.addHolding(game: g, cardName: cn, setName: sn, isFoil: newIsFoil, quantity: qty, label: nil) }
                    }
                    .disabled(newGame.isEmpty || newCardName.isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func resetForm() { newGame = ""; newCardName = ""; newSetName = ""; newIsFoil = false; newQuantity = "1" }
}

// MARK: - Graded Coins inline

struct CoinsInlineView: View {
    let vm: CoinsViewModel
    @State private var showingAdd = false
    @State private var newPcgsNumber = ""
    @State private var newGrade = ""
    @State private var newLabel = ""
    @State private var newQuantity = "1"

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView().frame(maxWidth: .infinity).padding(.vertical, 8)
            } else if vm.holdings.isEmpty {
                emptyView
            } else {
                holdingsList
            }
            if let error = vm.errorMessage {
                Text(error).font(.caption).foregroundStyle(.red).padding(.top, 4)
            }
        }
        .sheet(isPresented: $showingAdd) { addSheet }
    }

    private var emptyView: some View {
        HStack {
            Text("No graded coins added").font(.caption).foregroundStyle(.secondary)
            Spacer()
            Button { showingAdd = true } label: { Label("Add", systemImage: "plus.circle").font(.caption) }
        }
        .padding(.top, 4)
    }

    private var holdingsList: some View {
        VStack(spacing: 0) {
            ForEach(vm.holdings) { holding in
                Divider().padding(.vertical, 6)
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(holding.label ?? (holding.coinName ?? "PCGS \(holding.pcgsNo)")).font(.subheadline).lineLimit(1)
                        HStack(spacing: 4) {
                            Text("MS-\(holding.gradeNo)\(holding.plusGrade ? "+" : "")").font(.caption).foregroundStyle(.secondary)
                            if holding.quantity > 1 { Text("×\(holding.quantity)").font(.caption).foregroundStyle(.secondary) }
                        }
                    }
                    Spacer()
                    if let value = holding.valueUsd {
                        Text(value, format: .currency(code: "USD")).font(.subheadline.monospacedDigit())
                    } else {
                        Text("—").font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                .swipeActions {
                    Button(role: .destructive) { Task { await vm.removeHolding(holding) } } label: { Label("Remove", systemImage: "trash") }
                }
            }
            HStack {
                Button { showingAdd = true } label: { Label("Add", systemImage: "plus.circle").font(.caption) }
                Spacer()
                Button { Task { await vm.sync() } } label: {
                    if let n = vm.lastUpdated { Label("Synced \(n)", systemImage: "checkmark.circle").font(.caption) }
                    else { Label("Sync", systemImage: "arrow.clockwise").font(.caption) }
                }
            }
            .padding(.top, 6)
        }
    }

    private var addSheet: some View {
        NavigationStack {
            Form {
                Section("PCGS Number") { TextField("e.g. 3870", text: $newPcgsNumber).keyboardType(.numberPad) }
                Section("Grade (MS number, e.g. 65)") { TextField("e.g. 65", text: $newGrade).keyboardType(.numberPad) }
                Section("Label (optional)") { TextField("e.g. 1881-S Morgan Dollar", text: $newLabel) }
                Section("Quantity") { TextField("1", text: $newQuantity).keyboardType(.numberPad) }
            }
            .navigationTitle("Add Graded Coin")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { showingAdd = false; resetForm() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let pn = Int(newPcgsNumber) ?? 0
                        let gr = Int(newGrade) ?? 0
                        let lbl = newLabel.isEmpty ? nil : newLabel
                        let qty = Int(newQuantity) ?? 1
                        showingAdd = false; resetForm()
                        Task { await vm.addHolding(pcgsNo: pn, gradeNo: gr, plusGrade: false, label: lbl, quantity: qty) }
                    }
                    .disabled(Int(newPcgsNumber) == nil || Int(newGrade) == nil)
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func resetForm() { newPcgsNumber = ""; newGrade = ""; newLabel = ""; newQuantity = "1" }
}

// MARK: - RSA key generation for Kalshi

enum KalshiKeyGen {
    struct KeyPair {
        let publicKeyPem: String
        let privateKeyBase64: String
    }

    static func generate() -> KeyPair? {
        let attrs: [CFString: Any] = [
            kSecAttrKeyType: kSecAttrKeyTypeRSA,
            kSecAttrKeySizeInBits: 2048,
        ]
        var genError: Unmanaged<CFError>?
        guard let privKey = SecKeyCreateRandomKey(attrs as CFDictionary, &genError),
              let pubKey = SecKeyCopyPublicKey(privKey) else { return nil }

        var exportError: Unmanaged<CFError>?
        guard let privDer = SecKeyCopyExternalRepresentation(privKey, &exportError) as Data?,
              let pubDer = SecKeyCopyExternalRepresentation(pubKey, &exportError) as Data? else { return nil }

        // Private key: PKCS#1 DER → PEM → base64-encode the PEM string (backend decodes via Buffer.from(b64,'base64').toString())
        let privPem = wrapPem("RSA PRIVATE KEY", privDer)
        let privateKeyBase64 = Data(privPem.utf8).base64EncodedString()

        // Public key: PKCS#1 DER → SPKI DER → PEM (user pastes into Kalshi dashboard)
        let publicKeyPem = wrapPem("PUBLIC KEY", pkcs1ToSpki(pubDer))

        return KeyPair(publicKeyPem: publicKeyPem, privateKeyBase64: privateKeyBase64)
    }

    private static func wrapPem(_ label: String, _ der: Data) -> String {
        let b64 = der.base64EncodedString(options: .lineLength64Characters)
        return "-----BEGIN \(label)-----\n\(b64)\n-----END \(label)-----"
    }

    // Wrap PKCS#1 RSA public key DER in SubjectPublicKeyInfo (SPKI) envelope.
    private static func pkcs1ToSpki(_ pkcs1: Data) -> Data {
        let oid = Data([0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x01, 0x05, 0x00])
        let algSeq = derSeq(oid)
        let bitStr = derTag(0x03, Data([0x00]) + pkcs1)
        return derSeq(algSeq + bitStr)
    }

    private static func derLen(_ n: Int) -> Data {
        if n < 0x80 { return Data([UInt8(n)]) }
        if n < 0x100 { return Data([0x81, UInt8(n)]) }
        return Data([0x82, UInt8(n >> 8), UInt8(n & 0xFF)])
    }

    private static func derSeq(_ c: Data) -> Data { Data([0x30]) + derLen(c.count) + c }
    private static func derTag(_ t: UInt8, _ c: Data) -> Data { Data([t]) + derLen(c.count) + c }
}
