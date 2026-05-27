import XCTest
@testable import Coiny

@MainActor
final class KrakenViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: KrakenViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var connectError: Error?
        private var disconnectError: Error?
        private var syncResult: Result<KrakenSyncResult, Error> = .success(KrakenSyncResult(total: 0))

        func setConnectError(_ e: Error?) { lock.lock(); connectError = e; lock.unlock() }
        func setDisconnectError(_ e: Error?) { lock.lock(); disconnectError = e; lock.unlock() }
        func setSyncResult(_ r: Result<KrakenSyncResult, Error>) { lock.lock(); syncResult = r; lock.unlock() }

        func connectKraken(apiKey: String, privateKey: String) async throws {
            lock.lock(); let e = connectError; lock.unlock()
            if let e { throw e }
        }
        func disconnectKraken() async throws {
            lock.lock(); let e = disconnectError; lock.unlock()
            if let e { throw e }
        }
        func syncKraken() async throws -> KrakenSyncResult {
            lock.lock(); let r = syncResult; lock.unlock()
            return try r.get()
        }
    }

    // MARK: - Initial state

    func testStartsIdle() {
        let vm = KrakenViewModel(api: FakeAPI())
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
        XCTAssertNil(vm.lastTotal)
    }

    // MARK: - Connect

    func testConnectWithEmptyKeyDoesNothing() async {
        let fake = FakeAPI()
        let vm = KrakenViewModel(api: fake)

        await vm.connect(apiKey: "", privateKey: "secret")

        XCTAssertNil(vm.errorMessage)
        XCTAssertFalse(vm.isLoading)
    }

    func testConnectWithEmptyPrivateKeyDoesNothing() async {
        let fake = FakeAPI()
        let vm = KrakenViewModel(api: fake)

        await vm.connect(apiKey: "key", privateKey: "")

        XCTAssertNil(vm.errorMessage)
        XCTAssertFalse(vm.isLoading)
    }

    func testConnectSucceeds() async {
        let fake = FakeAPI()
        let vm = KrakenViewModel(api: fake)

        await vm.connect(apiKey: "mykey", privateKey: "mysecret")

        XCTAssertNil(vm.errorMessage)
        XCTAssertFalse(vm.isLoading)
    }

    func testConnectOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "connect failed" } }
        let fake = FakeAPI()
        fake.setConnectError(Boom())
        let vm = KrakenViewModel(api: fake)

        await vm.connect(apiKey: "mykey", privateKey: "mysecret")

        XCTAssertEqual(vm.errorMessage, "connect failed")
    }

    // MARK: - Disconnect

    func testDisconnectSucceeds() async {
        let fake = FakeAPI()
        let vm = KrakenViewModel(api: fake)

        await vm.disconnect()

        XCTAssertNil(vm.errorMessage)
        XCTAssertFalse(vm.isLoading)
    }

    func testDisconnectOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "disconnect failed" } }
        let fake = FakeAPI()
        fake.setDisconnectError(Boom())
        let vm = KrakenViewModel(api: fake)

        await vm.disconnect()

        XCTAssertEqual(vm.errorMessage, "disconnect failed")
    }

    // MARK: - Sync

    func testSyncSetsLastTotal() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(KrakenSyncResult(total: 1234.56)))
        let vm = KrakenViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastTotal, 1234.56)
        XCTAssertNil(vm.errorMessage)
        XCTAssertFalse(vm.isLoading)
    }

    func testSyncOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "sync error" } }
        let fake = FakeAPI()
        fake.setSyncResult(.failure(Boom()))
        let vm = KrakenViewModel(api: fake)

        await vm.sync()

        XCTAssertNil(vm.lastTotal)
        XCTAssertEqual(vm.errorMessage, "sync error")
    }
}
