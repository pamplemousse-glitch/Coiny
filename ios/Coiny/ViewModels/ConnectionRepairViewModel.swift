import Foundation
import LinkKit
import Observation

/// The narrow API surface the repair flow needs, injectable for tests.
protocol ConnectionRepairAPI: Sendable {
    func getPlaidItems() async throws -> [PlaidItemHealth]
    func createUpdateLinkToken(itemId: String) async throws -> String
    func markItemRepaired(itemId: String) async throws -> EmptyResponse
}

extension API: ConnectionRepairAPI {}

/// Connection repair, end to end (PRD R-8.6, R-8.7): reads item health from
/// `GET /api/plaid/items`, opens Plaid Link in genuine UPDATE MODE with the
/// token from `POST /api/plaid/update-link-token`, and reports success to
/// `POST /api/plaid/item-repaired`. The existing access token and history
/// survive; no public-token exchange happens, and there is no fresh-Link
/// fallback on the happy path.
@Observable
@MainActor
final class ConnectionRepairViewModel {
    /// Where the repair was launched from, mapped to the `link_opened` source
    /// enum in the section 24 catalog.
    enum Source: String {
        case prompt
        case settings
    }

    private(set) var items: [PlaidItemHealth] = []
    private(set) var isRepairing = false
    private(set) var errorMessage: String?
    var isPresentingLink = false
    private(set) var handler: Handler?
    /// Called after a confirmed repair so the owner can reload the numbers.
    var onRepaired: (() -> Void)?

    private let api: any ConnectionRepairAPI
    private let telemetry: TelemetryClient
    /// Seam for tests: opening real LinkKit UI is not unit-testable, so tests
    /// swap this for a stub that reports success or exit synchronously.
    var openLink: (String, @escaping (Bool) -> Void) -> Void

    init(api: any ConnectionRepairAPI = API.shared, telemetry: TelemetryClient = .shared) {
        self.api = api
        self.telemetry = telemetry
        openLink = { _, _ in }
        openLink = { [weak self] token, completion in
            self?.openLinkKit(token: token, completion: completion)
        }
    }

    /// Items needing repair. `disabled` items are excluded server-side via
    /// `repairable`.
    var repairableItems: [PlaidItemHealth] { items.filter(\.repairable) }

    /// Drives the proactive banner (R-8.7): any item whose credentials lapsed
    /// or whose connection errored, surfaced without waiting for the user to
    /// notice a stale number.
    var needsRepair: Bool { !repairableItems.isEmpty }

    func loadItems() async {
        do {
            items = try await api.getPlaidItems()
        } catch {
            // Item health is a garnish on screens that render without it;
            // a load failure means no banner, never a blocked screen.
        }
    }

    /// Two taps from the broken state: this is tap one (Reconnect), Link's own
    /// confirmation is tap two.
    func repairFirstBrokenItem(source: Source) async {
        guard let item = repairableItems.first else { return }
        await repair(item: item, source: source)
    }

    func repair(item: PlaidItemHealth, source: Source) async {
        guard !isRepairing else { return }
        isRepairing = true
        errorMessage = nil
        defer { isRepairing = false }

        await telemetry.emit("link_opened", [
            "provider": .string("plaid"),
            "source": .string(source.rawValue),
        ])

        do {
            let token = try await api.createUpdateLinkToken(itemId: item.itemId)
            openLink(token) { [weak self] success in
                Task { @MainActor in
                    await self?.finishLinkSession(item: item, success: success)
                }
            }
        } catch {
            errorMessage = "Could not start the repair. Try again."
            await telemetry.emit("link_result", [
                "provider": .string("plaid"),
                "status": .string("error"),
            ])
        }
    }

    private func finishLinkSession(item: PlaidItemHealth, success: Bool) async {
        isPresentingLink = false
        guard success else {
            await telemetry.emit("link_result", [
                "provider": .string("plaid"),
                "status": .string("abandoned"),
            ])
            return
        }
        do {
            _ = try await api.markItemRepaired(itemId: item.itemId)
            await telemetry.emit("link_result", [
                "provider": .string("plaid"),
                "status": .string("success"),
            ])
            await loadItems()
            onRepaired?()
        } catch {
            // The bank side is fixed; only our bookkeeping call failed. The
            // LOGIN_REPAIRED webhook heals the row server-side eventually, so
            // tell the truth without undoing the user's work.
            errorMessage = "Repair finished but did not confirm. It will settle shortly."
            await telemetry.emit("link_result", [
                "provider": .string("plaid"),
                "status": .string("error"),
            ])
        }
    }

    /// Real LinkKit presentation (update mode). Mirrors ConnectAccountFlow's
    /// hosting pattern; the success callback carries a public token that
    /// update mode never exchanges.
    private func openLinkKit(token: String, completion: @escaping (Bool) -> Void) {
        var config = LinkTokenConfiguration(token: token) { _ in
            completion(true)
        }
        config.onExit = { _ in
            completion(false)
        }
        switch Plaid.create(config) {
        case .success(let handler):
            self.handler = handler
            isPresentingLink = true
        case .failure:
            errorMessage = "Could not start the repair. Try again."
        }
    }
}
