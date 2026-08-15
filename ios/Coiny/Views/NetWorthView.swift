import SwiftUI

/// The Wealth tab (PRD section 7.8): six fixed groups, one stacked composition
/// bar, per-class status per the R-8.4 table, the staleness timestamp always
/// visible, and the "n accounts not included" footnote whenever the server
/// excluded anything from the total. The GET is a cached DB read; pull to
/// refresh is the only thing that costs a vendor call.
struct NetWorthView: View {
    @Environment(NetWorthViewModel.self) private var vm
    @State private var repairVM = ConnectionRepairViewModel()
    @State private var showExcludedList = false

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Wealth")
                .refreshable { await vm.refresh() }
        }
        .task {
            repairVM.onRepaired = { [vm] in Task { await vm.load() } }
            await vm.load()
            await repairVM.loadItems()
        }
        .sheet(isPresented: Binding(
            get: { repairVM.isPresentingLink },
            set: { repairVM.isPresentingLink = $0 }
        )) {
            if let handler = repairVM.handler {
                PlaidLinkPresenter(handler: handler)
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch vm.state {
        case .idle, .loading:
            ProgressView("Loading…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)

        case let .loaded(data):
            loadedContent(data)

        case let .failed(message):
            ContentUnavailableView {
                Label("Couldn't load", systemImage: "exclamationmark.triangle")
            } description: {
                Text(message)
            } actions: {
                Button("Retry") { Task { await vm.load() } }
                    .buttonStyle(.borderedProminent)
            }
        }
    }

    private func loadedContent(_ data: NetWorthResponse) -> some View {
        let sections = WealthPresenter.sections(from: data)
        return ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                banners
                totalHeader(data)
                CompositionBarView(segments: WealthPresenter.compositionSegments(from: sections))
                if sections.isEmpty {
                    emptyState
                }
                ForEach(sections) { section in
                    WealthGroupBoxView(
                        section: section,
                        bankNeedsRepair: repairVM.needsRepair,
                        onRefresh: { Task { await vm.refresh() } },
                        onRepairBank: { Task { await repairVM.repairFirstBrokenItem(source: .prompt) } }
                    )
                }
                manageAccountsLink
                footer(data)
            }
            .padding(.horizontal)
            .padding(.top, 8)
        }
    }

    // MARK: - Banners

    @ViewBuilder
    private var banners: some View {
        if vm.isOffline {
            WealthBannerView(
                text: "Offline. Showing your last numbers.",
                systemImage: "wifi.slash"
            )
        }
        if let message = vm.refreshErrorMessage {
            WealthBannerView(text: message, systemImage: "exclamationmark.circle")
        }
        if repairVM.needsRepair {
            // Proactive repair (R-8.7): surfaced on open, in-app only.
            WealthBannerView(
                text: repairVM.repairPromptText,
                systemImage: "key.horizontal",
                actionTitle: "Reconnect",
                action: { Task { await repairVM.repairFirstBrokenItem(source: .prompt) } }
            )
        }
        if let repairError = repairVM.errorMessage {
            WealthBannerView(text: repairError, systemImage: "exclamationmark.circle")
        }
    }

    // MARK: - Header

    private func totalHeader(_ data: NetWorthResponse) -> some View {
        VStack(spacing: 4) {
            Text("Net Worth")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            // Absolute values are always ink, never coloured (design rule:
            // only deltas are coloured, and status never rides on colour).
            Text(data.total, format: .currency(code: "USD"))
                .font(.system(size: 48, weight: .bold, design: .rounded))
                .foregroundStyle(.primary)
                .accessibilityLabel(Text("Net worth \(data.total, format: .currency(code: "USD"))"))
            if !data.excluded.classes.isEmpty {
                excludedFootnote(data)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }

    /// S-19: "2 accounts not included", tappable, lists them.
    private func excludedFootnote(_ data: NetWorthResponse) -> some View {
        VStack(spacing: 4) {
            Button {
                showExcludedList.toggle()
            } label: {
                Text(excludedFootnoteText(data.excluded.count))
                    .font(.footnote)
                    .underline()
                    .foregroundStyle(.secondary)
                    .frame(minHeight: 44)
            }
            .accessibilityHint("Shows which accounts are not included in the total.")
            if showExcludedList {
                ForEach(WealthPresenter.excludedDisplayNames(data.excluded), id: \.self) { name in
                    Text(name)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private func excludedFootnoteText(_ count: Int) -> String {
        count == 1 ? "1 account not included" : "\(count) accounts not included"
    }

    // MARK: - Empty, manage, footer

    private var emptyState: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Nothing connected yet.")
                .font(.subheadline)
            Text("Connect an account and your wealth shows up here, grouped and honest about its age.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 8)
    }

    private var manageAccountsLink: some View {
        NavigationLink {
            ManageAccountsView()
        } label: {
            Label("Add or manage accounts", systemImage: "plus.circle")
                .font(.subheadline)
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        }
        .accessibilityIdentifier("wealth.manageAccounts")
    }

    /// R-7.28: the staleness timestamp renders at the bottom of Wealth always.
    private func footer(_ data: NetWorthResponse) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(WealthPresenter.generatedLabel(data.generatedAt))
                .font(.caption)
                .foregroundStyle(.secondary)
            if vm.bankRefreshCapped {
                Text("Daily bank refresh limit reached. Other accounts updated.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 12)
        .accessibilityElement(children: .combine)
    }
}

#Preview {
    NetWorthView()
        .environment(NetWorthViewModel())
}
