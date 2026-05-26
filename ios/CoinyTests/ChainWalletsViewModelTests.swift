import XCTest
@testable import Coiny

@MainActor
final class ChainWalletsViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: ChainWalletsViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var walletsResult: Result<[ChainWallet], Error> = .success([])
        private var addError: Error?
        private var removeError: Error?
        private var syncResult: Result<ChainWalletSyncResult, Error> = .success(ChainWalletSyncResult(updated: 0))

        func setWalletsResult(_ result: Result<[ChainWallet], Error>) {
            lock.lock(); defer { lock.unlock() }
            walletsResult = result
        }

        func setAddError(_ error: Error?) {
            lock.lock(); defer { lock.unlock() }
            addError = error
        }

        func setRemoveError(_ error: Error?) {
            lock.lock(); defer { lock.unlock() }
            removeError = error
        }

        func setSyncResult(_ result: Result<ChainWalletSyncResult, Error>) {
            lock.lock(); defer { lock.unlock() }
            syncResult = result
        }

        func getChainWallets() async throws -> [ChainWallet] {
            lock.lock(); let r = walletsResult; lock.unlock()
            return try r.get()
        }

        func addChainWallet(chain: String, address: String, label: String?) async throws {
            lock.lock(); let e = addError; lock.unlock()
            if let e { throw e }
        }

        func removeChainWallet(chain: String, address: String) async throws {
            lock.lock(); let e = removeError; lock.unlock()
            if let e { throw e }
        }

        func syncChainWallets() async throws -> ChainWalletSyncResult {
            lock.lock(); let r = syncResult; lock.unlock()
            return try r.get()
        }
    }

    // MARK: - Fixtures

    private static func makeWallet(
        id: Int = 1,
        chain: String = "bitcoin",
        address: String = "bc1qtest"
    ) -> ChainWallet {
        ChainWallet(id: id, chain: chain, address: address, label: nil, lastBalanceUsd: nil, lastSyncedAt: nil)
    }

    // MARK: - Initial state

    func testStartsEmpty() {
        let vm = ChainWalletsViewModel(api: FakeAPI())
        XCTAssertTrue(vm.wallets.isEmpty)
        XCTAssertFalse(vm.isSyncing)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Load wallets

    func testLoadWalletsPopulatesList() async {
        let fake = FakeAPI()
        fake.setWalletsResult(.success([Self.makeWallet()]))
        let vm = ChainWalletsViewModel(api: fake)

        await vm.loadWallets()

        XCTAssertEqual(vm.wallets.count, 1)
        XCTAssertEqual(vm.wallets.first?.chain, "bitcoin")
        XCTAssertNil(vm.errorMessage)
    }

    func testLoadWalletsOnErrorSetsErrorMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "load failed" } }
        let fake = FakeAPI()
        fake.setWalletsResult(.failure(Boom()))
        let vm = ChainWalletsViewModel(api: fake)

        await vm.loadWallets()

        XCTAssertTrue(vm.wallets.isEmpty)
        XCTAssertEqual(vm.errorMessage, "load failed")
    }

    // MARK: - Add wallet

    func testAddWalletWithEmptyAddressDoesNothing() async {
        let fake = FakeAPI()
        let vm = ChainWalletsViewModel(api: fake)

        await vm.addWallet(chain: "bitcoin", address: "", label: nil)

        XCTAssertTrue(vm.wallets.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testAddWalletReloadsListOnSuccess() async {
        let fake = FakeAPI()
        fake.setWalletsResult(.success([Self.makeWallet(address: "bc1qnew")]))
        let vm = ChainWalletsViewModel(api: fake)

        await vm.addWallet(chain: "bitcoin", address: "bc1qnew", label: nil)

        XCTAssertEqual(vm.wallets.count, 1)
        XCTAssertNil(vm.errorMessage)
    }

    func testAddWalletOnErrorSetsErrorMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "add failed" } }
        let fake = FakeAPI()
        fake.setAddError(Boom())
        let vm = ChainWalletsViewModel(api: fake)

        await vm.addWallet(chain: "bitcoin", address: "bc1qtest", label: nil)

        XCTAssertEqual(vm.errorMessage, "add failed")
    }

    // MARK: - Remove wallet

    func testRemoveWalletUpdatesLocalList() async {
        let fake = FakeAPI()
        let wallet = Self.makeWallet()
        fake.setWalletsResult(.success([wallet]))
        let vm = ChainWalletsViewModel(api: fake)
        await vm.loadWallets()

        await vm.removeWallet(chain: wallet.chain, address: wallet.address)

        XCTAssertTrue(vm.wallets.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testRemoveWalletOnErrorSetsErrorMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "remove failed" } }
        let fake = FakeAPI()
        let wallet = Self.makeWallet()
        fake.setWalletsResult(.success([wallet]))
        fake.setRemoveError(Boom())
        let vm = ChainWalletsViewModel(api: fake)
        await vm.loadWallets()

        await vm.removeWallet(chain: wallet.chain, address: wallet.address)

        XCTAssertEqual(vm.wallets.count, 1)
        XCTAssertEqual(vm.errorMessage, "remove failed")
    }

    // MARK: - Sync

    func testSyncSetsLastSyncUpdated() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(ChainWalletSyncResult(updated: 3)))
        let vm = ChainWalletsViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastSyncUpdated, 3)
        XCTAssertFalse(vm.isSyncing)
    }

    func testSyncOnErrorSetsErrorMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "sync error" } }
        let fake = FakeAPI()
        fake.setSyncResult(.failure(Boom()))
        let vm = ChainWalletsViewModel(api: fake)

        await vm.sync()

        XCTAssertNil(vm.lastSyncUpdated)
        XCTAssertEqual(vm.errorMessage, "sync error")
        XCTAssertFalse(vm.isSyncing)
    }
}
