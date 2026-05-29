import SwiftUI

struct SteamView: View {
    @Environment(SteamViewModel.self) private var vm
    @State private var showingAdd = false
    @State private var newSteamId = ""
    @State private var newLabel = ""

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else if vm.accounts.isEmpty {
                HStack {
                    Text("No Steam accounts added")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Button { showingAdd = true } label: {
                        Label("Add", systemImage: "plus.circle")
                            .font(.caption)
                    }
                }
                .padding(.top, 4)
            } else {
                ForEach(vm.accounts) { account in
                    Divider().padding(.vertical, 6)
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(account.label ?? account.steamId64)
                                .font(.subheadline)
                                .lineLimit(1)
                            if account.label != nil {
                                Text(account.steamId64)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        if let val = account.lastPortfolioUsd {
                            Text(val, format: .currency(code: "USD"))
                                .font(.subheadline.monospacedDigit())
                        } else {
                            Text("—")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .swipeActions {
                        Button(role: .destructive) {
                            Task { await vm.removeAccount(account) }
                        } label: {
                            Label("Remove", systemImage: "trash")
                        }
                    }
                }
                HStack {
                    Button { showingAdd = true } label: {
                        Label("Add", systemImage: "plus.circle")
                            .font(.caption)
                    }
                    Spacer()
                    Button {
                        Task { await vm.sync() }
                    } label: {
                        if let synced = vm.lastSynced {
                            Label("Synced \(synced)", systemImage: "checkmark.circle")
                                .font(.caption)
                        } else {
                            Label("Sync", systemImage: "arrow.clockwise")
                                .font(.caption)
                        }
                    }
                }
                .padding(.top, 6)
            }
            if let error = vm.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.top, 4)
            }
        }
        .sheet(isPresented: $showingAdd) { addSheet }
    }

    private var addSheet: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("76561198XXXXXXXXX", text: $newSteamId)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                } header: {
                    Text("Steam ID64")
                } footer: {
                    Text("17-digit number from your Steam profile URL. Find it at steamid.io.")
                        .font(.caption2)
                }
                Section("Label (optional)") {
                    TextField("e.g. Main Account", text: $newLabel)
                }
            }
            .navigationTitle("Add Steam Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { resetForm(); showingAdd = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let id = newSteamId
                        let lbl = newLabel.isEmpty ? nil : newLabel
                        resetForm()
                        showingAdd = false
                        Task { await vm.addAccount(steamId64: id, label: lbl) }
                    }
                    .disabled(newSteamId.count != 17 || !newSteamId.allSatisfy(\.isNumber))
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func resetForm() {
        newSteamId = ""
        newLabel = ""
    }
}
