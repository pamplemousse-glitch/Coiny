import SwiftUI

struct CoinbaseView: View {
    @Environment(CoinbaseViewModel.self) private var vm

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            connectionRow

            if vm.status?.connected == true {
                syncRow
                if let reacted = vm.lastSyncReacted {
                    Text("\(reacted) reaction\(reacted == 1 ? "" : "s") fired on last sync")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Button("Disconnect Coinbase", role: .destructive) {
                    Task { await vm.disconnect() }
                }
                .buttonStyle(.bordered)
            } else {
                Button {
                    Task { await vm.connectDevKey() }
                } label: {
                    Label("Connect via dev key", systemImage: "link")
                }
                .buttonStyle(.borderedProminent)
            }

            if let error = vm.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
        .disabled(vm.isLoading)
    }

    private var connectionRow: some View {
        HStack {
            Text("Coinbase")
                .font(.headline)
            Spacer()
            if vm.isLoading {
                ProgressView()
            } else if vm.status?.connected == true {
                Label("Connected", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(.green)
                    .font(.subheadline)
            } else {
                Label("Not connected", systemImage: "xmark.circle")
                    .foregroundStyle(.secondary)
                    .font(.subheadline)
            }
        }
    }

    private var syncRow: some View {
        Button {
            Task { await vm.sync() }
        } label: {
            HStack {
                if vm.isSyncing {
                    ProgressView()
                        .controlSize(.small)
                }
                Text("Sync now")
            }
        }
        .buttonStyle(.bordered)
        .disabled(vm.isSyncing)
    }
}

#Preview {
    CoinbaseView()
        .environment(CoinbaseViewModel())
        .padding()
}
