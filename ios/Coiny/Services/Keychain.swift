import Foundation
import Security

/// Generic Keychain wrapper. Construct with a custom `service` for tests so
/// tests don't read or pollute production-app Keychain items.
// `@unchecked Sendable` because CFString (an immutable Foundation type) isn't
// marked Sendable in the Security framework's imported headers. The properties
// here are all immutable after init.
struct Keychain: @unchecked Sendable {
    let service: String
    /// kSecAttrAccessible value applied on save. Defaults to the strict
    /// "device-only + requires user-set passcode" policy used in production;
    /// tests pass `kSecAttrAccessibleWhenUnlocked` because the iOS Simulator
    /// has no passcode, which rejects the strict policy with errSecMissingEntitlement.
    let accessibility: CFString

    init(
        service: String = "app.coiny.ios",
        accessibility: CFString = kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly
    ) {
        self.service = service
        self.accessibility = accessibility
    }

    static let shared = Keychain()
    static let sessionTokenAccount = "session_token"

    func save(_ value: String, account: String) throws {
        guard let data = value.data(using: .utf8) else { return }
        // Delete any existing item first so the add doesn't conflict.
        _ = delete(account: account)
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
            kSecValueData: data,
            kSecAttrAccessible: accessibility,
        ]
        let status = SecItemAdd(query as CFDictionary, nil)
        if status != errSecSuccess {
            throw KeychainError.saveFailed(status)
        }
    }

    func load(account: String) -> String? {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    @discardableResult
    func delete(account: String) -> Bool {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
        ]
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }

    enum KeychainError: Error, LocalizedError {
        case saveFailed(OSStatus)

        var errorDescription: String? {
            switch self {
            case let .saveFailed(status): return "Keychain save failed: \(status)"
            }
        }
    }
}
