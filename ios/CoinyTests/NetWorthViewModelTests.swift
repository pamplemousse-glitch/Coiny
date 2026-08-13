import XCTest
@testable import Coiny

@MainActor
final class NetWorthViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: NetWorthViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var result: Result<NetWorthResponse, Error>
        private var refreshResult: Result<NetWorthResponse, Error>
        private(set) var getCallCount = 0
        private(set) var refreshCallCount = 0

        init() {
            result = .success(Self.empty)
            refreshResult = .success(Self.empty)
        }

        func setResult(_ result: Result<NetWorthResponse, Error>) {
            lock.lock(); defer { lock.unlock() }
            self.result = result
        }

        func setRefreshResult(_ result: Result<NetWorthResponse, Error>) {
            lock.lock(); defer { lock.unlock() }
            refreshResult = result
        }

        func getNetWorth() async throws -> NetWorthResponse {
            lock.lock(); getCallCount += 1; let r = result; lock.unlock()
            return try r.get()
        }

        func refreshNetWorth() async throws -> NetWorthResponse {
            lock.lock(); refreshCallCount += 1; let r = refreshResult; lock.unlock()
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

    /// In-memory cache so tests never touch the real snapshot file.
    private final class FakeCache: NetWorthCaching, @unchecked Sendable {
        private let lock = NSLock()
        private var stored: NetWorthResponse?
        private(set) var saveCount = 0

        func save(_ response: NetWorthResponse) {
            lock.lock(); defer { lock.unlock() }
            stored = response
            saveCount += 1
        }

        func load() -> NetWorthResponse? {
            lock.lock(); defer { lock.unlock() }
            return stored
        }

        func clear() {
            lock.lock(); defer { lock.unlock() }
            stored = nil
        }
    }

    private func makeVM(
        api: FakeAPI,
        cache: FakeCache = FakeCache(),
        telemetry: TelemetryClient = TelemetryClient(transport: LogTelemetryTransport()),
        now: @escaping () -> Date = { Date() }
    ) -> NetWorthViewModel {
        NetWorthViewModel(api: api, cache: cache, telemetry: telemetry, now: now)
    }

    // MARK: - Initial state

    func testStartsIdle() {
        let vm = makeVM(api: FakeAPI())
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
            connections: NetWorthConnections(coinbase: true, zerion: false, spinwheel: false, kraken: false, ynab: false, kalshi: nil, alpaca: nil, truelayer: nil)
        )
        fake.setResult(.success(response))
        let vm = makeVM(api: fake)

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
        let vm = makeVM(api: fake)

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
            connections: NetWorthConnections(coinbase: false, zerion: false, spinwheel: true, kraken: false, ynab: false, kalshi: nil, alpaca: nil, truelayer: nil)
        )
        fake.setResult(.success(response))
        let vm = makeVM(api: fake)

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
            connections: NetWorthConnections(coinbase: false, zerion: false, spinwheel: false, kraken: true, ynab: false, kalshi: true, alpaca: true, truelayer: true)
        )
        fake.setResult(.success(response))
        let vm = makeVM(api: fake)

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
            connections: NetWorthConnections(coinbase: false, zerion: false, spinwheel: false, kraken: false, ynab: false, kalshi: nil, alpaca: nil, truelayer: nil)
        )
        fake.setResult(.success(response))
        let vm = makeVM(api: fake)

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

    // MARK: - Refresh (POST /api/net-worth/refresh)

    func testRefreshCallsRefreshEndpoint() async {
        let fake = FakeAPI()
        fake.setRefreshResult(.success(NetWorthFixtures.response(total: 42)))
        let vm = makeVM(api: fake)

        await vm.refresh()

        XCTAssertEqual(fake.refreshCallCount, 1)
        XCTAssertEqual(fake.getCallCount, 0)
        XCTAssertEqual(vm.netWorth?.total, 42)
    }

    func testRefreshInsideDebounceWindowDowngradesToGet() async {
        let fake = FakeAPI()
        fake.setRefreshResult(.success(NetWorthFixtures.response(total: 1)))
        fake.setResult(.success(NetWorthFixtures.response(total: 2)))
        var currentTime = Date(timeIntervalSince1970: 1_000_000)
        let vm = makeVM(api: fake, now: { currentTime })

        await vm.refresh()
        currentTime = currentTime.addingTimeInterval(30)
        await vm.refresh()

        XCTAssertEqual(fake.refreshCallCount, 1, "second pull inside 60s must not hit the vendor path")
        XCTAssertEqual(fake.getCallCount, 1)
        XCTAssertEqual(vm.netWorth?.total, 2)
    }

    func testRefreshPastDebounceWindowHitsRefreshAgain() async {
        let fake = FakeAPI()
        fake.setRefreshResult(.success(NetWorthFixtures.response(total: 1)))
        var currentTime = Date(timeIntervalSince1970: 1_000_000)
        let vm = makeVM(api: fake, now: { currentTime })

        await vm.refresh()
        currentTime = currentTime.addingTimeInterval(61)
        await vm.refresh()

        XCTAssertEqual(fake.refreshCallCount, 2)
    }

    func testRefreshSetsBankCappedFlag() async {
        let fake = FakeAPI()
        fake.setRefreshResult(.success(NetWorthFixtures.response(bankRefresh: "capped")))
        let vm = makeVM(api: fake)

        await vm.refresh()

        XCTAssertTrue(vm.bankRefreshCapped)
    }

    func testRefreshFailureKeepsDataAndSurfacesError() async {
        struct Boom: LocalizedError { var errorDescription: String? { "refresh died" } }
        let fake = FakeAPI()
        fake.setResult(.success(NetWorthFixtures.response(total: 7)))
        var currentTime = Date(timeIntervalSince1970: 1_000_000)
        let vm = makeVM(api: fake, now: { currentTime })
        await vm.load()
        fake.setRefreshResult(.failure(Boom()))
        currentTime = currentTime.addingTimeInterval(120)

        await vm.refresh()

        XCTAssertEqual(vm.netWorth?.total, 7, "a failed refresh must not blank the screen")
        XCTAssertNotNil(vm.refreshErrorMessage, "a failed refresh must be visible, never silent")
    }

    // MARK: - Offline cache (R-8.9)

    func testLoadSavesSuccessfulResponseToCache() async {
        let fake = FakeAPI()
        let cache = FakeCache()
        fake.setResult(.success(NetWorthFixtures.response(total: 9)))
        let vm = makeVM(api: fake, cache: cache)

        await vm.load()

        XCTAssertEqual(cache.load()?.total, 9)
    }

    func testLoadFailureFallsBackToCachedSnapshotWithOfflineFlag() async {
        let fake = FakeAPI()
        let cache = FakeCache()
        cache.save(NetWorthFixtures.response(total: 11))
        fake.setResult(.failure(URLError(.notConnectedToInternet)))
        let vm = makeVM(api: fake, cache: cache)

        await vm.load()

        XCTAssertEqual(vm.netWorth?.total, 11, "offline must render the last numbers, not a blank screen")
        XCTAssertTrue(vm.isOffline)
    }

    func testLoadFailureWithoutCacheFails() async {
        let fake = FakeAPI()
        fake.setResult(.failure(URLError(.notConnectedToInternet)))
        let vm = makeVM(api: fake)

        await vm.load()

        if case .failed = vm.state { } else {
            XCTFail("Expected .failed with no cache, got \(vm.state)")
        }
        XCTAssertFalse(vm.isOffline)
    }

    // MARK: - Telemetry (section 24: client-only facts)

    func testPullEmitsRequestedThenDebounced() async {
        let fake = FakeAPI()
        fake.setRefreshResult(.success(NetWorthFixtures.response(total: 1)))
        fake.setResult(.success(NetWorthFixtures.response(total: 2)))
        let transport = RecordingTelemetryTransport()
        let telemetry = TelemetryClient(transport: transport)
        var currentTime = Date(timeIntervalSince1970: 1_000_000)
        let vm = makeVM(api: fake, telemetry: telemetry, now: { currentTime })

        await vm.refresh()
        currentTime = currentTime.addingTimeInterval(30)
        await vm.refresh()
        await telemetry.flush()

        let pulls = transport.events.filter { $0.event == "wealth_refresh_pulled" }
        XCTAssertEqual(pulls.map(\.properties), [
            ["outcome": .string("requested")],
            ["outcome": .string("debounced")],
        ], "the debounced pull is invisible to the server; only the client can count it")
    }

    func testOfflineBannerEmitsOncePerTransition() async {
        let fake = FakeAPI()
        let cache = FakeCache()
        cache.save(NetWorthFixtures.response(total: 11))
        fake.setResult(.failure(URLError(.notConnectedToInternet)))
        let transport = RecordingTelemetryTransport()
        let telemetry = TelemetryClient(transport: transport)
        let vm = makeVM(api: fake, cache: cache, telemetry: telemetry)

        await vm.load()
        await vm.load() // still offline: same banner, no re-emit
        fake.setResult(.success(NetWorthFixtures.response(total: 12)))
        await vm.load() // back online, banner clears
        fake.setResult(.failure(URLError(.notConnectedToInternet)))
        await vm.load() // offline again: a genuinely new banner
        await telemetry.flush()

        let banners = transport.events.filter { $0.event == "offline_banner_shown" }
        XCTAssertEqual(banners.count, 2)
        XCTAssertEqual(banners.first?.properties, ["screen": .string("wealth")])
    }

    func testSuccessfulLoadClearsOfflineFlag() async {
        let fake = FakeAPI()
        let cache = FakeCache()
        cache.save(NetWorthFixtures.response(total: 11))
        fake.setResult(.failure(URLError(.notConnectedToInternet)))
        let vm = makeVM(api: fake, cache: cache)
        await vm.load()
        XCTAssertTrue(vm.isOffline)

        fake.setResult(.success(NetWorthFixtures.response(total: 12)))
        await vm.load()

        XCTAssertFalse(vm.isOffline)
        XCTAssertEqual(vm.netWorth?.total, 12)
    }
}
