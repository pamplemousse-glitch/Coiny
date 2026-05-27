import XCTest
@testable import Coiny

@MainActor
final class NetWorthViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: NetWorthViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var result: Result<NetWorthResponse, Error>

        init() {
            result = .success(Self.empty)
        }

        func setResult(_ result: Result<NetWorthResponse, Error>) {
            lock.lock(); defer { lock.unlock() }
            self.result = result
        }

        func getNetWorth() async throws -> NetWorthResponse {
            lock.lock(); let r = result; lock.unlock()
            return try r.get()
        }

        static let empty = NetWorthResponse(
            total: 0,
            bank: 0,
            investments: 0,
            crypto: 0,
            defi: 0,
            chainWallets: 0,
            hyperliquid: 0,
            realEstate: 0,
            vehicles: 0,
            metals: 0,
            sneakers: 0,
            kraken: 0,
            snaptrade: 0,
            ynab: 0,
            vinyl: nil,
            kalshi: nil,
            debts: 0,
            liquidCashMonths: nil,
            accounts: NetWorthAccounts(
                bank: [],
                investments: [],
                crypto: [],
                defi: DefiTotal(totalUSD: 0),
                debts: []
            ),
            connections: NetWorthConnections(
                coinbase: false,
                zerion: false,
                spinwheel: false,
                kraken: false,
                snaptrade: false,
                ynab: false,
                kalshi: nil
            )
        )
    }

    // MARK: - Initial state

    func testStartsIdle() {
        let vm = NetWorthViewModel(api: FakeAPI())
        if case .idle = vm.state { } else {
            XCTFail("Expected .idle, got \(vm.state)")
        }
        XCTAssertNil(vm.netWorth)
    }

    // MARK: - Load

    func testLoadTransitionsToLoaded() async {
        let fake = FakeAPI()
        let response = NetWorthResponse(
            total: 5000,
            bank: 3000,
            investments: 0,
            crypto: 2000,
            defi: 0,
            chainWallets: 0,
            hyperliquid: 0,
            realEstate: 0,
            vehicles: 0,
            metals: 0,
            sneakers: 0,
            kraken: 0,
            snaptrade: 0,
            ynab: 0,
            vinyl: nil,
            kalshi: nil,
            debts: 0,
            liquidCashMonths: 3.5,
            accounts: NetWorthAccounts(
                bank: [BankAccount(id: "a1", name: "Checking", type: "depository", balance: 3000, minPayment: nil, nextDueDate: nil)],
                investments: [],
                crypto: [],
                defi: DefiTotal(totalUSD: 0),
                debts: []
            ),
            connections: NetWorthConnections(coinbase: true, zerion: false, spinwheel: false, kraken: false, snaptrade: false, ynab: false, kalshi: nil)
        )
        fake.setResult(.success(response))
        let vm = NetWorthViewModel(api: fake)

        await vm.load()

        XCTAssertEqual(vm.netWorth?.total, 5000)
        XCTAssertEqual(vm.netWorth?.bank, 3000)
        XCTAssertEqual(vm.netWorth?.accounts.bank.count, 1)
        if case .loaded = vm.state { } else {
            XCTFail("Expected .loaded, got \(vm.state)")
        }
    }

    func testLoadOnErrorTransitionsToFailed() async {
        struct Boom: LocalizedError { var errorDescription: String? { "net worth failed" } }
        let fake = FakeAPI()
        fake.setResult(.failure(Boom()))
        let vm = NetWorthViewModel(api: fake)

        await vm.load()

        XCTAssertNil(vm.netWorth)
        if case let .failed(msg) = vm.state {
            XCTAssertEqual(msg, "net worth failed")
        } else {
            XCTFail("Expected .failed, got \(vm.state)")
        }
    }

    func testLoadWithNegativeTotal() async {
        let fake = FakeAPI()
        let response = NetWorthResponse(
            total: -1500,
            bank: 500,
            investments: 0,
            crypto: 0,
            defi: 0,
            chainWallets: 0,
            hyperliquid: 0,
            realEstate: 0,
            vehicles: 0,
            metals: 0,
            sneakers: 0,
            kraken: 0,
            snaptrade: 0,
            ynab: 0,
            vinyl: nil,
            kalshi: nil,
            debts: -2000,
            liquidCashMonths: nil,
            accounts: NetWorthAccounts(
                bank: [],
                investments: [],
                crypto: [],
                defi: DefiTotal(totalUSD: 0),
                debts: [DebtItem(id: "d1", type: "credit_card", balance: 2000, monthlyPayment: 100)]
            ),
            connections: NetWorthConnections(coinbase: false, zerion: false, spinwheel: true, kraken: false, snaptrade: false, ynab: false, kalshi: nil)
        )
        fake.setResult(.success(response))
        let vm = NetWorthViewModel(api: fake)

        await vm.load()

        XCTAssertEqual(vm.netWorth?.total, -1500)
        XCTAssertTrue(vm.netWorth?.connections.spinwheel == true)
        XCTAssertEqual(vm.netWorth?.accounts.debts.count, 1)
    }

    func testLoadWithNewAssetFields() async {
        let fake = FakeAPI()
        let response = NetWorthResponse(
            total: 10_000,
            bank: 2000,
            investments: 3000,
            crypto: 0,
            defi: 0,
            chainWallets: 0,
            hyperliquid: 0,
            realEstate: 3000,
            vehicles: 1500,
            metals: 500,
            sneakers: 1000,
            kraken: 0,
            snaptrade: 0,
            ynab: 0,
            vinyl: 200,
            kalshi: 50,
            debts: -1250,
            liquidCashMonths: nil,
            accounts: NetWorthAccounts(bank: [], investments: [], crypto: [], defi: DefiTotal(totalUSD: 0), debts: []),
            connections: NetWorthConnections(coinbase: false, zerion: false, spinwheel: false, kraken: true, snaptrade: true, ynab: false, kalshi: true)
        )
        fake.setResult(.success(response))
        let vm = NetWorthViewModel(api: fake)

        await vm.load()

        XCTAssertEqual(vm.netWorth?.realEstate, 3000)
        XCTAssertEqual(vm.netWorth?.metals, 500)
        XCTAssertEqual(vm.netWorth?.sneakers, 1000)
        XCTAssertEqual(vm.netWorth?.vinyl, 200)
        XCTAssertEqual(vm.netWorth?.kalshi, 50)
        XCTAssertTrue(vm.netWorth?.connections.kraken == true)
        XCTAssertTrue(vm.netWorth?.connections.snaptrade == true)
        XCTAssertTrue(vm.netWorth?.connections.kalshi == true)
    }
}
