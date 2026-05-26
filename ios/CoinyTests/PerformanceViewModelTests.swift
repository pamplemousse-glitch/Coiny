import XCTest
@testable import Coiny

@MainActor
final class PerformanceViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: PerformanceViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var coinbaseResult: Result<CoinbasePerformance, Error> = .success(
            CoinbasePerformance(unrealizedPnl: nil, totalCash: nil, totalCrypto: nil)
        )
        private var pnlResult: Result<ZerionPnl, Error> = .success(
            ZerionPnl(unrealizedGain: 0, realizedGain: 0, totalGain: 0)
        )
        private var defiResult: Result<DefiPositionsResponse, Error> = .success(
            DefiPositionsResponse(positions: [])
        )

        func setCoinbaseResult(_ result: Result<CoinbasePerformance, Error>) {
            lock.lock(); defer { lock.unlock() }
            coinbaseResult = result
        }

        func setPnlResult(_ result: Result<ZerionPnl, Error>) {
            lock.lock(); defer { lock.unlock() }
            pnlResult = result
        }

        func setDefiResult(_ result: Result<DefiPositionsResponse, Error>) {
            lock.lock(); defer { lock.unlock() }
            defiResult = result
        }

        func getCoinbasePerformance() async throws -> CoinbasePerformance {
            lock.lock(); let r = coinbaseResult; lock.unlock()
            return try r.get()
        }

        func getZerionPnl() async throws -> ZerionPnl {
            lock.lock(); let r = pnlResult; lock.unlock()
            return try r.get()
        }

        func getDefiPositions() async throws -> DefiPositionsResponse {
            lock.lock(); let r = defiResult; lock.unlock()
            return try r.get()
        }
    }

    // MARK: - Initial state

    func testStartsWithNilData() {
        let vm = PerformanceViewModel(api: FakeAPI())
        XCTAssertNil(vm.coinbasePerformance)
        XCTAssertNil(vm.zerionPnl)
        XCTAssertTrue(vm.defiPositions.isEmpty)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Load

    func testLoadPopulatesCoinbasePerformance() async {
        let fake = FakeAPI()
        fake.setCoinbaseResult(.success(CoinbasePerformance(unrealizedPnl: 1234.56, totalCash: 500, totalCrypto: 9000)))
        let vm = PerformanceViewModel(api: fake)

        await vm.load()

        XCTAssertNotNil(vm.coinbasePerformance)
        XCTAssertEqual(vm.coinbasePerformance?.unrealizedPnl, 1234.56)
        XCTAssertFalse(vm.isLoading)
    }

    func testLoadPopulatesZerionPnl() async {
        let fake = FakeAPI()
        fake.setPnlResult(.success(ZerionPnl(unrealizedGain: 100, realizedGain: 200, totalGain: 300)))
        let vm = PerformanceViewModel(api: fake)

        await vm.load()

        XCTAssertNotNil(vm.zerionPnl)
        XCTAssertEqual(vm.zerionPnl?.totalGain, 300)
        XCTAssertEqual(vm.zerionPnl?.unrealizedGain, 100)
    }

    func testLoadPopulatesDefiPositions() async {
        let fake = FakeAPI()
        let position = DefiPosition(
            id: "pos-1",
            symbol: "ETH",
            name: "Ethereum",
            quantity: 1.5,
            valueUsd: 3000,
            walletAddress: "0xabc"
        )
        fake.setDefiResult(.success(DefiPositionsResponse(positions: [position])))
        let vm = PerformanceViewModel(api: fake)

        await vm.load()

        XCTAssertEqual(vm.defiPositions.count, 1)
        XCTAssertEqual(vm.defiPositions.first?.symbol, "ETH")
    }

    func testErrorsDoNotCrash() async {
        struct Boom: Error {}
        let fake = FakeAPI()
        fake.setCoinbaseResult(.failure(Boom()))
        fake.setPnlResult(.failure(Boom()))
        fake.setDefiResult(.failure(Boom()))
        let vm = PerformanceViewModel(api: fake)

        await vm.load()

        // try? means nil on failure — errorMessage stays nil
        XCTAssertNil(vm.coinbasePerformance)
        XCTAssertNil(vm.zerionPnl)
        XCTAssertTrue(vm.defiPositions.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testIsLoadingIsFalseAfterLoad() async {
        let fake = FakeAPI()
        let vm = PerformanceViewModel(api: fake)

        await vm.load()

        XCTAssertFalse(vm.isLoading)
    }
}
