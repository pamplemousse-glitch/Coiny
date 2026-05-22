import XCTest
@testable import Coiny

@MainActor
final class ZerionViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: ZerionViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var walletsResult: Result<[ZerionWallet], Error> = .success([])
        private var addResult: Result<ZerionWallet, Error>?
        private var removeError: Error?
        private var portfolioResult: Result<ZerionPortfolio, Error>?
        private var syncResult: Result<SyncResult, Error> = .success(SyncResult(reacted: 0))

        func setWalletsResult(_ result: Result<[ZerionWallet], Error>) {
            lock.lock(); defer { lock.unlock() }
            walletsResult = result
        }

        func setAddResult(_ result: Result<ZerionWallet, Error>) {
            lock.lock(); defer { lock.unlock() }
            addResult = result
        }

        func setRemoveError(_ error: Error?) {
            lock.lock(); defer { lock.unlock() }
            removeError = error
        }

        func setPortfolioResult(_ result: Result<ZerionPortfolio, Error>?) {
            lock.lock(); defer { lock.unlock() }
            portfolioResult = result
        }

        func setSyncResult(_ result: Result<SyncResult, Error>) {
            lock.lock(); defer { lock.unlock() }
            syncResult = result
        }

        func getZerionWallets() async throws -> [ZerionWallet] {
            lock.lock(); let r = walletsResult; lock.unlock()
            return try r.get()
        }

        func addZerionWallet(address: String, label: String?) async throws -> ZerionWallet {
            lock.lock(); let r = addResult; lock.unlock()
            guard let r else { throw NSError(domain: "FakeAPI", code: -1) }
            return try r.get()
        }

        func removeZerionWallet(address: String) async throws {
            lock.lock(); let e = removeError; lock.unlock()
            if let e { throw e }
        }

        func getZerionPortfolio() async throws -> ZerionPortfolio {
            lock.lock(); let r = portfolioResult; lock.unlock()
            guard let r else { throw NSError(domain: "FakeAPI", code: -1) }
            return try r.get()
        }

        func syncZerion() async throws -> SyncResult {
            lock.lock(); let r = syncResult; lock.unlock()
            return try r.get()
        }
    }

    // MARK: - Fixtures

    private static func makeWallet(id: String = "w1", address: String = "0xABC") -> ZerionWallet {
        ZerionWallet(
            id: id,
            userId: "u1",
            address: address,
            label: nil,
            createdAt: Date()
        )
    }

    // MARK: - Initial state

    func testStartsEmpty() {
        let vm = ZerionViewModel(api: FakeAPI())
        XCTAssertTrue(vm.wallets.isEmpty)
        XCTAssertNil(vm.portfolio)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Load wallets

    func testLoadWalletsPopulatesList() async {
        let fake = FakeAPI()
        let wallet = Self.makeWallet()
        fake.setWalletsResult(.success([wallet]))
        let vm = ZerionViewModel(api: fake)

        await vm.loadWallets()

        XCTAssertEqual(vm.wallets.count, 1)
        XCTAssertEqual(vm.wallets.first?.address, "0xABC")
        XCTAssertNil(vm.errorMessage)
    }

    func testLoadWalletsOnErrorSetsErrorMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "wallets failed" } }
        let fake = FakeAPI()
        fake.setWalletsResult(.failure(Boom()))
        let vm = ZerionViewModel(api: fake)

        await vm.loadWallets()

        XCTAssertTrue(vm.wallets.isEmpty)
        XCTAssertEqual(vm.errorMessage, "wallets failed")
    }

    // MARK: - Add wallet

    func testAddWalletAppendsToList() async {
        let fake = FakeAPI()
        fake.setWalletsResult(.success([]))
        let newWallet = Self.makeWallet(id: "w2", address: "0xDEF")
        fake.setAddResult(.success(newWallet))
        let vm = ZerionViewModel(api: fake)
        await vm.loadWallets()

        await vm.addWallet(address: "0xDEF", label: nil)

        XCTAssertEqual(vm.wallets.count, 1)
        XCTAssertEqual(vm.wallets.first?.address, "0xDEF")
    }

    func testAddWalletWithEmptyAddressDoesNothing() async {
        let fake = FakeAPI()
        fake.setWalletsResult(.success([]))
        let vm = ZerionViewModel(api: fake)
        await vm.loadWallets()

        await vm.addWallet(address: "", label: nil)

        XCTAssertTrue(vm.wallets.isEmpty)
    }

    // MARK: - Sync

    func testSyncSetsLastSyncReacted() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(SyncResult(reacted: 3)))
        let vm = ZerionViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastSyncReacted, 3)
        XCTAssertFalse(vm.isSyncing)
    }

    func testSyncOnErrorSetsErrorMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "sync error" } }
        let fake = FakeAPI()
        fake.setSyncResult(.failure(Boom()))
        let vm = ZerionViewModel(api: fake)

        await vm.sync()

        XCTAssertNil(vm.lastSyncReacted)
        XCTAssertEqual(vm.errorMessage, "sync error")
    }
}
