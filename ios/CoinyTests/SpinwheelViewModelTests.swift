import XCTest
@testable import Coiny

@MainActor
final class SpinwheelViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: SpinwheelViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var statusResult: Result<SpinwheelStatus, Error> = .success(SpinwheelStatus(connected: false))
        private var otpResult: Result<EmptyResponse, Error> = .success(EmptyResponse())
        private var verifyResult: Result<EmptyResponse, Error> = .success(EmptyResponse())
        private var debtsResult: Result<SpinwheelDebtsResponse, Error> = .success(SpinwheelDebtsResponse(debts: []))
        private var disconnectError: Error?

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
            lock.lock(); let r = verifyResult; lock.unlock()
            return try r.get()
        }

        func getSpinwheelDebts() async throws -> SpinwheelDebtsResponse {
            lock.lock(); let r = debtsResult; lock.unlock()
            return try r.get()
        }

        func disconnectSpinwheel() async throws {
            lock.lock(); let e = disconnectError; lock.unlock()
            if let e { throw e }
        }
    }

    // MARK: - Initial state

    func testStartsDisconnectedAndEmpty() {
        let vm = SpinwheelViewModel(api: FakeAPI())
        XCTAssertFalse(vm.isConnected)
        XCTAssertFalse(vm.showOtpEntry)
        XCTAssertTrue(vm.debts.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Status loading

    func testLoadStatusSetsConnectedTrue() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(SpinwheelStatus(connected: true)))
        fake.setDebtsResult(.success(SpinwheelDebtsResponse(debts: [])))
        let vm = SpinwheelViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertTrue(vm.isConnected)
        XCTAssertNil(vm.errorMessage)
    }

    func testLoadStatusOnErrorSetsErrorMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "status failed" } }
        let fake = FakeAPI()
        fake.setStatusResult(.failure(Boom()))
        let vm = SpinwheelViewModel(api: fake)

        await vm.loadStatus()

        XCTAssertFalse(vm.isConnected)
        XCTAssertEqual(vm.errorMessage, "status failed")
    }

    // MARK: - OTP flow

    func testSendOtpShowsOtpEntryAndStoresPendingPhone() async {
        let fake = FakeAPI()
        let vm = SpinwheelViewModel(api: fake)

        await vm.sendOtp(phone: "+15551234567", dateOfBirth: "1990-01-01")

        XCTAssertTrue(vm.showOtpEntry)
        XCTAssertEqual(vm.pendingPhone, "+15551234567")
        XCTAssertNil(vm.errorMessage)
    }

    func testSendOtpOnErrorSetsErrorMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "otp failed" } }
        let fake = FakeAPI()
        fake.setOtpResult(.failure(Boom()))
        let vm = SpinwheelViewModel(api: fake)

        await vm.sendOtp(phone: "+1555", dateOfBirth: "1990-01-01")

        XCTAssertFalse(vm.showOtpEntry)
        XCTAssertEqual(vm.errorMessage, "otp failed")
    }

    func testVerifyOtpOnSuccessClearsOtpEntryAndLoadsStatus() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(SpinwheelStatus(connected: true)))
        fake.setDebtsResult(.success(SpinwheelDebtsResponse(debts: [])))
        let vm = SpinwheelViewModel(api: fake)
        // Put VM in OTP entry state first
        await vm.sendOtp(phone: "+1555", dateOfBirth: "1990-01-01")
        XCTAssertTrue(vm.showOtpEntry)

        await vm.verifyOtp(code: "123456")

        XCTAssertFalse(vm.showOtpEntry)
        XCTAssertTrue(vm.isConnected)
    }

    // MARK: - Disconnect

    func testDisconnectClearsStateOnSuccess() async {
        let fake = FakeAPI()
        fake.setStatusResult(.success(SpinwheelStatus(connected: true)))
        let vm = SpinwheelViewModel(api: fake)
        await vm.loadStatus()
        XCTAssertTrue(vm.isConnected)

        await vm.disconnect()

        XCTAssertFalse(vm.isConnected)
        XCTAssertTrue(vm.debts.isEmpty)
    }

    func testDisconnectOnErrorSetsErrorMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "disconnect failed" } }
        let fake = FakeAPI()
        fake.setDisconnectError(Boom())
        let vm = SpinwheelViewModel(api: fake)

        await vm.disconnect()

        XCTAssertEqual(vm.errorMessage, "disconnect failed")
    }
}
