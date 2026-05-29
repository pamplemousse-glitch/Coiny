import XCTest
@testable import Coiny

@MainActor
final class NftViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: NftViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var wallets: [NftWallet] = []
        private var addError: Error?
        private var removeError: Error?
        private var syncResult: Result<NftSyncResult, Error> = .success(NftSyncResult(updated: 0))

        func setWallets(_ w: [NftWallet]) { lock.lock(); wallets = w; lock.unlock() }
        func setAddError(_ e: Error?) { lock.lock(); addError = e; lock.unlock() }
        func setRemoveError(_ e: Error?) { lock.lock(); removeError = e; lock.unlock() }
        func setSyncResult(_ r: Result<NftSyncResult, Error>) { lock.lock(); syncResult = r; lock.unlock() }

        func getNftWallets() async throws -> [NftWallet] {
            lock.lock(); let w = wallets; lock.unlock()
            return w
        }

        func addNftWallet(address: String, label: String?) async throws {
            lock.lock(); let e = addError; lock.unlock()
            if let e { throw e }
        }

        func removeNftWallet(address: String) async throws {
            lock.lock(); let e = removeError; lock.unlock()
            if let e { throw e }
        }

        func syncNft() async throws -> NftSyncResult {
            lock.lock(); let r = syncResult; lock.unlock()
            return try r.get()
        }
    }

    private func makeWallet(id: Int = 1, address: String = "0xabc", label: String? = nil, value: Double? = nil) -> NftWallet {
        NftWallet(id: id, address: address, label: label, lastValueUsd: value, lastSyncedAt: nil, createdAt: "2026-01-01T00:00:00Z")
    }

    // MARK: - Initial state

    func testStartsEmpty() {
        let vm = NftViewModel(api: FakeAPI())
        XCTAssertTrue(vm.wallets.isEmpty)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
        XCTAssertNil(vm.lastSyncUpdated)
    }

    // MARK: - Load

    func testLoadWalletsPopulatesWallets() async {
        let fake = FakeAPI()
        fake.setWallets([makeWallet(id: 1, address: "0xdeadbeef")])
        let vm = NftViewModel(api: fake)

        await vm.loadWallets()

        XCTAssertEqual(vm.wallets.count, 1)
        XCTAssertEqual(vm.wallets.first?.address, "0xdeadbeef")
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Add

    func testAddWalletWithEmptyAddressDoesNothing() async {
        let vm = NftViewModel(api: FakeAPI())

        await vm.addWallet(address: "", label: nil)

        XCTAssertTrue(vm.wallets.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testAddWalletSucceeds() async {
        let vm = NftViewModel(api: FakeAPI())

        await vm.addWallet(address: "0xdeadbeef", label: "Main")

        XCTAssertNil(vm.errorMessage)
    }

    func testAddWalletOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "add failed" } }
        let fake = FakeAPI()
        fake.setAddError(Boom())
        let vm = NftViewModel(api: fake)

        await vm.addWallet(address: "0xdeadbeef", label: nil)

        XCTAssertEqual(vm.errorMessage, "add failed")
    }

    // MARK: - Remove

    func testRemoveWalletOptimisticallyRemovesLocally() async {
        let fake = FakeAPI()
        fake.setWallets([makeWallet(id: 1, address: "0xabc")])
        let vm = NftViewModel(api: fake)
        await vm.loadWallets()

        let wallet = vm.wallets[0]
        await vm.removeWallet(wallet)

        XCTAssertTrue(vm.wallets.isEmpty)
    }

    func testRemoveWalletOnErrorReloadsWallets() async {
        struct Boom: LocalizedError { var errorDescription: String? { "remove failed" } }
        let fake = FakeAPI()
        fake.setWallets([makeWallet(id: 1, address: "0xabc")])
        let vm = NftViewModel(api: fake)
        await vm.loadWallets()
        XCTAssertEqual(vm.wallets.count, 1)

        fake.setRemoveError(Boom())
        let wallet = vm.wallets[0]
        await vm.removeWallet(wallet)

        XCTAssertEqual(vm.wallets.count, 1)
        XCTAssertFalse(vm.isLoading)
    }

    // MARK: - Sync

    func testSyncSetsLastSyncUpdated() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(NftSyncResult(updated: 5)))
        let vm = NftViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastSyncUpdated, 5)
        XCTAssertNil(vm.errorMessage)
    }

    func testSyncOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "sync failed" } }
        let fake = FakeAPI()
        fake.setSyncResult(.failure(Boom()))
        let vm = NftViewModel(api: fake)

        await vm.sync()

        XCTAssertNil(vm.lastSyncUpdated)
        XCTAssertEqual(vm.errorMessage, "sync failed")
    }
}
