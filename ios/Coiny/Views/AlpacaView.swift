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
                    Text("Found in your Alpaca dashboard under API Keys.")
                        .font(.caption2)
                }
                Section("API Secret Key") {
                    SecureField("Secret key", text: $apiSecretKey)
                        .autocorrectionDisabled()
                }
                Section("Environment") {
                    Picker("Environment", selection: $selectedEnv) {
                        Text("Paper (simulation)").tag("paper")
                        Text("Live").tag("live")
                    }
                    .pickerStyle(.segmented)
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
