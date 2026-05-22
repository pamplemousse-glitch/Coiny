import XCTest
@testable import Coiny

final class SessionStoreTests: XCTestCase {
    func testInMemoryStoreStartsEmpty() {
        let store = InMemorySessionStore()
        XCTAssertNil(store.load())
    }

    func testInMemoryStoreSeedIsLoadable() {
        let store = InMemorySessionStore(seed: "preloaded")
        XCTAssertEqual(store.load(), "preloaded")
    }

    func testInMemoryStoreSaveLoadRoundtrip() throws {
        let store = InMemorySessionStore()
        try store.save("tok-123")
        XCTAssertEqual(store.load(), "tok-123")
    }

    func testInMemoryStoreClearRemovesToken() throws {
        let store = InMemorySessionStore(seed: "tok-xyz")
        store.clear()
        XCTAssertNil(store.load())
    }

    // `KeychainSessionStore` calls into the real Keychain, which can't be
    // exercised in a simulator test bundle without keychain-access-groups
    // entitlement (see KeychainTests). We trust the Security framework on
    // a real device and rely on SessionStore being a stable protocol —
    // `InMemorySessionStore` above tests the behavior contract that
    // production `API` depends on.
}
