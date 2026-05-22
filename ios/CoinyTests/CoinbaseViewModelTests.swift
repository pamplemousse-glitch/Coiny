import XCTest
@testable import Coiny

@MainActor
final class CoinbaseViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: CoinbaseViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var statusQueue: [Result<CoinbaseStatus, Error>] = []
        private var connectResult: Result<EmptyResponse, Error> = .success(EmptyResponse())
        private var disconnectError: Error?
        private var syncQueue: [Result<SyncResult, Error>] = []

        func enqueueStatus(_ result: Result<CoinbaseStatus, Error>) {
            lock.lock(); defer { lock.unlock() }
            statusQueue.append(result)
        }

        func setConnectResult(_ result: Result<EmptyResponse, Error>) {
            lock.lock(); defer { lock.unlock() }
            connectResult = result
        }

        func setDisconnectError(_ error: Error?) {
            lock.lock(); defer { lock.unlock() }
            disconnectError = error
        }

        func enqueueSync(_ result: Result<SyncResult, Error>) {
            lock.lock(); defer { lock.unlock() }
            syncQueue.append(result)
        }

        func getCoinbaseStatus() async throws -> CoinbaseStatus {
            lock.lock()
            guard !statusQueue.isEmpty else {
                lock.unlock()
                return CoinbaseStatus(connected: false, mode: nil)
            }
            let r = statusQueue.removeFirst()
            lock.unlock()
            return try r.get()
        }

        func connectCoinbaseDevKey() async throws -> EmptyResponse {
            lock.lock()
            let r = connectResult
            lock.unlock()
            return try r.get()
        }

        func disconnectCoinbase() async throws {
            lock.lock()
            let e = disconnectError
            lock.unlock()
            if let e { throw e }
        }

        func syncCoinbase() async throws -> SyncResult {
            lock.lock()
            guard !syncQueue.isEmpty else {
                lock.unlock()
                return SyncResult(reacted: 0)
            }
            let r = syncQueue.removeFirst()
            lock.unlock()
            return try r.get()
        }
    }

    // MARK: - Status loading

    func testStartsWithNilStatus() {
        let vm = CoinbaseViewModel(api: FakeAPI())
        XCTAssertNil(vm.status)
        XCTAssertFalse(vm.isSyncing)
        XCTAssertNil(vm.errorMessage)
    }

    func testLoadStatusSetsConnectedStatus() async {
        let fake = FakeAPI()
        fake.enqueueStatus(.success(CoinbaseStatus(connected: true, mode: "dev_key")))
        let vm = CoinbaseViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertEqual(vm.status?.connected, true)
        XCTAssertEqual(vm.status?.mode, "dev_key")
        XCTAssertNil(vm.errorMessage)
    }

    func testLoadStatusOnErrorSetsErrorMessage() async {
        let fake = FakeAPI()
        struct Boom: LocalizedError { var errorDescription: String? { "network offline" } }
        fake.enqueueStatus(.failure(Boom()))
        let vm = CoinbaseViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertNil(vm.status)
        XCTAssertEqual(vm.errorMessage, "network offline")
    }

    // MARK: - Connect

    func testConnectDevKeyCallsLoadStatusAfterSuccess() async {
        let fake = FakeAPI()
        // connect succeeds, then status returns connected=true
        fake.setConnectResult(.success(EmptyResponse()))
        fake.enqueueStatus(.success(CoinbaseStatus(connected: true, mode: "dev_key")))
        let vm = CoinbaseViewModel(api: fake)

        await vm.connectDevKey()

        XCTAssertEqual(vm.status?.connected, true)
        XCTAssertNil(vm.errorMessage)
    }

    func testConnectDevKeyOnErrorSetsErrorMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "connect failed" } }
        let fake = FakeAPI()
        fake.setConnectResult(.failure(Boom()))
        let vm = CoinbaseViewModel(api: fake)

        await vm.connectDevKey()

        XCTAssertEqual(vm.errorMessage, "connect failed")
    }

    // MARK: - Sync

    func testSyncSetsLastSyncReacted() async {
        let fake = FakeAPI()
        fake.enqueueSync(.success(SyncResult(reacted: 5)))
        let vm = CoinbaseViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastSyncReacted, 5)
        XCTAssertFalse(vm.isSyncing)
        XCTAssertNil(vm.errorMessage)
    }

    func testSyncOnErrorSetsErrorMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "sync failed" } }
        let fake = FakeAPI()
        fake.enqueueSync(.failure(Boom()))
        let vm = CoinbaseViewModel(api: fake)

        await vm.sync()

        XCTAssertNil(vm.lastSyncReacted)
        XCTAssertEqual(vm.errorMessage, "sync failed")
    }

    // MARK: - Disconnect

    func testDisconnectOnErrorSetsErrorMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "disconnect failed" } }
        let fake = FakeAPI()
        fake.setDisconnectError(Boom())
        let vm = CoinbaseViewModel(api: fake)

        await vm.disconnect()

        XCTAssertEqual(vm.errorMessage, "disconnect failed")
    }
}
