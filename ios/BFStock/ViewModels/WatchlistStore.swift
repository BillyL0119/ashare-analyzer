import Foundation
import SwiftUI

struct WatchlistItem: Codable, Identifiable, Equatable {
    var id: String { "\(market)_\(code)" }
    let code: String
    let name: String
    let market: String

    var resolvedMarket: Market { market == "us" ? .us : .cn }
}

@MainActor
final class WatchlistStore: ObservableObject {
    static let shared = WatchlistStore()

    @Published private(set) var items: [WatchlistItem] = []

    private let key = "bfstock_watchlist_v1"

    private init() { load() }

    func isWatched(code: String, market: Market) -> Bool {
        items.contains { $0.code == code && $0.market == market.rawValue }
    }

    func toggle(code: String, name: String, market: Market) {
        if let idx = items.firstIndex(where: { $0.code == code && $0.market == market.rawValue }) {
            items.remove(at: idx)
        } else {
            items.insert(WatchlistItem(code: code, name: name, market: market.rawValue), at: 0)
        }
        save()
    }

    func move(id: String, before targetID: String) {
        guard id != targetID,
              let from = items.firstIndex(where: { $0.id == id }),
              let to = items.firstIndex(where: { $0.id == targetID }) else { return }
        let item = items.remove(at: from)
        items.insert(item, at: to)
        save()
    }

    func remove(id: String) {
        items.removeAll { $0.id == id }
        save()
    }

    private func save() {
        if let data = try? JSONEncoder().encode(items) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: key),
              let saved = try? JSONDecoder().decode([WatchlistItem].self, from: data)
        else { return }
        items = saved
    }
}
