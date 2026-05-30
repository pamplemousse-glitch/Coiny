import XCTest
@testable import Coiny

@MainActor
final class TruelayerViewModelTests: XCTestCase {
    private final class FakeAPI: TruelayerViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var statusResult: Result<TruelayerStatus, Error> = .success(TruelayerStatus(connected: false))
        private var syncResult: Result<TruelayerSyncResult, Error> = .success(TruelayerSyncResult(balanceUsd: 0))
        private var disconnectError: Error?

        func setStatusResult(_ r: Result<TruelayerStatus, Error>) { lock.lock(); statusResult = r; lock.unlock() }
        func setSyncResult(_ r: Result<TruelayerSyncResult, Error>) { lock.lock(); syncResult = r; lock.unlock() }
        func setDisconnectError(_ e: Error?) { lock.lock(); disconnectError = e; lock.unlock() }

        func getTruelayerStatus() async throws -> TruelayerStatus {
            lock.lock(); let r = statusResult; lock.unlock()
            return try r.get()
        }

        func syncTruelayer() async throws -> TruelayerSyncResult {
            lock.lock(); let r = syncResult; lock.unlock()
            return try r.get()
        }

        func disconnectTruelayer() async throws {
            lock.lock(); let e = disconnectError; lock.unlock()
            if let e { throw e }
        }
    }

    func testStartsDisconnected() {
        let vm = TruelayerViewModel(api: FakeAPI())
        XCTAssertFalse(vm.isConnected)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
    }

    func testLoadStatusSetsConnectedTrue() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(TruelayerStatus(connected: true)))
        let vm = TruelayerViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertTrue(vm.isConnected)
        XCTAssertFalse(vm.isLoading)
    }

    func testLoadStatusOnErrorSetsDisconnected() async {
        struct Boom: Error {}
        let fake = FakeAPI()
        fake.setStatusResult(.failure(Boom()))
        let vm = TruelayerViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertFalse(vm.isConnected)
        XCTAssertFalse(vm.isLoading)
    }

    func testSyncSetsErrorOnFailure() async {
        struct Boom: LocalizedError { var errorDescription: String? { "sync failed" } }
        let fake = FakeAPI()
        fake.setSyncResult(.failure(Boom()))
        let vm = TruelayerViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.errorMessage, "sync failed")
    }

    func testDisconnectClearsConnected() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(TruelayerStatus(connected: true)))
        let vm = TruelayerViewModel(api: fake)
        await vm.loadStatus()
        XCTAssertTrue(vm.isConnected)

        await vm.disconnect()

        XCTAssertFalse(vm.isConnected)
    }
}
