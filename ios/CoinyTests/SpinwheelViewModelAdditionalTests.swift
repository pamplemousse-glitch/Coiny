import XCTest
@testable import Coiny

@MainActor
final class SpinwheelViewModelAdditionalTests: XCTestCase {

    // MARK: - Fake

    private final class FakeAPI: SpinwheelViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var statusResult: Result<SpinwheelStatus, Error> = .success(SpinwheelStatus(connected: false))
        private var otpResult: Result<EmptyResponse, Error> = .success(EmptyResponse())
        private var verifyResult: Result<EmptyResponse, Error> = .success(EmptyResponse())
        private var debtsResult: Result<SpinwheelDebtsResponse, Error> = .success(SpinwheelDebtsResponse(debts: []))
        private var disconnectError: Error?

        // Tracks whether getSpinwheelDebts was called.
        private(set) var debtsCallCount = 0
        // Records the phone passed to verifySpinwheelOtp.
        private(set) var lastVerifyPhone: String?

        func setStatusResult(_ result: Result<SpinwheelStatus, Error>) {
            lock.lock(); defer { lock.unlock() }
            statusResult = result
        }

        func setOtpResult(_ result: Result<EmptyResponse, Error>) {
            lock.lock(); defer { lock.unlock() }
            otpResult = result
        }

        func setVerifyResult(_ result: Result<EmptyResponse, Error>) {
            lock.lock(); defer { lock.unlock() }
            verifyResult = result
        }

        func setDebtsResult(_ result: Result<SpinwheelDebtsResponse, Error>) {
            lock.lock(); defer { lock.unlock() }
            debtsResult = result
        }

        func setDisconnectError(_ error: Error?) {
            lock.lock(); defer { lock.unlock() }
            disconnectError = error
        }

        func getSpinwheelStatus() async throws -> SpinwheelStatus {
            lock.lock(); let r = statusResult; lock.unlock()
            return try r.get()
        }

        func sendSpinwheelOtp(phone: String, dateOfBirth: String) async throws -> EmptyResponse {
            lock.lock(); let r = otpResult; lock.unlock()
            return try r.get()
        }

        func verifySpinwheelOtp(phone: String, code: String) async throws -> EmptyResponse {
            lock.lock()
            lastVerifyPhone = phone
            let r = verifyResult
            lock.unlock()
            return try r.get()
        }

        func getSpinwheelDebts() async throws -> SpinwheelDebtsResponse {
            lock.lock()
            debtsCallCount += 1
            let r = debtsResult
            lock.unlock()
            return try r.get()
        }

        func disconnectSpinwheel() async throws {
            lock.lock(); let e = disconnectError; lock.unlock()
            if let e { throw e }
        }
    }

    // MARK: - isLoading terminal states

    func testIsLoadingFalseAfterSuccessfulLoad() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(SpinwheelStatus(connected: false)))
        let vm = SpinwheelViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertFalse(vm.isLoading)
    }

    func testIsLoadingFalseAfterFailedLoad() async {
        struct Boom: LocalizedError { var errorDescription: String? { "status error" } }
        let fake = FakeAPI()
        fake.setStatusResult(.failure(Boom()))
        let vm = SpinwheelViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertFalse(vm.isLoading)
        XCTAssertEqual(vm.errorMessage, "status error")
    }

    // MARK: - OTP phone tracking

    func testSendOtpStoresPendingPhone() async {
        let fake = FakeAPI()
        let vm = SpinwheelViewModel(api: fake)

        await vm.sendOtp(phone: "+15559876543", dateOfBirth: "1985-06-15")

        XCTAssertEqual(vm.pendingPhone, "+15559876543")
    }

    func testVerifyOtpUsesStoredPendingPhone() async {
        let fake = FakeAPI()
        // After verify succeeds, loadStatus is called; make it return connected=false
        // to avoid driving the debts path (which we don't care about here).
        fake.setStatusResult(.success(SpinwheelStatus(connected: false)))
        let vm = SpinwheelViewModel(api: fake)

        // Store the pending phone via sendOtp.
        await vm.sendOtp(phone: "+15551112222", dateOfBirth: "1990-01-01")
        XCTAssertEqual(vm.pendingPhone, "+15551112222")

        await vm.verifyOtp(code: "999888")

        // The fake records what phone was passed to verifySpinwheelOtp.
        XCTAssertEqual(fake.lastVerifyPhone, "+15551112222")
    }

    // MARK: - Disconnect does NOT call loadStatus

    func testDisconnectDoesNotCallLoadStatus() async {
        // disconnect() sets isConnected = false and debts = [] directly,
        // without calling getSpinwheelStatus or getSpinwheelDebts.
        let fake = FakeAPI()
        fake.setStatusResult(.success(SpinwheelStatus(connected: true)))
        fake.setDebtsResult(.success(SpinwheelDebtsResponse(debts: [])))
        let vm = SpinwheelViewModel(api: fake)
        await vm.loadStatus()
        XCTAssertTrue(vm.isConnected)
        let debtsCallsAfterLoadStatus = fake.debtsCallCount

        await vm.disconnect()

        XCTAssertFalse(vm.isConnected)
        XCTAssertTrue(vm.debts.isEmpty)
        // No additional debts call should have occurred during disconnect.
        XCTAssertEqual(fake.debtsCallCount, debtsCallsAfterLoadStatus)
    }

    // MARK: - loadStatus does not fetch debts when not connected

    func testLoadStatusNotConnectedDoesNotFetchDebts() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(SpinwheelStatus(connected: false)))
        let vm = SpinwheelViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertFalse(vm.isConnected)
        // getSpinwheelDebts must never have been called.
        XCTAssertEqual(fake.debtsCallCount, 0)
    }

    // MARK: - showOtpEntry resets after verify success

    func testShowOtpEntryFalseAfterVerifySuccess() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(SpinwheelStatus(connected: true)))
        fake.setDebtsResult(.success(SpinwheelDebtsResponse(debts: [])))
        let vm = SpinwheelViewModel(api: fake)

        await vm.sendOtp(phone: "+15550001111", dateOfBirth: "1995-03-20")
        XCTAssertTrue(vm.showOtpEntry)

        await vm.verifyOtp(code: "123456")

        XCTAssertFalse(vm.showOtpEntry)
    }

    // MARK: - Connected with no debts

    func testDebtsEmptyWhenConnectedButNoDebts() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(SpinwheelStatus(connected: true)))
        fake.setDebtsResult(.success(SpinwheelDebtsResponse(debts: [])))
        let vm = SpinwheelViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertTrue(vm.isConnected)
        XCTAssertTrue(vm.debts.isEmpty)
    }
}
