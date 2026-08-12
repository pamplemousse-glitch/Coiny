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
            nft: nil,
            manual: nil,
            alpaca: nil,
            truelayer: nil,
            kraken: 0,
            ynab: 0,
            vinyl: nil,
            kalshi: nil,
            polymarket: nil,
            pokemonCards: nil,
            energy: nil,
            farmland: nil,
            tradingCards: nil,
            coins: nil,
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
                ynab: false,
                kalshi: nil,
                alpaca: nil,
                truelayer: nil
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
            nft: nil,
            manual: nil,
            alpaca: nil,
            truelayer: nil,
            kraken: 0,
            ynab: 0,
            vinyl: nil,
            kalshi: nil,
            polymarket: nil,
            pokemonCards: nil,
            energy: nil,
            farmland: nil,
            tradingCards: nil,
            coins: nil,
            debts: 0,
            liquidCashMonths: 3.5,
            accounts: NetWorthAccounts(
                bank: [BankAccount(id: "a1", name: "Checking", type: "depository", balance: 3000, minPayment: nil, nextDueDate: nil)],
                investments: [],
                crypto: [],
                defi: DefiTotal(totalUSD: 0),
                debts: []
            ),
            connections: NetWorthConnections(coinbase: true, zerion: false, spinwheel: false, kraken: false, snaptrade: false, ynab: false, kalshi: nil, alpaca: nil, truelayer: nil)
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
            nft: nil,
            manual: nil,
            alpaca: nil,
            truelayer: nil,
            kraken: 0,
            ynab: 0,
            vinyl: nil,
            kalshi: nil,
            polymarket: nil,
            pokemonCards: nil,
            energy: nil,
            farmland: nil,
            tradingCards: nil,
            coins: nil,
            debts: -2000,
            liquidCashMonths: nil,
            accounts: NetWorthAccounts(
                bank: [],
                investments: [],
                crypto: [],
                defi: DefiTotal(totalUSD: 0),
                debts: [DebtItem(id: "d1", type: "credit_card", balance: 2000, monthlyPayment: 100)]
            ),
            connections: NetWorthConnections(coinbase: false, zerion: false, spinwheel: true, kraken: false, snaptrade: false, ynab: false, kalshi: nil, alpaca: nil, truelayer: nil)
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
            nft: 150,
            manual: 500,
            alpaca: 3200,
            truelayer: 800,
            kraken: 0,
            ynab: 0,
            vinyl: 200,
            kalshi: 50,
            polymarket: 125,
            pokemonCards: nil,
            energy: nil,
            farmland: nil,
            tradingCards: nil,
            coins: nil,
            debts: -1250,
            liquidCashMonths: nil,
            accounts: NetWorthAccounts(bank: [], investments: [], crypto: [], defi: DefiTotal(totalUSD: 0), debts: []),
            connections: NetWorthConnections(coinbase: false, zerion: false, spinwheel: false, kraken: true, snaptrade: true, ynab: false, kalshi: true, alpaca: true, truelayer: true)
        )
        fake.setResult(.success(response))
        let vm = NetWorthViewModel(api: fake)

        await vm.load()

        XCTAssertEqual(vm.netWorth?.realEstate, 3000)
        XCTAssertEqual(vm.netWorth?.metals, 500)
        XCTAssertEqual(vm.netWorth?.sneakers, 1000)
        XCTAssertEqual(vm.netWorth?.nft, 150)
        XCTAssertEqual(vm.netWorth?.manual, 500)
        XCTAssertEqual(vm.netWorth?.alpaca, 3200)
        XCTAssertEqual(vm.netWorth?.truelayer, 800)
        XCTAssertEqual(vm.netWorth?.vinyl, 200)
        XCTAssertEqual(vm.netWorth?.kalshi, 50)
        XCTAssertEqual(vm.netWorth?.polymarket, 125)
        XCTAssertTrue(vm.netWorth?.connections.kraken == true)
        XCTAssertTrue(vm.netWorth?.connections.snaptrade == true)
        XCTAssertTrue(vm.netWorth?.connections.kalshi == true)
        XCTAssertTrue(vm.netWorth?.connections.alpaca == true)
        XCTAssertTrue(vm.netWorth?.connections.truelayer == true)
    }

    func testLoadWithCollectiblesAndNewAssets() async {
        let fake = FakeAPI()
        let response = NetWorthResponse(
            total: 20_000,
            bank: 5000,
            investments: 0,
            crypto: 0,
            defi: 0,
            chainWallets: 0,
            hyperliquid: 0,
            realEstate: 0,
            vehicles: 0,
            metals: 0,
            sneakers: 0,
            nft: 2500,
            manual: 1000,
            alpaca: 3000,
            truelayer: 1500,
            kraken: 0,
            ynab: 0,
            vinyl: nil,
            kalshi: nil,
            polymarket: nil,
            pokemonCards: 800,
            energy: 2000,
            farmland: 1500,
            tradingCards: 900,
            coins: 1050,
            debts: 0,
            liquidCashMonths: nil,
            accounts: NetWorthAccounts(bank: [], investments: [], crypto: [], defi: DefiTotal(totalUSD: 0), debts: []),
            connections: NetWorthConnections(coinbase: false, zerion: false, spinwheel: false, kraken: false, snaptrade: false, ynab: false, kalshi: nil, alpaca: nil, truelayer: nil)
        )
        fake.setResult(.success(response))
        let vm = NetWorthViewModel(api: fake)

        await vm.load()

        XCTAssertEqual(vm.netWorth?.nft, 2500)
        XCTAssertEqual(vm.netWorth?.manual, 1000)
        XCTAssertEqual(vm.netWorth?.alpaca, 3000)
        XCTAssertEqual(vm.netWorth?.truelayer, 1500)
        XCTAssertEqual(vm.netWorth?.pokemonCards, 800)
        XCTAssertEqual(vm.netWorth?.energy, 2000)
        XCTAssertEqual(vm.netWorth?.farmland, 1500)
        XCTAssertEqual(vm.netWorth?.tradingCards, 900)
        XCTAssertEqual(vm.netWorth?.coins, 1050)
        XCTAssertEqual(vm.netWorth?.total, 20_000)
        if case .loaded = vm.state { } else { XCTFail("Expected .loaded") }
    }
}
