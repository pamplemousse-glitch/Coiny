import XCTest
@testable import Coiny

// SpendingView reads `store.pet?.reactionHistory` directly from PetStore.
// There is no separate SpendingViewModel. These tests verify the data path
// that SpendingView depends on: PetStore correctly exposes reactionHistory
// through the pet accessor.
@MainActor
final class SpendingViewModelTests: XCTestCase {

    // MARK: - Helpers

    private static let fixedDate: Date = {
        ISO8601DateFormatter().date(from: "2026-05-21T12:00:00Z")!
    }()

    private static func makeReactionRecord(
        eventType: String,
        at date: Date = fixedDate
    ) -> ReactionRecord {
        ReactionRecord(
            at: date,
            eventType: eventType,
            reaction: Reaction(
                animation: "celebrate",
                sound: "fanfare",
                led: "rainbow",
                duration: 3000,
                reason: "\(eventType) reason"
            )
        )
    }

    private static func makePet(reactionHistory: [ReactionRecord]) -> PetState {
        PetState(
            healthScore: 80,
            mood: 70,
            lastReactionAt: reactionHistory.first?.at,
            reactionHistory: reactionHistory,
            goals: PetGoals(
                weeklyBudgetByCategory: [:],
                savingsGoal: 1000,
                paycheckMinAmount: 500,
                largePurchaseThreshold: 200
            )
        )
    }

    private final class FakeAPI: PetStoreAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var queue: [Result<PetState, Error>] = []

        func enqueue(_ result: Result<PetState, Error>) {
            lock.lock(); defer { lock.unlock() }
            queue.append(result)
        }

        func getPetState() async throws -> PetState {
            lock.lock()
            guard !queue.isEmpty else {
                lock.unlock()
                throw NSError(domain: "FakeAPI", code: -1,
                              userInfo: [NSLocalizedDescriptionKey: "no reply enqueued"])
            }
            let r = queue.removeFirst()
            lock.unlock()
            return try r.get()
        }
    }

    // MARK: - Tests

    func testReactionHistoryEmptyWhenPetNotLoaded() {
        let api = FakeAPI()
        let store = PetStore(api: api)
        // State is .idle — pet is nil.
        XCTAssertNil(store.pet)
        XCTAssertNil(store.pet?.reactionHistory)
    }

    func testReactionHistoryEmptyOnFreshLoad() async {
        let api = FakeAPI()
        api.enqueue(.success(Self.makePet(reactionHistory: [])))
        let store = PetStore(api: api)

        await store.refresh()

        XCTAssertNotNil(store.pet)
        XCTAssertTrue(store.pet?.reactionHistory.isEmpty == true)
    }

    func testReactionHistoryPopulatedAfterLoad() async {
        let api = FakeAPI()
        let records = [
            Self.makeReactionRecord(eventType: "paycheck_received"),
            Self.makeReactionRecord(
                eventType: "large_purchase",
                at: ISO8601DateFormatter().date(from: "2026-05-20T08:00:00Z")!
            ),
        ]
        api.enqueue(.success(Self.makePet(reactionHistory: records)))
        let store = PetStore(api: api)

        await store.refresh()

        XCTAssertEqual(store.pet?.reactionHistory.count, 2)
    }

    func testReactionHistoryPreservesOrder() async {
        let api = FakeAPI()
        let first = Self.makeReactionRecord(
            eventType: "paycheck_received",
            at: ISO8601DateFormatter().date(from: "2026-05-21T12:00:00Z")!
        )
        let second = Self.makeReactionRecord(
            eventType: "large_purchase",
            at: ISO8601DateFormatter().date(from: "2026-05-20T08:00:00Z")!
        )
        api.enqueue(.success(Self.makePet(reactionHistory: [first, second])))
        let store = PetStore(api: api)

        await store.refresh()

        XCTAssertEqual(store.pet?.reactionHistory.first?.eventType, "paycheck_received")
        XCTAssertEqual(store.pet?.reactionHistory.last?.eventType, "large_purchase")
    }

    func testReactionHistoryUpdatesOnRefresh() async {
        let api = FakeAPI()
        let oneRecord = [Self.makeReactionRecord(eventType: "paycheck_received")]
        let twoRecords = [
            Self.makeReactionRecord(eventType: "paycheck_received"),
            Self.makeReactionRecord(
                eventType: "large_purchase",
                at: ISO8601DateFormatter().date(from: "2026-05-20T08:00:00Z")!
            ),
        ]
        api.enqueue(.success(Self.makePet(reactionHistory: oneRecord)))
        api.enqueue(.success(Self.makePet(reactionHistory: twoRecords)))
        let store = PetStore(api: api)

        await store.refresh()
        XCTAssertEqual(store.pet?.reactionHistory.count, 1)

        await store.refresh()
        XCTAssertEqual(store.pet?.reactionHistory.count, 2)
    }
}
