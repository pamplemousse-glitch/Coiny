import XCTest
@testable import Coiny

@MainActor
final class TradingCardsViewModelTests: XCTestCase {
    private final class FakeAPI: TradingCardsViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var holdings: [TradingCardHolding] = []
        private var addError: Error?
        private var removeError: Error?
        private var syncResult: Result<TradingCardsSyncResult, Error> =
            .success(TradingCardsSyncResult(updated: 0, errors: 0))

        func setHoldings(_ h: [TradingCardHolding]) { lock.lock(); holdings = h; lock.unlock() }
        func setAddError(_ e: Error?) { lock.lock(); addError = e; lock.unlock() }
        func setRemoveError(_ e: Error?) { lock.lock(); removeError = e; lock.unlock() }
        func setSyncResult(_ r: Result<TradingCardsSyncResult, Error>) { lock.lock(); syncResult = r; lock.unlock() }

        func getTradingCards() async throws -> [TradingCardHolding] {
            lock.lock(); let h = holdings; lock.unlock(); return h
        }

        // swiftlint:disable:next function_parameter_count
        func addTradingCard(game: String, cardName: String, setName: String?, isFoil: Bool, quantity: Int, label: String?) async throws {
            lock.lock(); let e = addError; lock.unlock(); if let e { throw e }
        }

        func removeTradingCard(id: Int) async throws {
            lock.lock(); let e = removeError; lock.unlock(); if let e { throw e }
        }

        func syncTradingCards() async throws -> TradingCardsSyncResult {
            lock.lock(); let r = syncResult; lock.unlock(); return try r.get()
        }
    }

    private func makeHolding(id: Int = 1, game: String = "pokemon", cardName: String = "Charizard") -> TradingCardHolding {
        TradingCardHolding(id: id, game: game, cardName: cardName, setName: nil, isFoil: false,
                           quantity: 1, label: nil, lastPriceUsd: nil, valueUsd: nil,
                           lastSyncedAt: nil, createdAt: "2026-01-01T00:00:00Z")
    }

    func testStartsEmpty() {
        let vm = TradingCardsViewModel(api: FakeAPI())
        XCTAssertTrue(vm.holdings.isEmpty)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
        XCTAssertNil(vm.lastUpdated)
    }

    func testLoadHoldingsPopulates() async {
        let fake = FakeAPI()
        fake.setHoldings([makeHolding(id: 1, game: "mtg", cardName: "Black Lotus")])
        let vm = TradingCardsViewModel(api: fake)

        await vm.loadHoldings()

        XCTAssertEqual(vm.holdings.count, 1)
        XCTAssertEqual(vm.holdings.first?.cardName, "Black Lotus")
        XCTAssertFalse(vm.isLoading)
    }

    func testAddHoldingWithEmptyGameDoesNothing() async {
        let vm = TradingCardsViewModel(api: FakeAPI())

        await vm.addHolding(game: "", cardName: "Pikachu", setName: nil, isFoil: false, quantity: 1, label: nil)

        XCTAssertTrue(vm.holdings.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testAddHoldingWithZeroQuantityDoesNothing() async {
        let vm = TradingCardsViewModel(api: FakeAPI())

        await vm.addHolding(game: "pokemon", cardName: "Pikachu", setName: nil, isFoil: false, quantity: 0, label: nil)

        XCTAssertTrue(vm.holdings.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testRemoveHoldingRemovesLocally() async {
        let fake = FakeAPI()
        let holding = makeHolding(id: 42)
        fake.setHoldings([holding])
        let vm = TradingCardsViewModel(api: fake)
        await vm.loadHoldings()

        await vm.removeHolding(holding)

        XCTAssertTrue(vm.holdings.isEmpty)
    }

    func testSyncUpdatesLastUpdated() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(TradingCardsSyncResult(updated: 5, errors: 1)))
        let vm = TradingCardsViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastUpdated, 5)
    }
}
