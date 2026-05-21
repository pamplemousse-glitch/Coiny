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

    /// Fetches pet state from `/api/pets`.
    /// Shows a loading spinner only on the very first load; subsequent calls
    /// refresh silently so the pet view doesn't flicker during polling.
    func refresh() async {
        if case .loading = state { return }
        let isFirstLoad = pet == nil
        if isFirstLoad { state = .loading }
        do {
            let newPet = try await API.shared.getPetState()
            state = .loaded(newPet)
        } catch {
            if isFirstLoad { state = .failed(error.localizedDescription) }
        }
    }
}
