import XCTest
@testable import Coiny

@MainActor
final class SneakersViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: SneakersViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var holdingsResult: Result<[SneakerHolding], Error> = .success([])
        private var addError: Error?
        private var removeError: Error?
        private var syncResult: Result<SneakersSyncResult, Error> = .success(SneakersSyncResult(synced: 0, errors: 0))

        func setHoldingsResult(_ r: Result<[SneakerHolding], Error>) { lock.lock(); holdingsResult = r; lock.unlock() }
        func setAddError(_ e: Error?) { lock.lock(); addError = e; lock.unlock() }
        func setRemoveError(_ e: Error?) { lock.lock(); removeError = e; lock.unlock() }
        func setSyncResult(_ r: Result<SneakersSyncResult, Error>) { lock.lock(); syncResult = r; lock.unlock() }

        func getSneakers() async throws -> [SneakerHolding] { lock.lock(); let r = holdingsResult; lock.unlock(); return try r.get() }
        func addSneaker(sku: String, size: String?, description: String?, quantity: Int) async throws { lock.lock(); let e = addError; lock.unlock(); if let e { throw e } }
        func removeSneaker(id: Int) async throws { lock.lock(); let e = removeError; lock.unlock(); if let e { throw e } }
        func syncSneakers() async throws -> SneakersSyncResult { lock.lock(); let r = syncResult; lock.unlock(); return try r.get() }
    }

    private static func makeHolding(id: Int = 1, sku: String = "DD1391-100") -> SneakerHolding {
        SneakerHolding(id: id, sku: sku, description: nil, size: "10", quantity: 1, lastPriceUsd: nil, lastSyncedAt: nil, createdAt: "2026-01-01T00:00:00.000Z")
    }

    // MARK: - Initial state

    func testStartsEmpty() {
        let vm = SneakersViewModel(api: FakeAPI())
        XCTAssertTrue(vm.holdings.isEmpty)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Load

    func testLoadPopulatesList() async {
        let fake = FakeAPI()
        fake.setHoldingsResult(.success([Self.makeHolding()]))
        let vm = SneakersViewModel(api: fake)

        await vm.loadHoldings()

        XCTAssertEqual(vm.holdings.count, 1)
        XCTAssertEqual(vm.holdings.first?.sku, "DD1391-100")
        XCTAssertNil(vm.errorMessage)
    }

    func testLoadOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "load failed" } }
        let fake = FakeAPI()
        fake.setHoldingsResult(.failure(Boom()))
        let vm = SneakersViewModel(api: fake)

        await vm.loadHoldings()

        XCTAssertTrue(vm.holdings.isEmpty)
        XCTAssertEqual(vm.errorMessage, "load failed")
    }

    // MARK: - Add

    func testAddWithEmptySkuDoesNothing() async {
        let fake = FakeAPI()
        let vm = SneakersViewModel(api: fake)

        await vm.addHolding(sku: "", size: nil, description: nil, quantity: 1)

        XCTAssertTrue(vm.holdings.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testAddReloadsOnSuccess() async {
        let fake = FakeAPI()
        fake.setHoldingsResult(.success([Self.makeHolding()]))
        let vm = SneakersViewModel(api: fake)

        await vm.addHolding(sku: "DD1391-100", size: "10", description: nil, quantity: 1)

        XCTAssertEqual(vm.holdings.count, 1)
        XCTAssertNil(vm.errorMessage)
    }

    func testAddOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "add failed" } }
        let fake = FakeAPI()
        fake.setAddError(Boom())
        let vm = SneakersViewModel(api: fake)

        await vm.addHolding(sku: "TEST-001", size: nil, description: nil, quantity: 1)

        XCTAssertEqual(vm.errorMessage, "add failed")
    }

    // MARK: - Remove

    func testRemoveOptimisticallyUpdatesLocal() async {
        let fake = FakeAPI()
        let holding = Self.makeHolding()
        fake.setHoldingsResult(.success([holding]))
        let vm = SneakersViewModel(api: fake)
        await vm.loadHoldings()

        await vm.removeHolding(holding)

        XCTAssertTrue(vm.holdings.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testRemoveOnErrorRollsBack() async {
        struct Boom: LocalizedError { var errorDescription: String? { "remove failed" } }
        let fake = FakeAPI()
        let holding = Self.makeHolding()
        fake.setHoldingsResult(.success([holding]))
        fake.setRemoveError(Boom())
        let vm = SneakersViewModel(api: fake)
        await vm.loadHoldings()

        await vm.removeHolding(holding)

        XCTAssertEqual(vm.holdings.count, 1)
        XCTAssertEqual(vm.errorMessage, "remove failed")
    }

    // MARK: - Sync

    func testSyncSetsLastSynced() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(SneakersSyncResult(synced: 2, errors: 0)))
        let vm = SneakersViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastSynced, 2)
        XCTAssertNil(vm.errorMessage)
    }

    func testSyncOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "sync error" } }
        let fake = FakeAPI()
        fake.setSyncResult(.failure(Boom()))
        let vm = SneakersViewModel(api: fake)

        await vm.sync()

        XCTAssertNil(vm.lastSynced)
        XCTAssertEqual(vm.errorMessage, "sync error")
    }
}
