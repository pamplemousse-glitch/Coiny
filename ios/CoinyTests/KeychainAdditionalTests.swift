import XCTest
@testable import Coiny

/// Additional tests for the session-token storage contract using
/// `InMemorySessionStore`. The real `Keychain` / `KeychainSessionStore` cannot
/// be exercised in a simulator bundle without keychain-access-groups
/// entitlements; see `KeychainTests.swift` for the rationale.
/// These tests verify the full `SessionStore` protocol behavior that the
/// production `API` actor depends on.
final class KeychainAdditionalTests: XCTestCase {

    // MARK: - Round-trip

    func testSaveAndLoadRoundTrip() throws {
        let store = InMemorySessionStore()

        try store.save("abc")

        XCTAssertEqual(store.load(), "abc")
    }

    // MARK: - Empty before save

    func testLoadReturnsNilBeforeSave() {
        let store = InMemorySessionStore()

        XCTAssertNil(store.load())
    }

    // MARK: - Clear

    func testClearAfterSave() throws {
        let store = InMemorySessionStore()
        try store.save("token-to-delete")

        store.clear()

        XCTAssertNil(store.load())
    }

    // MARK: - Overwrite

    func testOverwriteToken() throws {
        let store = InMemorySessionStore()
        try store.save("first")
        try store.save("second")

        XCTAssertEqual(store.load(), "second")
    }

    // MARK: - Idempotent clear

    func testClearIsIdempotent() {
        let store = InMemorySessionStore()
        // Clear on a fresh (never written) store must not crash or throw.
        store.clear()
        store.clear()
        XCTAssertNil(store.load())
    }
}
