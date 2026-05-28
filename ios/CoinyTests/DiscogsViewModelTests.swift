import XCTest
@testable import Coiny

@MainActor
final class DiscogsViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: DiscogsViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var statusResult: Result<DiscogsStatus, Error> = .success(DiscogsStatus(connected: false, username: nil, lastCollectionUsd: nil))
        private var requestResult: Result<DiscogsRequestToken, Error> = .success(DiscogsRequestToken(oauthToken: "tok", oauthTokenSecret: "sec", authorizeUrl: "https://discogs.test"))
        private var verifyError: Error?
        private var syncError: Error?
        private var disconnectError: Error?

        func setStatusResult(_ r: Result<DiscogsStatus, Error>) { lock.lock(); statusResult = r; lock.unlock() }
        func setRequestResult(_ r: Result<DiscogsRequestToken, Error>) { lock.lock(); requestResult = r; lock.unlock() }
        func setVerifyError(_ e: Error?) { lock.lock(); verifyError = e; lock.unlock() }
        func setSyncError(_ e: Error?) { lock.lock(); syncError = e; lock.unlock() }
        func setDisconnectError(_ e: Error?) { lock.lock(); disconnectError = e; lock.unlock() }

        func getDiscogsStatus() async throws -> DiscogsStatus {
            lock.lock(); let r = statusResult; lock.unlock()
            return try r.get()
        }
        func requestDiscogsToken() async throws -> DiscogsRequestToken {
            lock.lock(); let r = requestResult; lock.unlock()
            return try r.get()
        }
        func verifyDiscogsToken(oauthToken: String, oauthVerifier: String) async throws {
            lock.lock(); let e = verifyError; lock.unlock()
            if let e { throw e }
        }
        func syncDiscogs() async throws {
            lock.lock(); let e = syncError; lock.unlock()
            if let e { throw e }
        }
        func disconnectDiscogs() async throws {
            lock.lock(); let e = disconnectError; lock.unlock()
            if let e { throw e }
        }
    }

    // MARK: - Initial state

    func testStartsDisconnected() {
        let vm = DiscogsViewModel(api: FakeAPI())
        XCTAssertFalse(vm.isConnected)
        XCTAssertNil(vm.username)
        XCTAssertNil(vm.authorizeUrl)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Load status

    func testLoadStatusConnected() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(DiscogsStatus(connected: true, username: "dj_test", lastCollectionUsd: 500)))
        let vm = DiscogsViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertTrue(vm.isConnected)
        XCTAssertEqual(vm.username, "dj_test")
        XCTAssertEqual(vm.lastCollectionUsd, 500)
    }

    func testLoadStatusOnErrorStaysDisconnected() async {
        struct Boom: Error {}
        let fake = FakeAPI()
        fake.setStatusResult(.failure(Boom()))
        let vm = DiscogsViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertFalse(vm.isConnected)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Request token

    func testRequestTokenSetsAuthorizeUrl() async {
        let fake = FakeAPI()
        fake.setRequestResult(.success(DiscogsRequestToken(oauthToken: "tok123", oauthTokenSecret: "sec", authorizeUrl: "https://discogs.com/oauth/authorize?token=tok123")))
        let vm = DiscogsViewModel(api: fake)

        await vm.requestToken()

        XCTAssertEqual(vm.pendingOauthToken, "tok123")
        XCTAssertEqual(vm.authorizeUrl, "https://discogs.com/oauth/authorize?token=tok123")
        XCTAssertNil(vm.errorMessage)
    }

    func testRequestTokenOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "request failed" } }
        let fake = FakeAPI()
        fake.setRequestResult(.failure(Boom()))
        let vm = DiscogsViewModel(api: fake)

        await vm.requestToken()

        XCTAssertNil(vm.pendingOauthToken)
        XCTAssertEqual(vm.errorMessage, "request failed")
    }

    // MARK: - Verify PIN

    func testVerifyPinWithEmptyPinDoesNothing() async {
        let fake = FakeAPI()
        let vm = DiscogsViewModel(api: fake)

        await vm.verifyPin("")

        XCTAssertNil(vm.errorMessage)
    }

    func testVerifyPinWithNoPendingTokenDoesNothing() async {
        let fake = FakeAPI()
        let vm = DiscogsViewModel(api: fake)

        await vm.verifyPin("12345")

        XCTAssertNil(vm.errorMessage)
    }

    func testVerifyPinSuccessClearsToken() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(DiscogsStatus(connected: true, username: "dj_test", lastCollectionUsd: nil)))
        let vm = DiscogsViewModel(api: fake)
        await vm.requestToken()

        await vm.verifyPin("12345")

        XCTAssertNil(vm.pendingOauthToken)
        XCTAssertNil(vm.authorizeUrl)
        XCTAssertTrue(vm.isConnected)
    }

    func testVerifyPinOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "verify failed" } }
        let fake = FakeAPI()
        fake.setVerifyError(Boom())
        let vm = DiscogsViewModel(api: fake)
        await vm.requestToken()

        await vm.verifyPin("12345")

        XCTAssertEqual(vm.errorMessage, "verify failed")
    }

    // MARK: - Disconnect

    func testDisconnectClearsState() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(DiscogsStatus(connected: true, username: "dj_test", lastCollectionUsd: 100)))
        let vm = DiscogsViewModel(api: fake)
        await vm.loadStatus()

        await vm.disconnect()

        XCTAssertFalse(vm.isConnected)
        XCTAssertNil(vm.username)
        XCTAssertNil(vm.lastCollectionUsd)
        XCTAssertNil(vm.errorMessage)
    }
}
