import Foundation
import Security

enum KeychainHelper {
    private static let deviceIDKey = "com.bestfriendstock.deviceID"

    /// Returns existing device ID from Keychain, or creates and stores a new UUID.
    static func getOrCreateDeviceID() -> String {
        if let existing = read(key: deviceIDKey) {
            // Re-save so IDs created by older builds also become non-migratable.
            save(key: deviceIDKey, value: existing)
            return existing
        }
        let newID = UUID().uuidString
        save(key: deviceIDKey, value: newID)
        return newID
    }

    // MARK: Private

    private static func save(key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }
        let query: [CFString: Any] = [
            kSecClass:            kSecClassGenericPassword,
            kSecAttrAccount:      key,
            kSecValueData:        data,
            // The ID is the only credential for the paper-trading account: never let it leave
            // this device via backups or device transfer.
            kSecAttrAccessible:   kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            kSecAttrSynchronizable: false,
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    private static func read(key: String) -> String? {
        let query: [CFString: Any] = [
            kSecClass:       kSecClassGenericPassword,
            kSecAttrAccount: key,
            kSecReturnData:  true,
            kSecMatchLimit:  kSecMatchLimitOne,
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
}
