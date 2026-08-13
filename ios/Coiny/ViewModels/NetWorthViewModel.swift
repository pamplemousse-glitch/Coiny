import Foundation
import Observation

protocol NetWorthViewModelAPI: Sendable {
    func getNetWorth() async throws -> NetWorthResponse
    func refreshNetWorth() async throws -> NetWorthResponse
}

extension API: NetWorthViewModelAPI {}

@Observable
@MainActor
final class NetWorthViewModel {
    enum LoadState {
        case idle
        case loading
        case loaded(NetWorthResponse)
        case failed(String)
    }

    /// Client-side debounce for the explicit refresh (engineering-budgets
    /// section 2): the GET is a free DB read, but the POST costs vendor calls,
    /// so a second pull inside this window downgrades to a plain GET.
    static let refreshDebounce: TimeInterval = 60

    private(set) var state: LoadState = .idle
    /// True when the screen is showing cached numbers because the network is
    /// unreachable (R-8.9). Renders the S-25 banner.
    private(set) var isOffline = false
    /// Set when the daily billed bank-balance budget was spent; the free
    /// refreshes still ran.
    private(set) var bankRefreshCapped = false
    /// A refresh that failed while cached data is on screen; shown inline so
    /// the failure is visible, never silent.
    private(set) var refreshErrorMessage: String?

    private var lastRefreshStartedAt: Date?
    private let api: any NetWorthViewModelAPI
    private let cache: any NetWorthCaching
    private let now: () -> Date

    init(
        api: any NetWorthViewModelAPI = API.shared,
        cache: any NetWorthCaching = NetWorthCache.shared,
        now: @escaping () -> Date = { Date() }
    ) {
        self.api = api
        self.cache = cache
        self.now = now
    }

    var netWorth: NetWorthResponse? {
        if case let .loaded(data) = state { return data }
        return nil
    }

    /// The instant DB read. Never triggers a vendor call.
    func load() async {
        if case .loading = state { return }
        if netWorth == nil { state = .loading }
        do {
            let data = try await api.getNetWorth()
            adopt(data, capped: false)
        } catch {
            adoptFailure(error)
        }
    }

    /// Pull-to-refresh: the explicit `POST /api/net-worth/refresh`, debounced.
    /// Inside the debounce window the pull still completes, but against the
    /// free GET so it cannot burn the vendor budget.
    func refresh() async {
        refreshErrorMessage = nil
        let currentTime = now()
        if let last = lastRefreshStartedAt, currentTime.timeIntervalSince(last) < Self.refreshDebounce {
            await load()
            return
        }
        lastRefreshStartedAt = currentTime
        do {
            let data = try await api.refreshNetWorth()
            adopt(data, capped: data.bankRefresh == "capped")
        } catch {
            // A failed refresh must be visible (R-8.9: no silent failure).
            // Keep whatever is on screen; fall back to cache only when
            // nothing is.
            if netWorth != nil {
                if isTransport(error) {
                    isOffline = true
                } else {
                    refreshErrorMessage = "Refresh did not complete. Showing your last numbers."
                }
            } else {
                adoptFailure(error)
            }
        }
    }

    private func adopt(_ data: NetWorthResponse, capped: Bool) {
        state = .loaded(data)
        isOffline = false
        bankRefreshCapped = capped
        refreshErrorMessage = nil
        cache.save(data)
    }

    private func adoptFailure(_ error: Error) {
        if let cached = cache.load() {
            state = .loaded(cached)
            isOffline = true
        } else if netWorth == nil {
            state = .failed(error.localizedDescription)
        } else {
            isOffline = isTransport(error)
            if !isOffline { refreshErrorMessage = "Could not reach Coiny. Showing your last numbers." }
        }
    }

    private func isTransport(_ error: Error) -> Bool {
        if case API.APIError.transport = error { return true }
        return error is URLError
    }
}
