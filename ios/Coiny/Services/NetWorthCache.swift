import Foundation

/// Persists the last successful net-worth response so a network drop renders
/// the last numbers read-only under an offline banner instead of a blank
/// screen (PRD R-8.9).
///
/// Storage rules from R-18.1: display data lives in the app container (not the
/// Keychain), is excluded from iCloud backup, and is wiped on explicit
/// sign-out and account deletion. It is deliberately retained across session
/// expiry (R-15.2), so nothing here hooks the 401 sign-out path.
protocol NetWorthCaching: Sendable {
    func save(_ response: NetWorthResponse)
    func load() -> NetWorthResponse?
    func clear()
}

struct NetWorthCache: NetWorthCaching {
    static let shared = NetWorthCache()

    private let fileURL: URL

    init(directory: URL? = nil) {
        let base = directory ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        fileURL = base.appendingPathComponent("net-worth-snapshot.json", isDirectory: false)
    }

    func save(_ response: NetWorthResponse) {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(response) else { return }
        do {
            try FileManager.default.createDirectory(
                at: fileURL.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            try data.write(to: fileURL, options: .atomic)
            excludeFromBackup()
        } catch {
            // Cache write failure only costs the offline fallback; the live
            // response still renders. Nothing sensitive to log.
        }
    }

    func load() -> NetWorthResponse? {
        guard let data = try? Data(contentsOf: fileURL) else { return nil }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try? decoder.decode(NetWorthResponse.self, from: data)
    }

    func clear() {
        try? FileManager.default.removeItem(at: fileURL)
    }

    private func excludeFromBackup() {
        var url = fileURL
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? url.setResourceValues(values)
    }
}
