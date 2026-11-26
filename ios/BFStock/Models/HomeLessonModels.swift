import Foundation

// MARK: - /api/home/lesson?market=us|cn|hk|jp
// The market's headline index (S&P 500, SSE Composite, Hang Seng, Nikkei 225), about three months of it, and the
// market's popular names. The same answer drives the website's home panel.

struct HomeLesson: Decodable {
    let market: String
    let asOf: String?
    let main: LessonIndex?
    let history: [LessonPoint]?
    let movers: [LessonStock]?
    let hot: [LessonStock]?
}

struct LessonIndex: Decodable {
    let nameZh: String?
    let nameEn: String?
    let price: Double?
    let changePct: Double?

    /// The index's name in the app's language (Chinese for zh, English otherwise).
    var displayName: String {
        let zh = nameZh ?? ""
        let en = nameEn ?? ""
        if Lang.code == "zh" { return zh.isEmpty ? en : zh }
        return en.isEmpty ? zh : en
    }
}

struct LessonPoint: Decodable, Identifiable {
    let date: String
    let close: Double
    var id: String { date }
}

struct LessonStock: Decodable, Identifiable {
    let symbol: String
    let name: String?
    let nameZh: String?
    let price: Double?
    let pct: Double?
    var id: String { symbol }

    var displayName: String {
        if Lang.code == "zh", let z = nameZh, !z.isEmpty { return z }
        if let n = name, !n.isEmpty { return n }
        return nameZh ?? symbol
    }
}

/// Loads and keeps the answer for each market, so switching between the segments does not start from an empty card.
@MainActor
final class HomeLessonStore: ObservableObject {
    @Published private(set) var lessons: [String: HomeLesson] = [:]
    @Published private(set) var failed: Set<String> = []

    func lesson(for market: Market) -> HomeLesson? { lessons[market.rawValue] }

    func load(_ market: Market) async {
        do {
            let l: HomeLesson = try await APIClient.shared.get("/home/lesson", params: ["market": market.rawValue])
            lessons[market.rawValue] = l
            failed.remove(market.rawValue)
        } catch {
            if lessons[market.rawValue] == nil { failed.insert(market.rawValue) }
        }
    }
}
