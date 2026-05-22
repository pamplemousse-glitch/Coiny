import XCTest
@testable import Coiny

// `Keychain` is a thin wrapper around SecItem*. It cannot be exercised against
// the real Keychain in a simulator-hosted test bundle without a
// `keychain-access-groups` entitlement plus a signed test host — neither is
// configured in this project (signing is disabled on PR CI). The wrapper is
// small enough to hand-audit; we exercise its protocol surface through
// `SessionStoreTests` (`InMemorySessionStore`) and trust the Security framework
// on a real device.
//
// If we ever wire up signed test runs (e.g. on a real device via AWS Device
// Farm), restore the previous integration tests from git history:
// `git log -p backend/CoinyTests/KeychainTests.swift`.
final class KeychainTests: XCTestCase {
    func testKeychainConstructionDoesNotCrash() {
        let kc = Keychain()
        XCTAssertEqual(kc.service, "app.coiny.ios")
    }

    func testKeychainCustomServiceParameterIsHonored() {
        let kc = Keychain(service: "app.coiny.tests")
        XCTAssertEqual(kc.service, "app.coiny.tests")
    }

    func testLoadReturnsNilWhenNoEntitlement() {
        // Sanity: load against an unrelated, never-written service should not
        // throw. Tests run without keychain entitlements, so this is the only
        // SecItem* call we can rely on returning a sensible result.
        let kc = Keychain(service: "app.coiny.tests.never-written.\(UUID().uuidString)")
        XCTAssertNil(kc.load(account: "missing"))
    }
}
