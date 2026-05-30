import XCTest
@testable import Coiny

@MainActor
final class CoinsViewModelTests: XCTestCase {
    private final class FakeAPI: CoinsViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var holdings: [CoinHolding] = []
        private var addError: Error?
        private var removeError: Error?
        private var syncResult: Result<CoinsSyncResult, Error> = .success(CoinsSyncResult(updated: 0, errors: 0))

        func setHoldings(_ h: [CoinHolding]) { lock.lock(); holdings = h; lock.unlock() }
        func setAddError(_ e: Error?) { lock.lock(); addError = e; lock.unlock() }
        func setRemoveError(_ e: Error?) { lock.lock(); removeError = e; lock.unlock() }
        func setSyncResult(_ r: Result<CoinsSyncResult, Error>) { lock.lock(); syncResult = r; lock.unlock() }

        func getCoins() async throws -> [CoinHolding] {
            lock.lock(); let h = holdings; lock.unlock(); return h
        }

        func addCoin(pcgsNo: Int, gradeNo: Int, plusGrade: Bool, label: String?, quantity: Int) async throws {
            lock.lock(); let e = addError; lock.unlock(); if let e { throw e }
        }

        func removeCoin(id: Int) async throws {
            lock.lock(); let e = removeError; lock.unlock(); if let e { throw e }
        }

        func syncCoins() async throws -> CoinsSyncResult {
            lock.lock(); let r = syncResult; lock.unlock(); return try r.get()
        }
    }

    private func makeHolding(id: Int = 1, pcgsNo: Int = 123456, gradeNo: Int = 65) -> CoinHolding {
        CoinHolding(id: id, pcgsNo: pcgsNo, gradeNo: gradeNo, plusGrade: false, quantity: 1,
                    coinName: "1881-S Morgan Dollar", label: nil,
                    lastPriceGuideUsd: nil, valueUsd: nil,
                    lastSyncedAt: nil, createdAt: "2026-01-01T00:00:00Z")
    }

    func testStartsEmpty() {
        let vm = CoinsViewModel(api: FakeAPI())
        XCTAssertTrue(vm.holdings.isEmpty)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
        XCTAssertNil(vm.lastUpdated)
    }

    func testLoadHoldingsPopulates() async {
        let fake = FakeAPI()
        fake.setHoldings([makeHolding(id: 1, pcgsNo: 9999)])
        let vm = CoinsViewModel(api: fake)

        await vm.loadHoldings()

        XCTAssertEqual(vm.holdings.count, 1)
        XCTAssertEqual(vm.holdings.first?.pcgsNo, 9999)
        XCTAssertFalse(vm.isLoading)
    }

    func testAddHoldingWithZeroPcgsNoDoesNothing() async {
        let vm = CoinsViewModel(api: FakeAPI())

        await vm.addHolding(pcgsNo: 0, gradeNo: 65, plusGrade: false, label: nil, quantity: 1)

        XCTAssertTrue(vm.holdings.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testAddHoldingWithZeroQuantityDoesNothing() async {
        let vm = CoinsViewModel(api: FakeAPI())

        await vm.addHolding(pcgsNo: 123456, gradeNo: 65, plusGrade: false, label: nil, quantity: 0)

        XCTAssertTrue(vm.holdings.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testRemoveHoldingRemovesLocally() async {
        let fake = FakeAPI()
        let holding = makeHolding(id: 77)
        fake.setHoldings([holding])
        let vm = CoinsViewModel(api: fake)
        await vm.loadHoldings()

        await vm.removeHolding(holding)

        XCTAssertTrue(vm.holdings.isEmpty)
    }

    func testSyncUpdatesLastUpdated() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(CoinsSyncResult(updated: 6, errors: 0)))
        let vm = CoinsViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastUpdated, 6)
    }
}
