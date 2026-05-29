import XCTest
@testable import Coiny

@MainActor
final class SteamViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: SteamViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var accounts: [SteamAccount] = []
        private var addError: Error?
        private var removeError: Error?
        private var syncResult: Result<SteamSyncResult, Error> = .success(SteamSyncResult(synced: 0, errors: []))

        func setAccounts(_ a: [SteamAccount]) { lock.lock(); accounts = a; lock.unlock() }
        func setAddError(_ e: Error?) { lock.lock(); addError = e; lock.unlock() }
        func setRemoveError(_ e: Error?) { lock.lock(); removeError = e; lock.unlock() }
        func setSyncResult(_ r: Result<SteamSyncResult, Error>) { lock.lock(); syncResult = r; lock.unlock() }

        func getSteamAccounts() async throws -> [SteamAccount] {
            lock.lock(); let a = accounts; lock.unlock()
            return a
        }

        func addSteamAccount(steamId64: String, label: String?) async throws {
            lock.lock(); let e = addError; lock.unlock()
            if let e { throw e }
        }

        func removeSteamAccount(id: Int) async throws {
            lock.lock(); let e = removeError; lock.unlock()
            if let e { throw e }
        }

        func syncSteam() async throws -> SteamSyncResult {
            lock.lock(); let r = syncResult; lock.unlock()
            return try r.get()
        }
    }

    private func makeAccount(id: Int = 1, steamId: String = "76561198012345678", label: String? = nil, value: Double? = nil) -> SteamAccount {
        SteamAccount(id: id, steamId64: steamId, label: label, lastPortfolioUsd: value, lastSyncedAt: nil, createdAt: "2026-01-01T00:00:00Z")
    }

    // MARK: - Initial state

    func testStartsEmpty() {
        let vm = SteamViewModel(api: FakeAPI())
        XCTAssertTrue(vm.accounts.isEmpty)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
        XCTAssertNil(vm.lastSynced)
    }

    // MARK: - Load

    func testLoadAccountsPopulatesAccounts() async {
        let fake = FakeAPI()
        fake.setAccounts([makeAccount(id: 1, steamId: "76561198000000001")])
        let vm = SteamViewModel(api: fake)

        await vm.loadAccounts()

        XCTAssertEqual(vm.accounts.count, 1)
        XCTAssertEqual(vm.accounts.first?.steamId64, "76561198000000001")
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Add

    func testAddAccountWithEmptySteamIdDoesNothing() async {
        let vm = SteamViewModel(api: FakeAPI())

        await vm.addAccount(steamId64: "", label: nil)

        XCTAssertTrue(vm.accounts.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testAddAccountSucceeds() async {
        let vm = SteamViewModel(api: FakeAPI())

        await vm.addAccount(steamId64: "76561198000000001", label: "Main")

        XCTAssertNil(vm.errorMessage)
    }

    func testAddAccountOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "add failed" } }
        let fake = FakeAPI()
        fake.setAddError(Boom())
        let vm = SteamViewModel(api: fake)

        await vm.addAccount(steamId64: "76561198000000001", label: nil)

        XCTAssertEqual(vm.errorMessage, "add failed")
    }

    // MARK: - Remove

    func testRemoveAccountOptimisticallyRemovesLocally() async {
        let fake = FakeAPI()
        fake.setAccounts([makeAccount(id: 1)])
        let vm = SteamViewModel(api: fake)
        await vm.loadAccounts()

        let account = vm.accounts[0]
        await vm.removeAccount(account)

        XCTAssertTrue(vm.accounts.isEmpty)
    }

    func testRemoveAccountOnErrorReloadsAccounts() async {
        struct Boom: LocalizedError { var errorDescription: String? { "remove failed" } }
        let fake = FakeAPI()
        fake.setAccounts([makeAccount(id: 1)])
        let vm = SteamViewModel(api: fake)
        await vm.loadAccounts()
        XCTAssertEqual(vm.accounts.count, 1)

        fake.setRemoveError(Boom())
        let account = vm.accounts[0]
        await vm.removeAccount(account)

        XCTAssertEqual(vm.accounts.count, 1)
        XCTAssertFalse(vm.isLoading)
    }

    // MARK: - Sync

    func testSyncSetsLastSynced() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(SteamSyncResult(synced: 2, errors: [])))
        let vm = SteamViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastSynced, 2)
        XCTAssertNil(vm.errorMessage)
    }

    func testSyncOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "sync failed" } }
        let fake = FakeAPI()
        fake.setSyncResult(.failure(Boom()))
        let vm = SteamViewModel(api: fake)

        await vm.sync()

        XCTAssertNil(vm.lastSynced)
        XCTAssertEqual(vm.errorMessage, "sync failed")
    }
}
