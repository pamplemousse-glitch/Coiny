import XCTest
@testable import Coiny

@MainActor
final class KalshiViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: KalshiViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var statusResult: Result<KalshiStatusResponse, Error> = .success(KalshiStatusResponse(connected: false))
        private var connectError: Error?
        private var disconnectError: Error?
        private var syncResult: Result<KalshiSyncResult, Error> = .success(KalshiSyncResult(portfolioUsd: 0))

        func setStatusResult(_ r: Result<KalshiStatusResponse, Error>) { lock.lock(); statusResult = r; lock.unlock() }
        func setConnectError(_ e: Error?) { lock.lock(); connectError = e; lock.unlock() }
        func setDisconnectError(_ e: Error?) { lock.lock(); disconnectError = e; lock.unlock() }
        func setSyncResult(_ r: Result<KalshiSyncResult, Error>) { lock.lock(); syncResult = r; lock.unlock() }

        func getKalshiStatus() async throws -> KalshiStatusResponse {
            lock.lock(); let r = statusResult; lock.unlock()
            return try r.get()
        }
        func connectKalshi(keyId: String, privateKeyBase64: String) async throws {
            lock.lock(); let e = connectError; lock.unlock()
            if let e { throw e }
        }
        func disconnectKalshi() async throws {
            lock.lock(); let e = disconnectError; lock.unlock()
            if let e { throw e }
        }
        func syncKalshi() async throws -> KalshiSyncResult {
            lock.lock(); let r = syncResult; lock.unlock()
            return try r.get()
        }
    }

    // MARK: - Initial state

    func testStartsDisconnected() {
        let vm = KalshiViewModel(api: FakeAPI())
        XCTAssertFalse(vm.isConnected)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Load status

    func testLoadStatusSetsConnected() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(KalshiStatusResponse(connected: true)))
        let vm = KalshiViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertTrue(vm.isConnected)
        XCTAssertNil(vm.errorMessage)
    }

    func testLoadStatusOnErrorStaysDisconnected() async {
        struct Boom: Error {}
        let fake = FakeAPI()
        fake.setStatusResult(.failure(Boom()))
        let vm = KalshiViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertFalse(vm.isConnected)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Connect

    func testConnectWithEmptyKeyDoesNothing() async {
        let fake = FakeAPI()
        let vm = KalshiViewModel(api: fake)

        await vm.connect(keyId: "", privateKeyBase64: "abc")

        XCTAssertNil(vm.errorMessage)
    }

    func testConnectOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "connect failed" } }
        let fake = FakeAPI()
        fake.setConnectError(Boom())
        let vm = KalshiViewModel(api: fake)

        await vm.connect(keyId: "kid", privateKeyBase64: "base64key")

        XCTAssertEqual(vm.errorMessage, "connect failed")
    }

    // MARK: - Disconnect

    func testDisconnectSetsNotConnected() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(KalshiStatusResponse(connected: true)))
        let vm = KalshiViewModel(api: fake)
        await vm.loadStatus()

        await vm.disconnect()

        XCTAssertFalse(vm.isConnected)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Sync

    func testSyncSetsPortfolioUsd() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(KalshiSyncResult(portfolioUsd: 250.75)))
        let vm = KalshiViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastPortfolioUsd, 250.75)
        XCTAssertNil(vm.errorMessage)
    }

    func testSyncOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "sync error" } }
        let fake = FakeAPI()
        fake.setSyncResult(.failure(Boom()))
        let vm = KalshiViewModel(api: fake)

        await vm.sync()

        XCTAssertNil(vm.lastPortfolioUsd)
        XCTAssertEqual(vm.errorMessage, "sync error")
    }
}
