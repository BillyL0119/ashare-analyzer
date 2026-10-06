import Foundation
import CryptoKit

/// Last-good API responses on disk (Caches dir: not backed up, evictable by the system).
/// Used to paint the UI instantly and to keep showing data when the network or server is slow.
enum ResponseCache {
    static let maxAge: TimeInterval = 24 * 3600

    private static let dir: URL = {
        let base = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        let d = base.appendingPathComponent("api-cache", isDirectory: true)
        try? FileManager.default.createDirectory(at: d, withIntermediateDirectories: true)
        return d
    }()

    private static func file(for url: URL) -> URL {
        let digest = SHA256.hash(data: Data(url.absoluteString.utf8))
        return dir.appendingPathComponent(digest.map { String(format: "%02x", $0) }.joined().prefix(40) + ".json")
    }

    static func store(_ data: Data, for url: URL) {
        try? data.write(to: file(for: url), options: .atomic)
    }

    static func load(for url: URL) -> Data? {
        let f = file(for: url)
        guard let attrs = try? FileManager.default.attributesOfItem(atPath: f.path),
              let modified = attrs[.modificationDate] as? Date,
              Date().timeIntervalSince(modified) < maxAge else { return nil }
        return try? Data(contentsOf: f)
    }
}
