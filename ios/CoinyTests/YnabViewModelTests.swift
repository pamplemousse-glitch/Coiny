import XCTest
@testable import Coiny

@MainActor
final class YnabViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: YnabViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var connectError: Error?
        private var disconnectError: Error?
        private var syncResult: Result<YnabSyncResult, Error> = .success(YnabSyncResult(total: 0))

        func setConnectError(_ e: Error?) { lock.lock(); connectError = e; lock.unlock() }
        func setDisconnectError(_ e: Error?) { lock.lock(); disconnectError = e; lock.unlock() }
        func setSyncResult(_ r: Result<YnabSyncResult, Error>) { lock.lock(); syncResult = r; lock.unlock() }

        func connectYnab(apiKey: String) async throws {
            lock.lock(); let e = connectError; lock.unlock()
            if let e { throw e }
        }
        func disconnectYnab() async throws {
            lock.lock(); let e = disconnectError; lock.unlock()
            if let e { throw e }
        }
        func syncYnab() async throws -> YnabSyncResult {
            lock.lock(); let r = syncResult; lock.unlock()
            return try r.get()
        }
    }

    // MARK: - Initial state

    func testStartsIdle() {
        let vm = YnabViewModel(api: FakeAPI())
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
        XCTAssertNil(vm.lastTotal)
    }

    // MARK: - Connect

    func testConnectWithEmptyKeyDoesNothing() async {
        let fake = FakeAPI()
        let vm = YnabViewModel(api: fake)

        await vm.connect(apiKey: "")

        XCTAssertNil(vm.errorMessage)
        XCTAssertFalse(vm.isLoading)
    }

    func testConnectSucceeds() async {
        let fake = FakeAPI()
        let vm = YnabViewModel(api: fake)

        await vm.connect(apiKey: "my-ynab-token")

        XCTAssertNil(vm.errorMessage)
        XCTAssertFalse(vm.isLoading)
    }

    func testConnectOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "connect failed" } }
        let fake = FakeAPI()
        fake.setConnectError(Boom())
        let vm = YnabViewModel(api: fake)

        await vm.connect(apiKey: "my-ynab-token")

        XCTAssertEqual(vm.errorMessage, "connect failed")
    }

    // MARK: - Disconnect

    func testDisconnectSucceeds() async {
        let fake = FakeAPI()
        let vm = YnabViewModel(api: fake)

        await vm.disconnect()

        XCTAssertNil(vm.errorMessage)
        XCTAssertFalse(vm.isLoading)
    }

    func testDisconnectOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "disconnect failed" } }
        let fake = FakeAPI()
        fake.setDisconnectError(Boom())
        let vm = YnabViewModel(api: fake)

        await vm.disconnect()

        XCTAssertEqual(vm.errorMessage, "disconnect failed")
    }

    // MARK: - Sync

    func testSyncSetsLastTotal() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(YnabSyncResult(total: 5500)))
        let vm = YnabViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastTotal, 5500)
        XCTAssertNil(vm.errorMessage)
    }

    func testSyncOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "sync error" } }
        let fake = FakeAPI()
        fake.setSyncResult(.failure(Boom()))
        let vm = YnabViewModel(api: fake)

        await vm.sync()

        XCTAssertNil(vm.lastTotal)
        XCTAssertEqual(vm.errorMessage, "sync error")
    }
}
