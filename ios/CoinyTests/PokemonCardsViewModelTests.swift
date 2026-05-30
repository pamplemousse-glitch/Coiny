import XCTest
@testable import Coiny

@MainActor
final class PokemonCardsViewModelTests: XCTestCase {
    private final class FakeAPI: PokemonCardsViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var holdings: [PokemonCardHolding] = []
        private var addError: Error?
        private var removeError: Error?
        private var syncResult: Result<PokemonCardsSyncResult, Error> = .success(PokemonCardsSyncResult(updated: 0, errors: 0))

        func setHoldings(_ h: [PokemonCardHolding]) { lock.lock(); holdings = h; lock.unlock() }
        func setAddError(_ e: Error?) { lock.lock(); addError = e; lock.unlock() }
        func setRemoveError(_ e: Error?) { lock.lock(); removeError = e; lock.unlock() }
        func setSyncResult(_ r: Result<PokemonCardsSyncResult, Error>) { lock.lock(); syncResult = r; lock.unlock() }

        func getPokemonCards() async throws -> [PokemonCardHolding] {
            lock.lock(); let h = holdings; lock.unlock(); return h
        }

        func addPokemonCard(cardName: String, setName: String?, variant: String?, quantity: Int, label: String?) async throws {
            lock.lock(); let e = addError; lock.unlock(); if let e { throw e }
        }

        func removePokemonCard(id: Int) async throws {
            lock.lock(); let e = removeError; lock.unlock(); if let e { throw e }
        }

        func syncPokemonCards() async throws -> PokemonCardsSyncResult {
            lock.lock(); let r = syncResult; lock.unlock(); return try r.get()
        }
    }

    private func makeHolding(id: Int = 1, cardName: String = "Charizard") -> PokemonCardHolding {
        PokemonCardHolding(id: id, cardName: cardName, setName: nil, variant: nil, quantity: 1,
                           label: nil, lastPriceUsd: nil, valueUsd: nil, lastSyncedAt: nil)
    }

    func testStartsEmpty() {
        let vm = PokemonCardsViewModel(api: FakeAPI())
        XCTAssertTrue(vm.holdings.isEmpty)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
        XCTAssertNil(vm.lastSynced)
    }

    func testLoadHoldingsPopulates() async {
        let fake = FakeAPI()
        fake.setHoldings([makeHolding(id: 1, cardName: "Pikachu")])
        let vm = PokemonCardsViewModel(api: fake)

        await vm.loadHoldings()

        XCTAssertEqual(vm.holdings.count, 1)
        XCTAssertEqual(vm.holdings.first?.cardName, "Pikachu")
        XCTAssertFalse(vm.isLoading)
    }

    func testAddHoldingWithEmptyCardNameDoesNothing() async {
        let vm = PokemonCardsViewModel(api: FakeAPI())

        await vm.addHolding(cardName: "", setName: nil, variant: nil, quantity: 1, label: nil)

        XCTAssertTrue(vm.holdings.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testRemoveHoldingRemovesLocally() async {
        let fake = FakeAPI()
        let holding = makeHolding(id: 99)
        fake.setHoldings([holding])
        let vm = PokemonCardsViewModel(api: fake)
        await vm.loadHoldings()

        await vm.removeHolding(holding)

        XCTAssertTrue(vm.holdings.isEmpty)
    }

    func testSyncUpdatesLastSynced() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(PokemonCardsSyncResult(updated: 3, errors: 0)))
        let vm = PokemonCardsViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastSynced, 3)
    }
}
