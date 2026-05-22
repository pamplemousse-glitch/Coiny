import Foundation
import Observation

/// Minimal slice of the API surface that `PetStore` depends on, extracted
/// behind a protocol so tests can drive the idle → loading → loaded/failed
/// state machine without standing up the real network actor.
protocol PetStoreAPI: Sendable {
    func getPetState() async throws -> PetState
}

extension API: PetStoreAPI {}

/// Observable store for pet state. Polls the backend; views observe via @Bindable.
@Observable
@MainActor
final class PetStore {
    enum LoadState: Equatable {
        case idle
        case loading
        case loaded(PetState)
        case failed(String)
    }

    private(set) var state: LoadState = .idle
    private let api: PetStoreAPI

    init(api: PetStoreAPI = API.shared) {
        self.api = api
    }

    /// Convenience accessor — nil if not loaded.
    var pet: PetState? {
        if case let .loaded(state) = state {
            return state
        }
        return nil
    }

    /// Fetches pet state from `/api/pets`.
    /// Shows a loading spinner only on the very first load; subsequent calls
    /// refresh silently so the pet view doesn't flicker during polling.
    func refresh() async {
        if case .loading = state { return }
        let isFirstLoad = pet == nil
        if isFirstLoad { state = .loading }
        do {
            let newPet = try await api.getPetState()
            state = .loaded(newPet)
        } catch {
            if isFirstLoad { state = .failed(error.localizedDescription) }
        }
    }
}
