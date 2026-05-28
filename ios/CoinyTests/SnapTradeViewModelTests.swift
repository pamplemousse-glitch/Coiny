import XCTest
@testable import Coiny

@MainActor
final class SnapTradeViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: SnapTradeViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var connectResult: Result<SnapTradeConnectResult, Error> = .success(SnapTradeConnectResult(redirectUrl: "https://snaptrade.test"))
        private var disconnectError: Error?
        private var syncResult: Result<SnapTradeSyncResult, Error> = .success(SnapTradeSyncResult(total: 0, accounts: 0))

        func setConnectResult(_ r: Result<SnapTradeConnectResult, Error>) { lock.lock(); connectResult = r; lock.unlock() }
        func setDisconnectError(_ e: Error?) { lock.lock(); disconnectError = e; lock.unlock() }
        func setSyncResult(_ r: Result<SnapTradeSyncResult, Error>) { lock.lock(); syncResult = r; lock.unlock() }

        func connectSnapTrade() async throws -> SnapTradeConnectResult {
            lock.lock(); let r = connectResult; lock.unlock()
            return try r.get()
        }
        func disconnectSnapTrade() async throws {
            lock.lock(); let e = disconnectError; lock.unlock()
            if let e { throw e }
        }
        func syncSnapTrade() async throws -> SnapTradeSyncResult {
            lock.lock(); let r = syncResult; lock.unlock()
            return try r.get()
        }
    }

    // MARK: - Initial state

    func testStartsIdle() {
        let vm = SnapTradeViewModel(api: FakeAPI())
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
        XCTAssertNil(vm.redirectUrl)
        XCTAssertNil(vm.lastTotal)
    }

    // MARK: - Connect

    func testConnectSetsRedirectUrl() async {
        let fake = FakeAPI()
        fake.setConnectResult(.success(SnapTradeConnectResult(redirectUrl: "https://snaptrade.test/auth")))
        let vm = SnapTradeViewModel(api: fake)

        await vm.connect()

        XCTAssertEqual(vm.redirectUrl, "https://snaptrade.test/auth")
        XCTAssertNil(vm.errorMessage)
    }

    func testConnectOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "connect failed" } }
        let fake = FakeAPI()
        fake.setConnectResult(.failure(Boom()))
        let vm = SnapTradeViewModel(api: fake)

        await vm.connect()

        XCTAssertNil(vm.redirectUrl)
        XCTAssertEqual(vm.errorMessage, "connect failed")
    }

    // MARK: - Disconnect

    func testDisconnectClearsRedirectUrl() async {
        let fake = FakeAPI()
        let vm = SnapTradeViewModel(api: fake)
        await vm.connect()

        await vm.disconnect()

        XCTAssertNil(vm.redirectUrl)
        XCTAssertNil(vm.errorMessage)
    }

    func testDisconnectOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "disconnect failed" } }
        let fake = FakeAPI()
        fake.setDisconnectError(Boom())
        let vm = SnapTradeViewModel(api: fake)

        await vm.disconnect()

        XCTAssertEqual(vm.errorMessage, "disconnect failed")
    }

    // MARK: - Sync

    func testSyncSetsLastTotal() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(SnapTradeSyncResult(total: 9876.54, accounts: 2)))
        let vm = SnapTradeViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastTotal, 9876.54)
        XCTAssertNil(vm.errorMessage)
    }

    func testSyncOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "sync error" } }
        let fake = FakeAPI()
        fake.setSyncResult(.failure(Boom()))
        let vm = SnapTradeViewModel(api: fake)

        await vm.sync()

        XCTAssertNil(vm.lastTotal)
        XCTAssertEqual(vm.errorMessage, "sync error")
    }
}
