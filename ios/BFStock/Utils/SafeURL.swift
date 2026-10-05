import Foundation
import UIKit

enum SafeURL {
    /// Only plain web links are ever opened from remote content: no javascript:, tel:, file:, custom schemes.
    static func web(_ raw: String) -> URL? {
        guard let url = URL(string: raw.trimmingCharacters(in: .whitespacesAndNewlines)),
              let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http",
              let host = url.host, !host.isEmpty else { return nil }
        return url
    }

    @MainActor
    static func open(_ raw: String) {
        guard let url = web(raw) else { return }
        UIApplication.shared.open(url)
    }
}
