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
        private var positionsResult: Result<KalshiPositionsResponse, Error> = .success(
            KalshiPositionsResponse(cashUsd: 0, positionsUsd: 0, totalUsd: 0, markets: [])
        )

        func setPositionsResult(_ r: Result<KalshiPositionsResponse, Error>) {
            lock.lock(); positionsResult = r; lock.unlock()
        }

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
        func getKalshiPositions() async throws -> KalshiPositionsResponse {
            lock.lock(); let r = positionsResult; lock.unlock()
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

    // MARK: - Positions

    private func connectedVM(_ fake: FakeAPI) async -> KalshiViewModel {
        fake.setStatusResult(.success(KalshiStatusResponse(connected: true)))
        let vm = KalshiViewModel(api: fake)
        await vm.loadStatus()
        return vm
    }

    func testLoadPositionsKeepsCashAndPositionsSeparate() async {
        // The whole point of the split: a $1,500 total means something
        // different if it is all cash than if it is all open contracts.
        let fake = FakeAPI()
        fake.setPositionsResult(.success(KalshiPositionsResponse(
            cashUsd: 1000, positionsUsd: 500, totalUsd: 1500,
            markets: [KalshiMarketPosition(
                ticker: "KXPRES-28-DEM", contracts: 150, exposureUsd: 82.5,
                totalTradedUsd: 90, realizedPnlUsd: -7.5, feesPaidUsd: 0.35
            )]
        )))
        let vm = await connectedVM(fake)

        await vm.loadPositions()

        XCTAssertEqual(vm.cashUsd, 1000)
        XCTAssertEqual(vm.positionsUsd, 500)
        XCTAssertEqual(vm.lastPortfolioUsd, 1500)
        XCTAssertEqual(vm.markets.map(\.ticker), ["KXPRES-28-DEM"])
    }

    func testNegativeContractsAreKept() async {
        // Negative means NO contracts, which is a real position and not an
        // error to be clamped away.
        let fake = FakeAPI()
        fake.setPositionsResult(.success(KalshiPositionsResponse(
            cashUsd: 0, positionsUsd: 12, totalUsd: 12,
            markets: [KalshiMarketPosition(
                ticker: "X", contracts: -40, exposureUsd: 12,
                totalTradedUsd: 12, realizedPnlUsd: 0, feesPaidUsd: 0
            )]
        )))
        let vm = await connectedVM(fake)

        await vm.loadPositions()

        XCTAssertEqual(vm.markets.first?.contracts, -40)
    }

    func testLoadPositionsDoesNothingWhenDisconnected() async {
        let fake = FakeAPI()
        let vm = KalshiViewModel(api: fake)

        await vm.loadPositions()

        XCTAssertTrue(vm.markets.isEmpty)
        XCTAssertFalse(vm.hasLoadedPositions)
    }

    func testLoadPositionsSurfacesFailure() async {
        struct Boom: Error {}
        let fake = FakeAPI()
        fake.setPositionsResult(.failure(Boom()))
        let vm = await connectedVM(fake)

        await vm.loadPositions()

        XCTAssertNotNil(vm.errorMessage)
        XCTAssertFalse(vm.hasLoadedPositions)
    }

    func testDisconnectClearsPositions() async {
        let fake = FakeAPI()
        fake.setPositionsResult(.success(KalshiPositionsResponse(
            cashUsd: 10, positionsUsd: 20, totalUsd: 30,
            markets: [KalshiMarketPosition(
                ticker: "X", contracts: 1, exposureUsd: 20,
                totalTradedUsd: 20, realizedPnlUsd: 0, feesPaidUsd: 0
            )]
        )))
        let vm = await connectedVM(fake)
        await vm.loadPositions()

        await vm.disconnect()

        XCTAssertTrue(vm.markets.isEmpty)
        XCTAssertNil(vm.cashUsd)
        XCTAssertFalse(vm.hasLoadedPositions)
    }

    func testContractsLabelNamesTheSide() {
        // Rendering "-40 contracts" would read as a debt rather than a bet
        // against the outcome.
        XCTAssertEqual(KalshiInlineView.contractsLabel(150), "150 YES")
        XCTAssertEqual(KalshiInlineView.contractsLabel(-40), "40 NO")
    }
}
