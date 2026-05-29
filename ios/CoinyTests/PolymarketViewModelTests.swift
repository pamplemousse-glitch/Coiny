import XCTest
@testable import Coiny

@MainActor
final class PolymarketViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: PolymarketViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        var accounts: [PolymarketAccount] = []
        var addError: Error?
        var removeError: Error?
        var syncError: Error?

        func getPolymarketAccounts() async throws -> [PolymarketAccount] {
            lock.lock(); defer { lock.unlock() }
            return accounts
        }

        func addPolymarketAccount(walletAddress: String, label: String?) async throws {
            if let err = addError { throw err }
            lock.lock(); defer { lock.unlock() }
            accounts.append(PolymarketAccount(id: accounts.count + 1, walletAddress: walletAddress, label: label, lastValueUsd: nil, lastSyncedAt: nil, createdAt: "2024-01-01T00:00:00Z"))
        }

        func removePolymarketAccount(address: String) async throws {
            if let err = removeError { throw err }
            lock.lock(); defer { lock.unlock() }
            accounts.removeAll { $0.walletAddress == address }
        }

        func syncPolymarket() async throws -> PolymarketSyncResult {
            if let err = syncError { throw err }
            return PolymarketSyncResult(updated: accounts.count)
        }
    }

    struct Boom: LocalizedError { var errorDescription: String? { "boom" } }

    // MARK: - Initial state

    func testStartsEmpty() {
        let vm = PolymarketViewModel(api: FakeAPI())
        XCTAssertTrue(vm.accounts.isEmpty)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - loadAccounts

    func testLoadAccountsSetsAccounts() async {
        let fake = FakeAPI()
        fake.accounts = [PolymarketAccount(id: 1, walletAddress: "0xabc", label: "My Wallet", lastValueUsd: 100, lastSyncedAt: nil, createdAt: "2024-01-01T00:00:00Z")]
        let vm = PolymarketViewModel(api: fake)

        await vm.loadAccounts()

        XCTAssertEqual(vm.accounts.count, 1)
        XCTAssertEqual(vm.accounts.first?.walletAddress, "0xabc")
        XCTAssertFalse(vm.isLoading)
    }

    func testLoadAccountsClearsErrorFirst() async {
        let fake = FakeAPI()
        let vm = PolymarketViewModel(api: fake)

        await vm.loadAccounts()

        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - addAccount

    func testAddAccountAppendsAndReloads() async {
        let fake = FakeAPI()
        let vm = PolymarketViewModel(api: fake)

        await vm.addAccount(walletAddress: "0xdeadbeef", label: "Test")

        XCTAssertEqual(vm.accounts.count, 1)
        XCTAssertEqual(vm.accounts.first?.walletAddress, "0xdeadbeef")
    }

    func testAddAccountIgnoresEmptyAddress() async {
        let fake = FakeAPI()
        let vm = PolymarketViewModel(api: fake)

        await vm.addAccount(walletAddress: "", label: nil)

        XCTAssertTrue(vm.accounts.isEmpty)
    }

    func testAddAccountSetsErrorOnFailure() async {
        let fake = FakeAPI()
        fake.addError = Boom()
        let vm = PolymarketViewModel(api: fake)

        await vm.addAccount(walletAddress: "0xabc", label: nil)

        XCTAssertEqual(vm.errorMessage, "boom")
    }

    // MARK: - removeAccount

    func testRemoveAccountOptimisticallyRemoves() async {
        let fake = FakeAPI()
        fake.accounts = [PolymarketAccount(id: 1, walletAddress: "0xaaa", label: nil, lastValueUsd: nil, lastSyncedAt: nil, createdAt: "2024-01-01T00:00:00Z")]
        let vm = PolymarketViewModel(api: fake)
        await vm.loadAccounts()

        await vm.removeAccount(address: "0xaaa")

        XCTAssertTrue(vm.accounts.isEmpty)
    }

    func testRemoveAccountOnErrorReloadsAccounts() async {
        let fake = FakeAPI()
        fake.accounts = [PolymarketAccount(id: 1, walletAddress: "0xbbb", label: nil, lastValueUsd: nil, lastSyncedAt: nil, createdAt: "2024-01-01T00:00:00Z")]
        fake.removeError = Boom()
        let vm = PolymarketViewModel(api: fake)
        await vm.loadAccounts()

        await vm.removeAccount(address: "0xbbb")

        XCTAssertEqual(vm.accounts.count, 1)
        XCTAssertFalse(vm.isLoading)
    }

    // MARK: - sync

    func testSyncSetsLastSyncUpdated() async {
        let fake = FakeAPI()
        fake.accounts = [PolymarketAccount(id: 1, walletAddress: "0xccc", label: nil, lastValueUsd: 50, lastSyncedAt: nil, createdAt: "2024-01-01T00:00:00Z")]
        let vm = PolymarketViewModel(api: fake)
        await vm.loadAccounts()

        await vm.sync()

        XCTAssertEqual(vm.lastSyncUpdated, 1)
        XCTAssertFalse(vm.isSyncing)
    }

    func testSyncSetsErrorOnFailure() async {
        let fake = FakeAPI()
        fake.syncError = Boom()
        let vm = PolymarketViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.errorMessage, "boom")
        XCTAssertFalse(vm.isSyncing)
    }
}
