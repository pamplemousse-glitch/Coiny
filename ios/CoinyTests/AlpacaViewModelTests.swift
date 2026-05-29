import XCTest
@testable import Coiny

@MainActor
final class AlpacaViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: AlpacaViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var statusResult: Result<AlpacaStatus, Error> = .failure(NSError(domain: "notfound", code: 404))
        private var connectError: Error?
        private var syncResult: Result<AlpacaSyncResult, Error> = .success(AlpacaSyncResult(equity: 0))
        private var disconnectError: Error?

        func setStatusResult(_ r: Result<AlpacaStatus, Error>) { lock.lock(); statusResult = r; lock.unlock() }
        func setConnectError(_ e: Error?) { lock.lock(); connectError = e; lock.unlock() }
        func setSyncResult(_ r: Result<AlpacaSyncResult, Error>) { lock.lock(); syncResult = r; lock.unlock() }
        func setDisconnectError(_ e: Error?) { lock.lock(); disconnectError = e; lock.unlock() }

        func getAlpacaStatus() async throws -> AlpacaStatus {
            lock.lock(); let r = statusResult; lock.unlock()
            return try r.get()
        }

        func connectAlpaca(apiKeyId: String, apiSecretKey: String, env: String) async throws {
            lock.lock(); let e = connectError; lock.unlock()
            if let e { throw e }
        }

        func syncAlpaca() async throws -> AlpacaSyncResult {
            lock.lock(); let r = syncResult; lock.unlock()
            return try r.get()
        }

        func disconnectAlpaca() async throws {
            lock.lock(); let e = disconnectError; lock.unlock()
            if let e { throw e }
        }
    }

    private func makeStatus(env: String = "paper", equity: Double? = 5000) -> AlpacaStatus {
        AlpacaStatus(env: env, lastEquityUsd: equity, lastSyncedAt: nil)
    }

    // MARK: - Initial state

    func testStartsIdle() {
        let vm = AlpacaViewModel(api: FakeAPI())
        XCTAssertFalse(vm.isConnected)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Load

    func testLoadStatusWhenConnectedSetsStatus() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(makeStatus(equity: 12345)))
        let vm = AlpacaViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertTrue(vm.isConnected)
        XCTAssertEqual(vm.lastEquityUsd, 12345)
        XCTAssertFalse(vm.isLoading)
    }

    func testLoadStatusWhenNotConnectedLeavesNil() async {
        let fake = FakeAPI()
        // Default status is a 404 failure — simulates not connected
        let vm = AlpacaViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertFalse(vm.isConnected)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Connect

    func testConnectWithEmptyKeyDoesNothing() async {
        let vm = AlpacaViewModel(api: FakeAPI())

        await vm.connect(apiKeyId: "", apiSecretKey: "secret", env: "paper")

        XCTAssertFalse(vm.isConnected)
        XCTAssertNil(vm.errorMessage)
    }

    func testConnectWithEmptySecretDoesNothing() async {
        let vm = AlpacaViewModel(api: FakeAPI())

        await vm.connect(apiKeyId: "key", apiSecretKey: "", env: "paper")

        XCTAssertFalse(vm.isConnected)
        XCTAssertNil(vm.errorMessage)
    }

    func testConnectSucceeds() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(makeStatus()))
        let vm = AlpacaViewModel(api: fake)

        await vm.connect(apiKeyId: "mykey", apiSecretKey: "mysecret", env: "paper")

        XCTAssertNil(vm.errorMessage)
        XCTAssertTrue(vm.isConnected)
    }

    func testConnectOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "connect failed" } }
        let fake = FakeAPI()
        fake.setConnectError(Boom())
        let vm = AlpacaViewModel(api: fake)

        await vm.connect(apiKeyId: "key", apiSecretKey: "secret", env: "paper")

        XCTAssertEqual(vm.errorMessage, "connect failed")
    }

    // MARK: - Sync

    func testSyncUpdatesEquity() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(makeStatus(equity: 1000)))
        fake.setSyncResult(.success(AlpacaSyncResult(equity: 9999)))
        let vm = AlpacaViewModel(api: fake)
        await vm.loadStatus()

        await vm.sync()

        XCTAssertEqual(vm.lastEquityUsd, 9999)
        XCTAssertNil(vm.errorMessage)
    }

    func testSyncOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "sync failed" } }
        let fake = FakeAPI()
        fake.setSyncResult(.failure(Boom()))
        let vm = AlpacaViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.errorMessage, "sync failed")
    }

    // MARK: - Disconnect

    func testDisconnectClearsStatus() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(makeStatus()))
        let vm = AlpacaViewModel(api: fake)
        await vm.loadStatus()

        await vm.disconnect()

        XCTAssertFalse(vm.isConnected)
        XCTAssertNil(vm.errorMessage)
    }

    func testDisconnectOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "disconnect failed" } }
        let fake = FakeAPI()
        fake.setDisconnectError(Boom())
        let vm = AlpacaViewModel(api: fake)

        await vm.disconnect()

        XCTAssertEqual(vm.errorMessage, "disconnect failed")
    }
}
