import XCTest
@testable import Coiny

@MainActor
final class CoinbaseViewModelAdditionalTests: XCTestCase {

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

    // MARK: - isLoading terminal states

    func testIsLoadingFalseAfterSuccessfulLoad() async {
        let fake = FakeAPI()
        fake.enqueueStatus(.success(CoinbaseStatus(connected: true, mode: nil)))
        let vm = CoinbaseViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertFalse(vm.isLoading)
    }

    func testIsLoadingFalseAfterFailedLoad() async {
        struct Boom: LocalizedError { var errorDescription: String? { "load failed" } }
        let fake = FakeAPI()
        fake.enqueueStatus(.failure(Boom()))
        let vm = CoinbaseViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertFalse(vm.isLoading)
        XCTAssertEqual(vm.errorMessage, "load failed")
    }

    // MARK: - isSyncing terminal states

    func testIsSyncingFalseAfterSuccessfulSync() async {
        let fake = FakeAPI()
        fake.enqueueSync(.success(SyncResult(reacted: 2)))
        let vm = CoinbaseViewModel(api: fake)

        await vm.sync()

        XCTAssertFalse(vm.isSyncing)
        XCTAssertEqual(vm.lastSyncReacted, 2)
    }

    func testIsSyncingFalseAfterSyncError() async {
        struct Boom: LocalizedError { var errorDescription: String? { "sync error" } }
        let fake = FakeAPI()
        fake.enqueueSync(.failure(Boom()))
        let vm = CoinbaseViewModel(api: fake)

        await vm.sync()

        XCTAssertFalse(vm.isSyncing)
        XCTAssertEqual(vm.errorMessage, "sync error")
    }

    // MARK: - connectDevKey error

    func testConnectDevKeyErrorSetsErrorMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "connect failed" } }
        let fake = FakeAPI()
        fake.setConnectResult(.failure(Boom()))
        let vm = CoinbaseViewModel(api: fake)

        await vm.connectDevKey()

        XCTAssertEqual(vm.errorMessage, "connect failed")
    }

    // MARK: - disconnect error

    func testDisconnectErrorSetsErrorMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "disconnect error" } }
        let fake = FakeAPI()
        fake.setDisconnectError(Boom())
        let vm = CoinbaseViewModel(api: fake)

        await vm.disconnect()

        XCTAssertEqual(vm.errorMessage, "disconnect error")
    }

    // MARK: - errorMessage cleared before next request

    func testLoadStatusClearsErrorMessageBeforeRequest() async {
        struct Boom: LocalizedError { var errorDescription: String? { "first error" } }
        let fake = FakeAPI()
        // First load: fail to set errorMessage.
        fake.enqueueStatus(.failure(Boom()))
        let vm = CoinbaseViewModel(api: fake)
        await vm.loadStatus()
        XCTAssertEqual(vm.errorMessage, "first error")

        // Second load: succeed — errorMessage must be nil after.
        fake.enqueueStatus(.success(CoinbaseStatus(connected: true, mode: "dev_key")))
        await vm.loadStatus()

        XCTAssertNil(vm.errorMessage)
        XCTAssertEqual(vm.status?.connected, true)
    }
}
