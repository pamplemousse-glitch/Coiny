import SwiftUI

// MARK: - Kraken inline

struct KrakenInlineView: View {
    let vm: KrakenViewModel
    let isConnected: Bool
    @State private var showingConnect = false
    @State private var apiKey = ""
    @State private var privateKey = ""

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
        .sheet(isPresented: $showingConnect) { connectSheet }
    }

    private var disconnectedView: some View {
        HStack {
            Text("Connect Kraken exchange")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Button("Connect") { showingConnect = true }
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

    private var connectSheet: some View {
        NavigationStack {
            Form {
                Section("API Key") {
                    TextField("API Key", text: $apiKey)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                }
                Section("Private Key") {
                    SecureField("Private Key", text: $privateKey)
                }
            }
            .navigationTitle("Connect Kraken")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showingConnect = false
                        apiKey = ""
                        privateKey = ""
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Connect") {
                        let k = apiKey; let p = privateKey
                        showingConnect = false
                        apiKey = ""
                        privateKey = ""
                        Task { await vm.connect(apiKey: k, privateKey: p) }
                    }
                    .disabled(apiKey.isEmpty || privateKey.isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
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
    @State private var showingConnect = false
    @State private var apiKey = ""

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
        .sheet(isPresented: $showingConnect) { connectSheet }
    }

    private var disconnectedView: some View {
        HStack {
            Text("Connect YNAB budgeting")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Button("Connect") { showingConnect = true }
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

    private var connectSheet: some View {
        NavigationStack {
            Form {
                Section {
                    SecureField("Personal access token", text: $apiKey)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                } header: {
                    Text("YNAB API Key")
                } footer: {
                    Text("Find your token at app.ynab.com → Account Settings → Developer Settings")
                        .font(.caption2)
                }
            }
            .navigationTitle("Connect YNAB")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showingConnect = false
                        apiKey = ""
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Connect") {
                        let k = apiKey
                        showingConnect = false
                        apiKey = ""
                        Task { await vm.connect(apiKey: k) }
                    }
                    .disabled(apiKey.isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Kalshi inline

struct KalshiInlineView: View {
    let vm: KalshiViewModel
    let isConnected: Bool
    @State private var showingConnect = false
    @State private var keyId = ""
    @State private var privateKeyBase64 = ""

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
        .sheet(isPresented: $showingConnect) { connectSheet }
    }

    private var disconnectedView: some View {
        HStack {
            Text("Connect Kalshi prediction markets")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Button("Connect") { showingConnect = true }
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

    private var connectSheet: some View {
        NavigationStack {
            Form {
                Section("Key ID") {
                    TextField("Key ID", text: $keyId)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                }
                Section("Private Key (Base64)") {
                    SecureField("Base64-encoded private key", text: $privateKeyBase64)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                }
            }
            .navigationTitle("Connect Kalshi")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showingConnect = false
                        keyId = ""
                        privateKeyBase64 = ""
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Connect") {
                        let k = keyId; let p = privateKeyBase64
                        showingConnect = false
                        keyId = ""
                        privateKeyBase64 = ""
                        Task { await vm.connect(keyId: k, privateKeyBase64: p) }
                    }
                    .disabled(keyId.isEmpty || privateKeyBase64.isEmpty)
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
