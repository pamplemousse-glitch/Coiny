import XCTest
@testable import Coiny

@MainActor
final class NetWorthViewModelAdditionalTests: XCTestCase {

    // MARK: - Fake

    private final class FakeAPI: NetWorthViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var queue: [Result<NetWorthResponse, Error>] = []
        private(set) var callCount = 0

        func enqueue(_ result: Result<NetWorthResponse, Error>) {
            lock.lock(); defer { lock.unlock() }
            queue.append(result)
        }

        func getNetWorth() async throws -> NetWorthResponse {
            lock.lock()
            callCount += 1
            guard !queue.isEmpty else {
                lock.unlock()
                throw NSError(domain: "FakeAPI", code: -1,
                              userInfo: [NSLocalizedDescriptionKey: "no reply enqueued"])
            }
            let r = queue.removeFirst()
            lock.unlock()
            return try r.get()
        }
    }

    // MARK: - Fixtures

    private static func emptyResponse(total: Double = 0) -> NetWorthResponse {
        NetWorthResponse(
            total: total,
            bank: 0,
            investments: 0,
            crypto: 0,
            defi: 0,
            debts: 0,
            accounts: NetWorthAccounts(
                bank: [],
                investments: [],
                crypto: [],
                defi: DefiTotal(totalUSD: 0),
                debts: []
            ),
            connections: NetWorthConnections(coinbase: false, zerion: false, spinwheel: false)
        )
    }

    private static func responseWithBankAccount() -> NetWorthResponse {
        NetWorthResponse(
            total: 3000,
            bank: 3000,
            investments: 0,
            crypto: 0,
            defi: 0,
            debts: 0,
            accounts: NetWorthAccounts(
                bank: [BankAccount(
                    id: "acct-1",
                    name: "Checking",
                    type: "depository",
                    balance: 3000,
                    minPayment: nil,
                    nextDueDate: nil
                )],
                investments: [],
                crypto: [],
                defi: DefiTotal(totalUSD: 0),
                debts: []
            ),
            connections: NetWorthConnections(coinbase: false, zerion: false, spinwheel: false)
        )
    }

    // MARK: - Concurrent load guard

    func testConcurrentLoadCallsAreIdempotent() async {
        let fake = FakeAPI()
        // Enqueue only one response. If the guard works, only one call is made.
        // If the guard is missing, the second call would dequeue from an empty
        // queue and throw — leaving the test in an unexpected state.
        fake.enqueue(.success(Self.emptyResponse()))
        let vm = NetWorthViewModel(api: fake)

        // Fire two concurrent loads. The guard `if case .loading = state { return }`
        // should prevent the second from reaching the API.
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await vm.load() }
            group.addTask { await vm.load() }
        }

        // Exactly one API call should have been made.
        XCTAssertEqual(fake.callCount, 1)
        if case .loaded = vm.state { } else {
            XCTFail("Expected .loaded after concurrent loads, got \(vm.state)")
        }
    }

    // MARK: - State transitions

    func testLoadTransitionsToLoadingThenLoaded() async {
        let fake = FakeAPI()
        fake.enqueue(.success(Self.emptyResponse(total: 100)))
        let vm = NetWorthViewModel(api: fake)

        // Before load: idle
        if case .idle = vm.state { } else {
            XCTFail("Expected .idle before load, got \(vm.state)")
        }

        await vm.load()

        // After load: loaded (not stuck in loading)
        if case .loaded = vm.state { } else {
            XCTFail("Expected .loaded after load, got \(vm.state)")
        }
        XCTAssertNotNil(vm.netWorth)
    }

    // MARK: - netWorth accessor

    func testNetWorthAccessorReturnsNilWhenFailed() async {
        struct Boom: LocalizedError { var errorDescription: String? { "net worth error" } }
        let fake = FakeAPI()
        fake.enqueue(.failure(Boom()))
        let vm = NetWorthViewModel(api: fake)

        await vm.load()

        XCTAssertNil(vm.netWorth)
        if case let .failed(msg) = vm.state {
            XCTAssertEqual(msg, "net worth error")
        } else {
            XCTFail("Expected .failed, got \(vm.state)")
        }
    }

    func testNetWorthAccessorReturnsNilWhenIdle() {
        let vm = NetWorthViewModel(api: FakeAPI())
        // State is .idle — no load has been called.
        XCTAssertNil(vm.netWorth)
    }

    func testNetWorthAccessorReturnsDataWhenLoaded() async {
        let fake = FakeAPI()
        fake.enqueue(.success(Self.emptyResponse(total: 9999)))
        let vm = NetWorthViewModel(api: fake)

        await vm.load()

        XCTAssertNotNil(vm.netWorth)
        XCTAssertEqual(vm.netWorth?.total, 9999)
    }

    // MARK: - Retry after failure

    func testLoadAfterFailureRetries() async {
        struct Boom: LocalizedError { var errorDescription: String? { "transient error" } }
        let fake = FakeAPI()
        fake.enqueue(.failure(Boom()))
        let vm = NetWorthViewModel(api: fake)

        await vm.load()
        if case .failed = vm.state { } else {
            XCTFail("Expected .failed after first load, got \(vm.state)")
        }

        // Second load should succeed and move to .loaded.
        fake.enqueue(.success(Self.emptyResponse(total: 500)))
        await vm.load()

        if case .loaded = vm.state { } else {
            XCTFail("Expected .loaded after retry, got \(vm.state)")
        }
        XCTAssertEqual(vm.netWorth?.total, 500)
    }

    // MARK: - Bank accounts

    func testBankAccountsAccessibleFromLoadedState() async {
        let fake = FakeAPI()
        fake.enqueue(.success(Self.responseWithBankAccount()))
        let vm = NetWorthViewModel(api: fake)

        await vm.load()

        XCTAssertEqual(vm.netWorth?.accounts.bank.count, 1)
        XCTAssertEqual(vm.netWorth?.accounts.bank.first?.name, "Checking")
    }
}
