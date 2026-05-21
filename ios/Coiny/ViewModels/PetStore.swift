import Foundation
import Observation

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

    /// Convenience accessor — nil if not loaded.
    var pet: PetState? {
        if case let .loaded(state) = state {
            return state
        }
        return nil
    }

    /// Fetches pet state from `/api/pets`. Idempotent — safe to call repeatedly.
    func refresh() async {
        if case .loading = state { return }
        state = .loading
        do {
            let pet = try await API.shared.getPetState()
            state = .loaded(pet)
        } catch {
            state = .failed(error.localizedDescription)
        }
    }
}
