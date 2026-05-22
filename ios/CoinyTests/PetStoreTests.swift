import XCTest
@testable import Coiny

@MainActor
final class PetStoreTests: XCTestCase {
    // MARK: - Fixtures

    private static let samplePet = PetState(
        healthScore: 73,
        mood: 60,
        lastReactionAt: nil,
        reactionHistory: [],
        goals: PetGoals(
            weeklyBudgetByCategory: ["groceries": 150],
            savingsGoal: 1000,
            paycheckMinAmount: 500,
            largePurchaseThreshold: 200
        )
    )

    private static let secondPet = PetState(
        healthScore: 42,
        mood: 50,
        lastReactionAt: nil,
        reactionHistory: [],
        goals: PetGoals(
            weeklyBudgetByCategory: [:],
            savingsGoal: 2000,
            paycheckMinAmount: 1000,
            largePurchaseThreshold: 400
        )
    )

    // MARK: - Fake

    final class FakeAPI: PetStoreAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var queue: [Result<PetState, Error>] = []
        private(set) var callCount = 0

        func enqueue(_ result: Result<PetState, Error>) {
            lock.lock(); defer { lock.unlock() }
            queue.append(result)
        }

        func getPetState() async throws -> PetState {
            lock.lock()
            callCount += 1
            guard !queue.isEmpty else {
                lock.unlock()
                throw NSError(domain: "FakeAPI", code: -1, userInfo: [NSLocalizedDescriptionKey: "no reply enqueued"])
            }
            let r = queue.removeFirst()
            lock.unlock()
            return try r.get()
        }
    }

    // MARK: - State machine

    func testStartsIdleWithNoCalls() {
        let api = FakeAPI()
        let store = PetStore(api: api)
        XCTAssertEqual(store.state, .idle)
        XCTAssertNil(store.pet)
        XCTAssertEqual(api.callCount, 0)
    }

    func testFirstRefreshTransitionsIdleToLoaded() async {
        let api = FakeAPI()
        api.enqueue(.success(Self.samplePet))
        let store = PetStore(api: api)

        await store.refresh()

        XCTAssertEqual(store.state, .loaded(Self.samplePet))
        XCTAssertEqual(store.pet?.healthScore, 73)
        XCTAssertEqual(api.callCount, 1)
    }

    func testFirstRefreshOnFailureTransitionsToFailed() async {
        let api = FakeAPI()
        struct UpstreamError: LocalizedError {
            var errorDescription: String? { "upstream offline" }
        }
        api.enqueue(.failure(UpstreamError()))
        let store = PetStore(api: api)

        await store.refresh()

        XCTAssertEqual(store.state, .failed("upstream offline"))
        XCTAssertNil(store.pet)
    }

    func testSubsequentRefreshOnFailureKeepsLastLoadedState() async {
        let api = FakeAPI()
        api.enqueue(.success(Self.samplePet))
        let store = PetStore(api: api)
        await store.refresh()
        XCTAssertEqual(store.pet?.healthScore, 73)

        // Now a transient failure: per the policy comment, the loaded pet
        // should stay on screen rather than flipping to .failed.
        struct Boom: Error {}
        api.enqueue(.failure(Boom()))
        await store.refresh()

        XCTAssertEqual(store.state, .loaded(Self.samplePet))
        XCTAssertEqual(store.pet?.healthScore, 73)
    }

    func testRefreshReplacesPreviouslyLoadedPet() async {
        let api = FakeAPI()
        api.enqueue(.success(Self.samplePet))
        api.enqueue(.success(Self.secondPet))
        let store = PetStore(api: api)

        await store.refresh()
        XCTAssertEqual(store.pet?.healthScore, 73)

        await store.refresh()
        XCTAssertEqual(store.pet?.healthScore, 42)
        XCTAssertEqual(api.callCount, 2)
    }

    func testPetAccessorReflectsLoadState() {
        let api = FakeAPI()
        let store = PetStore(api: api)
        XCTAssertNil(store.pet, "idle → nil")

        // Can't easily get into .loading state without racing; .idle → .loaded
        // and .failed → nil are the load-bearing branches.
    }
}
