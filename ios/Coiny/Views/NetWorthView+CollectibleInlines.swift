import Security
import SwiftUI

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

        // Private key: PKCS#1 DER -> PEM -> base64-encode the PEM string (backend decodes via Buffer.from(b64,'base64').toString())
        let privPem = wrapPem("RSA PRIVATE KEY", privDer)
        let privateKeyBase64 = Data(privPem.utf8).base64EncodedString()

        // Public key: PKCS#1 DER -> SPKI DER -> PEM (user pastes into Kalshi dashboard)
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
