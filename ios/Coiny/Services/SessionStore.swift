import Foundation

/// Persistence seam for the session token. Production stores it in the
/// Keychain via `KeychainSessionStore`; tests use `InMemorySessionStore`.
protocol SessionStore: Sendable {
    func load() -> String?
    func save(_ token: String) throws
    func clear()
}

struct KeychainSessionStore: SessionStore {
    private let keychain: Keychain
    private let account: String

    init(keychain: Keychain = .shared, account: String = Keychain.sessionTokenAccount) {
        self.keychain = keychain
        self.account = account
    }

    func load() -> String? { keychain.load(account: account) }
    func save(_ token: String) throws { try keychain.save(token, account: account) }
    func clear() { _ = keychain.delete(account: account) }
}

/// In-memory token store for tests. Thread-safe via NSLock so it stays
/// `Sendable` when passed into the `API` actor.
final class InMemorySessionStore: SessionStore, @unchecked Sendable {
    private let lock = NSLock()
    private var token: String?

    init(seed: String? = nil) { self.token = seed }

    func load() -> String? {
        lock.lock(); defer { lock.unlock() }
        return token
    }

    func save(_ token: String) throws {
        lock.lock(); defer { lock.unlock() }
        self.token = token
    }

    func clear() {
        lock.lock(); defer { lock.unlock() }
        token = nil
    }
}
