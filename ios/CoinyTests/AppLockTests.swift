import LocalAuthentication
import XCTest
@testable import Coiny

/// Scriptable LAContext. The branch that matters most, "the user cancelled the
/// prompt", has no simulator affordance at all, and it is the branch where a
/// mistake means the lock lets you past.
@MainActor
final class FakeLAContext: LAContextProtocol {
    var canEvaluate = true
    var evaluateResult = true
    var errorCode: Int?
    private(set) var evaluateCallCount = 0

    func canEvaluatePolicy(_ policy: LAPolicy, error: NSErrorPointer) -> Bool {
        if !canEvaluate, let code = errorCode {
            error?.pointee = NSError(domain: LAErrorDomain, code: code)
        }
        return canEvaluate
    }

    func evaluate(policy: LAPolicy, reason: String) async -> Bool {
        evaluateCallCount += 1
        return evaluateResult
    }
}

@MainActor
final class AppLockTests: XCTestCase {
    private var defaults: UserDefaults!
    private var clock: Date!
    private var fake: FakeLAContext!

    private static let suite = "AppLockTests"

    override func setUp() async throws {
        try await super.setUp()
        defaults = UserDefaults(suiteName: Self.suite)
        defaults.removePersistentDomain(forName: Self.suite)
        clock = Date(timeIntervalSince1970: 1_000_000)
        fake = FakeLAContext()
    }

    private func makeLock() -> AppLock {
        AppLock(defaults: defaults, now: { self.clock }, context: { self.fake })
    }

    private func advance(_ seconds: TimeInterval) {
        clock = clock.addingTimeInterval(seconds)
    }

    // MARK: - Default

    func testLockIsOnWhenTheSettingHasNeverBeenTouched() {
        // An app-lock that ships OFF protects approximately nobody, because
        // almost no one goes looking for the setting.
        XCTAssertTrue(AppLock.isEnabled(defaults: defaults))
    }

    func testColdLaunchStartsLocked() {
        // The strictest case is a phone that was powered off and taken. If a
        // cold launch started unlocked, that case would be the one that walks
        // straight in.
        XCTAssertEqual(makeLock().state, .locked)
    }

    func testColdLaunchStartsUnlockedWhenTheUserTurnedItOff() {
        defaults.set(false, forKey: AppLock.enabledKey)
        XCTAssertEqual(makeLock().state, .unlocked)
    }

    // MARK: - The grace period

    func testReturningInsideTheGracePeriodDoesNotLock() async {
        // The whole point of the 5 minutes: a glance at Control Centre, a
        // copied 2FA code, or a tapped notification must not demand Face ID.
        // This is what stops people switching the lock off entirely.
        let lock = makeLock()
        await lock.authenticate()
        XCTAssertEqual(lock.state, .unlocked)

        lock.didEnterBackground()
        advance(AppLock.graceInterval - 1)
        lock.willEnterForeground()

        XCTAssertEqual(lock.state, .unlocked)
    }

    func testReturningAfterTheGracePeriodLocks() async {
        let lock = makeLock()
        await lock.authenticate()

        lock.didEnterBackground()
        advance(AppLock.graceInterval + 1)
        lock.willEnterForeground()

        XCTAssertEqual(lock.state, .locked)
    }

    func testTheClockStartsAtTheFIRSTBackgrounding() async {
        // .inactive and .background both route to didEnterBackground on some
        // paths. Restamping on the second would keep pushing the deadline out,
        // so an app left in the background for an hour would never lock.
        let lock = makeLock()
        await lock.authenticate()

        lock.didEnterBackground()
        advance(AppLock.graceInterval - 10)
        lock.didEnterBackground()  // second call, must not restamp
        advance(20)
        lock.willEnterForeground()

        XCTAssertEqual(lock.state, .locked)
    }

    func testForegroundWithoutABackgroundingDoesNothing() async {
        let lock = makeLock()
        await lock.authenticate()
        lock.willEnterForeground()
        XCTAssertEqual(lock.state, .unlocked)
    }

    // MARK: - Authentication outcomes

    func testSuccessfulAuthenticationUnlocks() async {
        let lock = makeLock()
        fake.evaluateResult = true
        await lock.authenticate()
        XCTAssertEqual(lock.state, .unlocked)
    }

    func testAFAILEDAuthenticationLEAVESTheAppLocked() async {
        // The failure path of an authentication control must never be a way
        // past it. Cancelling the Face ID sheet returns false, and if that
        // resolved to .unlocked the lock would be theatre.
        let lock = makeLock()
        fake.evaluateResult = false
        await lock.authenticate()
        XCTAssertEqual(lock.state, .locked)
    }

    func testASecondPromptIsNotStackedOnTheFirst() async {
        // iOS rejects a second concurrent evaluatePolicy, and to the user that
        // reads as the lock silently doing nothing.
        let lock = makeLock()
        fake.evaluateResult = true
        async let first: Void = lock.authenticate()
        async let second: Void = lock.authenticate()
        _ = await (first, second)
        XCTAssertLessThanOrEqual(fake.evaluateCallCount, 2)
        XCTAssertEqual(lock.state, .unlocked)
    }

    // MARK: - Devices that cannot satisfy the prompt

    func testADeviceWithNoPasscodeIsNotLockedOutOfItsOwnData() async {
        // Refusing here would be worse than not locking: the net worth is
        // already cached on this device and no network call can recover access.
        fake.canEvaluate = false
        fake.errorCode = LAError.passcodeNotSet.rawValue
        let lock = makeLock()
        XCTAssertEqual(lock.availability(), .noAuthenticationConfigured)

        await lock.authenticate()
        XCTAssertEqual(lock.state, .unlocked)
        XCTAssertEqual(fake.evaluateCallCount, 0, "must not prompt on a device that cannot answer")
    }

    func testBiometryNotEnrolledIsTreatedTheSameWay() {
        fake.canEvaluate = false
        fake.errorCode = LAError.biometryNotEnrolled.rawValue
        XCTAssertEqual(makeLock().availability(), .noAuthenticationConfigured)
    }

    func testAnUnevaluatablePolicyIsReportedSeparately() {
        // Distinct from "nothing enrolled" because it needs a different message
        // rather than a shared error screen.
        fake.canEvaluate = false
        fake.errorCode = LAError.invalidContext.rawValue
        XCTAssertEqual(makeLock().availability(), .unavailable)
    }

    // MARK: - The setting

    func testTurningTheLockOffUnlocksTheScreenYouAreLookingAt()  {
        let lock = makeLock()
        XCTAssertEqual(lock.state, .locked)

        lock.settingChanged(to: false)

        // Otherwise the user disables the lock and is still staring at it,
        // which is the bug @AppStorage alone would have shipped.
        XCTAssertEqual(lock.state, .unlocked)
        XCTAssertFalse(AppLock.isEnabled(defaults: defaults))
    }

    func testTurningTheLockOnDoesNotLockYouOutMidSession() {
        defaults.set(false, forKey: AppLock.enabledKey)
        let lock = makeLock()
        XCTAssertEqual(lock.state, .unlocked)

        lock.settingChanged(to: true)

        // It takes effect on the next real absence, not immediately: demanding
        // Face ID the instant someone flips a Settings toggle is startling and
        // teaches them to flip it back.
        XCTAssertEqual(lock.state, .unlocked)
        XCTAssertTrue(AppLock.isEnabled(defaults: defaults))
    }

    func testADisabledLockNeverLocksOnReturn() {
        defaults.set(false, forKey: AppLock.enabledKey)
        let lock = makeLock()
        lock.didEnterBackground()
        advance(AppLock.graceInterval * 10)
        lock.willEnterForeground()
        XCTAssertEqual(lock.state, .unlocked)
    }
}
