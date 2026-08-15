import SwiftUI

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
                CoinyErrorLine(message: error)
            }
        }
    }

    private var disconnectedView: some View {
        HStack {
            Text("Connect UK/EU bank account").font(.caption).foregroundStyle(CoinyTheme.ink2)
            Spacer()
            Text("Via TrueLayer").font(.caption2).foregroundStyle(CoinyTheme.ink2)
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
                CoinyErrorLine(message: error)
            }
        }
        .sheet(isPresented: $showingAdd) { addSheet }
    }

    private var emptyView: some View {
        HStack {
            Text("No cards added").font(.caption).foregroundStyle(CoinyTheme.ink2)
            Spacer()
            Button { showingAdd = true } label: { Label("Add", systemImage: "plus.circle").font(.caption) }
        }
        .padding(.top, 4)
    }

    private var holdingsList: some View {
        VStack(spacing: 0) {
            ForEach(vm.holdings) { holding in
                CoinyHairline().padding(.vertical, 8)
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(holding.label ?? holding.cardName).font(.subheadline).lineLimit(1)
                        HStack(spacing: 4) {
                            if let set = holding.setName { Text(set).font(.caption).foregroundStyle(CoinyTheme.ink2) }
                            if let v = holding.variant { Text(v).font(.caption).foregroundStyle(CoinyTheme.ink2) }
                            if holding.quantity > 1 { Text("×\(holding.quantity)").font(.caption).foregroundStyle(CoinyTheme.ink2) }
                        }
                    }
                    Spacer()
                    if let value = holding.valueUsd {
                        Text(value, format: .currency(code: "USD")).font(.subheadline.monospacedDigit())
                    } else {
                        Text("—").font(.subheadline).foregroundStyle(CoinyTheme.ink2)
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
                    if let n = vm.lastSynced {
                        Label("Synced \(n)", systemImage: "checkmark.circle").font(.caption)
                    } else {
                        Label("Sync", systemImage: "arrow.clockwise").font(.caption)
                    }
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
                CoinyErrorLine(message: error)
            }
        }
        .sheet(isPresented: $showingAdd) { addSheet }
    }

    private var emptyView: some View {
        HStack {
            Text("No energy positions added").font(.caption).foregroundStyle(CoinyTheme.ink2)
            Spacer()
            Button { showingAdd = true } label: { Label("Add", systemImage: "plus.circle").font(.caption) }
        }
        .padding(.top, 4)
    }

    private var positionsList: some View {
        VStack(spacing: 0) {
            ForEach(vm.positions) { pos in
                CoinyHairline().padding(.vertical, 8)
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(pos.label ?? commodityName(pos.commodity)).font(.subheadline).lineLimit(1)
                        Text("\(pos.quantity, specifier: "%.2f") \(pos.quantityUnit)").font(.caption).foregroundStyle(CoinyTheme.ink2)
                    }
                    Spacer()
                    if let value = pos.valueUsd {
                        Text(value, format: .currency(code: "USD")).font(.subheadline.monospacedDigit())
                    } else {
                        Text("—").font(.subheadline).foregroundStyle(CoinyTheme.ink2)
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
                    if let n = vm.lastUpdated {
                        Label("Synced \(n)", systemImage: "checkmark.circle").font(.caption)
                    } else {
                        Label("Sync", systemImage: "arrow.clockwise").font(.caption)
                    }
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
                CoinyErrorLine(message: error)
            }
        }
        .sheet(isPresented: $showingAdd) { addSheet }
    }

    private var emptyView: some View {
        HStack {
            Text("No farmland parcels added").font(.caption).foregroundStyle(CoinyTheme.ink2)
            Spacer()
            Button { showingAdd = true } label: { Label("Add", systemImage: "plus.circle").font(.caption) }
        }
        .padding(.top, 4)
    }

    private var parcelsList: some View {
        VStack(spacing: 0) {
            ForEach(vm.parcels) { parcel in
                CoinyHairline().padding(.vertical, 8)
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(parcel.label ?? String(format: "%.1f ac, %@", parcel.acres, parcel.stateCode))
                            .font(.subheadline).lineLimit(1)
                        Text("\(parcel.acres, specifier: "%.1f") acres in \(parcel.stateCode)")
                            .font(.caption).foregroundStyle(CoinyTheme.ink2)
                    }
                    Spacer()
                    if let value = parcel.valueUsd {
                        Text(value, format: .currency(code: "USD")).font(.subheadline.monospacedDigit())
                    } else {
                        Text("—").font(.subheadline).foregroundStyle(CoinyTheme.ink2)
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
                    if let n = vm.lastUpdated {
                        Label("Synced \(n)", systemImage: "checkmark.circle").font(.caption)
                    } else {
                        Label("Sync", systemImage: "arrow.clockwise").font(.caption)
                    }
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
