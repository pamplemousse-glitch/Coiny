import Foundation
import Observation

protocol NetWorthViewModelAPI: Sendable {
    func getNetWorth() async throws -> NetWorthResponse
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

    private(set) var state: LoadState = .idle
    private let api: any NetWorthViewModelAPI

    init(api: any NetWorthViewModelAPI = API.shared) {
        self.api = api
    }

    var netWorth: NetWorthResponse? {
        if case let .loaded(data) = state { return data }
        return nil
    }

    func load() async {
        if case .loading = state { return }
        state = .loading
        do {
            let data = try await api.getNetWorth()
            state = .loaded(data)
        } catch {
            state = .failed(error.localizedDescription)
        }
    }
}
