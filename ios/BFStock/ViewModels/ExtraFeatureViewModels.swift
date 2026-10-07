import Foundation

@MainActor
final class StockScoreViewModel: ObservableObject {
    @Published var score: StockScore?
    @Published var isLoading = false
    @Published var failed = false
    private let symbol: String

    init(symbol: String) { self.symbol = symbol }

    func load() async {
        guard score == nil else { return }
        isLoading = true
        failed = false
        do {
            score = try await APIClient.shared.get("/stock/score/\(symbol)")
        } catch {
            failed = true
        }
        isLoading = false
    }
}

@MainActor
final class NewsFeedViewModel: ObservableObject {
    enum Feed: String { case daily = "/news/daily", banks = "/news/bank-views" }

    @Published var items: [Feed: [NewsFeedItem]] = [:]
    @Published var loading: Set<String> = []
    @Published var error: String?

    func load(_ feed: Feed, force: Bool = false) async {
        if !force, items[feed] != nil { return }
        if items[feed] == nil, let c: NewsFeedResponse = APIClient.shared.cached(feed.rawValue) { items[feed] = c.items }
        loading.insert(feed.rawValue)
        error = nil
        do {
            let r: NewsFeedResponse = try await APIClient.shared.get(feed.rawValue, persist: true)
            items[feed] = r.items
        } catch {
            if items[feed] == nil { self.error = error.localizedDescription }
        }
        loading.remove(feed.rawValue)
    }
}

@MainActor
final class DailyKnowledgeViewModel: ObservableObject {
    @Published var knowledge: DailyKnowledge?

    func load() async {
        if knowledge == nil, let c: DailyKnowledge = APIClient.shared.cached("/knowledge/today") { knowledge = c }
        if let k: DailyKnowledge = try? await APIClient.shared.get("/knowledge/today", persist: true) { knowledge = k }
    }
}
