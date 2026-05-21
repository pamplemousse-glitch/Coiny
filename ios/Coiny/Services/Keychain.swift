import Foundation
import Security

enum Keychain {
    private static let service = "app.coiny.ios"

    static func save(_ value: String, account: String) throws {
        guard let data = value.data(using: .utf8) else { return }
        // Delete any existing item first so the add doesn't conflict.
        delete(account: account)
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
            kSecValueData: data,
            kSecAttrAccessible: kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
        ]
        let status = SecItemAdd(query as CFDictionary, nil)
        if status != errSecSuccess {
            throw KeychainError.saveFailed(status)
        }
    }

    static func load(account: String) -> String? {
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
    static func delete(account: String) -> Bool {
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

extension Keychain {
    static let sessionTokenAccount = "session_token"
}
