import XCTest
@testable import Coiny

@MainActor
final class ZerionViewModelAdditionalTests: XCTestCase {

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

    private static func makeWallet(
        id: String = "w1",
        address: String = "0xAAA"
    ) -> ZerionWallet {
        ZerionWallet(id: id, userId: "u1", address: address, label: nil, createdAt: Date())
    }

    // MARK: - isLoading terminal states

    func testIsLoadingFalseAfterSuccessfulLoad() async {
        let fake = FakeAPI()
        fake.setWalletsResult(.success([]))
        let vm = ZerionViewModel(api: fake)

        await vm.loadWallets()

        XCTAssertFalse(vm.isLoading)
    }

    func testIsLoadingFalseAfterFailedLoad() async {
        struct Boom: LocalizedError { var errorDescription: String? { "wallets error" } }
        let fake = FakeAPI()
        fake.setWalletsResult(.failure(Boom()))
        let vm = ZerionViewModel(api: fake)

        await vm.loadWallets()

        XCTAssertFalse(vm.isLoading)
        XCTAssertEqual(vm.errorMessage, "wallets error")
    }

    // MARK: - isSyncing terminal states

    func testIsSyncingFalseAfterSuccessfulSync() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(SyncResult(reacted: 7)))
        let vm = ZerionViewModel(api: fake)

        await vm.sync()

        XCTAssertFalse(vm.isSyncing)
        XCTAssertEqual(vm.lastSyncReacted, 7)
    }

    func testIsSyncingFalseAfterSyncError() async {
        struct Boom: LocalizedError { var errorDescription: String? { "sync failed" } }
        let fake = FakeAPI()
        fake.setSyncResult(.failure(Boom()))
        let vm = ZerionViewModel(api: fake)

        await vm.sync()

        XCTAssertFalse(vm.isSyncing)
        XCTAssertEqual(vm.errorMessage, "sync failed")
    }

    // MARK: - addWallet empty address guard

    func testAddWalletEmptyAddressIsNoop() async {
        // The VM has a `guard !address.isEmpty else { return }` guard.
        let fake = FakeAPI()
        fake.setWalletsResult(.success([]))
        let vm = ZerionViewModel(api: fake)
        await vm.loadWallets()
        XCTAssertTrue(vm.wallets.isEmpty)

        await vm.addWallet(address: "", label: nil)

        XCTAssertTrue(vm.wallets.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - removeWallet by IndexSet

    func testRemoveWalletByOffsets() async {
        let fake = FakeAPI()
        let w1 = Self.makeWallet(id: "w1", address: "0x111")
        let w2 = Self.makeWallet(id: "w2", address: "0x222")
        fake.setWalletsResult(.success([w1, w2]))
        let vm = ZerionViewModel(api: fake)
        await vm.loadWallets()
        XCTAssertEqual(vm.wallets.count, 2)

        await vm.removeWallet(at: IndexSet([0]))

        XCTAssertEqual(vm.wallets.count, 1)
        XCTAssertEqual(vm.wallets.first?.address, "0x222")
    }

    // MARK: - removeWallet error

    func testRemoveWalletErrorSetsErrorMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "remove failed" } }
        let fake = FakeAPI()
        let w1 = Self.makeWallet(id: "w1", address: "0xDEAD")
        fake.setWalletsResult(.success([w1]))
        fake.setRemoveError(Boom())
        let vm = ZerionViewModel(api: fake)
        await vm.loadWallets()
        XCTAssertEqual(vm.wallets.count, 1)

        await vm.removeWallet(at: IndexSet([0]))

        XCTAssertEqual(vm.errorMessage, "remove failed")
    }

    // MARK: - portfolio nil when loadWallets portfolio throws

    func testPortfolioNilWhenLoadFails() async {
        // loadWallets succeeds for wallets but portfolio throws → portfolio remains nil,
        // wallets are populated. The implementation uses `try?` for portfolio.
        let fake = FakeAPI()
        let wallet = Self.makeWallet()
        fake.setWalletsResult(.success([wallet]))
        // portfolioResult is nil by default → getZerionPortfolio throws (no result set)
        let vm = ZerionViewModel(api: fake)

        await vm.loadWallets()

        XCTAssertEqual(vm.wallets.count, 1)
        XCTAssertNil(vm.portfolio)
    }

    // MARK: - addWallet error

    func testAddWalletSetsErrorOnFailure() async {
        struct Boom: LocalizedError { var errorDescription: String? { "add wallet failed" } }
        let fake = FakeAPI()
        fake.setWalletsResult(.success([]))
        fake.setAddResult(.failure(Boom()))
        let vm = ZerionViewModel(api: fake)
        await vm.loadWallets()

        await vm.addWallet(address: "0xNEW", label: "My Wallet")

        XCTAssertEqual(vm.errorMessage, "add wallet failed")
        XCTAssertTrue(vm.wallets.isEmpty)
    }
}
