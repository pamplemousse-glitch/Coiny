import XCTest
@testable import Coiny

@MainActor
final class MetalsViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: MetalsViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var holdingsResult: Result<[MetalHolding], Error> = .success([])
        private var addError: Error?
        private var removeError: Error?
        private var syncResult: Result<MetalsSyncResult, Error> = .success(MetalsSyncResult(synced: 0, errors: 0))

        func setHoldingsResult(_ r: Result<[MetalHolding], Error>) { lock.lock(); holdingsResult = r; lock.unlock() }
        func setAddError(_ e: Error?) { lock.lock(); addError = e; lock.unlock() }
        func setRemoveError(_ e: Error?) { lock.lock(); removeError = e; lock.unlock() }
        func setSyncResult(_ r: Result<MetalsSyncResult, Error>) { lock.lock(); syncResult = r; lock.unlock() }

        func getMetals() async throws -> [MetalHolding] { lock.lock(); let r = holdingsResult; lock.unlock(); return try r.get() }
        func addMetal(metal: String, weightOz: Double, label: String?) async throws { lock.lock(); let e = addError; lock.unlock(); if let e { throw e } }
        func removeMetal(id: Int) async throws { lock.lock(); let e = removeError; lock.unlock(); if let e { throw e } }
        func syncMetals() async throws -> MetalsSyncResult { lock.lock(); let r = syncResult; lock.unlock(); return try r.get() }
    }

    private static func makeHolding(id: Int = 1, metal: String = "XAU") -> MetalHolding {
        MetalHolding(id: id, metal: metal, weightOz: 1.0, label: nil, lastValueUsd: nil, lastSyncedAt: nil, createdAt: "2026-01-01T00:00:00.000Z")
    }

    // MARK: - Initial state

    func testStartsEmpty() {
        let vm = MetalsViewModel(api: FakeAPI())
        XCTAssertTrue(vm.holdings.isEmpty)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Load

    func testLoadPopulatesList() async {
        let fake = FakeAPI()
        fake.setHoldingsResult(.success([Self.makeHolding()]))
        let vm = MetalsViewModel(api: fake)

        await vm.loadHoldings()

        XCTAssertEqual(vm.holdings.count, 1)
        XCTAssertEqual(vm.holdings.first?.metal, "XAU")
        XCTAssertNil(vm.errorMessage)
    }

    func testLoadOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "load failed" } }
        let fake = FakeAPI()
        fake.setHoldingsResult(.failure(Boom()))
        let vm = MetalsViewModel(api: fake)

        await vm.loadHoldings()

        XCTAssertTrue(vm.holdings.isEmpty)
        XCTAssertEqual(vm.errorMessage, "load failed")
    }

    // MARK: - Add

    func testAddWithZeroWeightDoesNothing() async {
        let fake = FakeAPI()
        let vm = MetalsViewModel(api: fake)

        await vm.addHolding(metal: "XAU", weightOz: 0, label: nil)

        XCTAssertTrue(vm.holdings.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testAddReloadsOnSuccess() async {
        let fake = FakeAPI()
        fake.setHoldingsResult(.success([Self.makeHolding()]))
        let vm = MetalsViewModel(api: fake)

        await vm.addHolding(metal: "XAU", weightOz: 1.0, label: nil)

        XCTAssertEqual(vm.holdings.count, 1)
        XCTAssertNil(vm.errorMessage)
    }

    func testAddOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "add failed" } }
        let fake = FakeAPI()
        fake.setAddError(Boom())
        let vm = MetalsViewModel(api: fake)

        await vm.addHolding(metal: "XAG", weightOz: 2.0, label: nil)

        XCTAssertEqual(vm.errorMessage, "add failed")
    }

    // MARK: - Remove

    func testRemoveOptimisticallyUpdatesLocal() async {
        let fake = FakeAPI()
        let holding = Self.makeHolding()
        fake.setHoldingsResult(.success([holding]))
        let vm = MetalsViewModel(api: fake)
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
        let vm = MetalsViewModel(api: fake)
        await vm.loadHoldings()

        await vm.removeHolding(holding)

        XCTAssertEqual(vm.holdings.count, 1)
        XCTAssertEqual(vm.errorMessage, "remove failed")
    }

    // MARK: - Sync

    func testSyncSetsLastSynced() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(MetalsSyncResult(synced: 3, errors: 0)))
        let vm = MetalsViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastSynced, 3)
        XCTAssertNil(vm.errorMessage)
    }

    func testSyncOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "sync error" } }
        let fake = FakeAPI()
        fake.setSyncResult(.failure(Boom()))
        let vm = MetalsViewModel(api: fake)

        await vm.sync()

        XCTAssertNil(vm.lastSynced)
        XCTAssertEqual(vm.errorMessage, "sync error")
    }
}
