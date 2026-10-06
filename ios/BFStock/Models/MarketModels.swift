import Foundation

// MARK: - Market Overview

struct MarketOverview: Codable {
    let date: String
    let time: String
    let advanceCount: Int
    let declineCount: Int
    let flatCount: Int
    let totalVolume: String
    let shanghaiIndex: IndexQuote?
    let shenzhenIndex: IndexQuote?
    let chinextIndex: IndexQuote?
    let northboundFlow: String
    let sectorPerformance: [SectorPerf]
}

struct IndexQuote: Codable {
    let value: Double
    let change: Double
    let changePct: Double  // fractional: 0.0073 = 0.73%

    var pct: Double { changePct * 100 }  // convert to display percentage
}

struct SectorPerf: Codable, Identifiable {
    var id: String { name }
    let name: String
    let changePct: Double  // already in percent: 1.23 = +1.23%
}

// MARK: - Hot Stock

struct HotStock: Codable, Identifiable {
    var id: String { "\(market)_\(code)" }
    let code: String
    let name: String
    let changePct: Double?   // percent: 2.34 = +2.34%
    let rank: Int
    let market: String       // "cn" | "us"

    var resolvedMarket: Market { market == "us" ? .us : .cn }
}

struct USSearchItem: Codable {
    let symbol: String
    let name: String

    var asResult: StockSearchResult {
        StockSearchResult(code: symbol, name: name, changePct: nil, market: "us")
    }
}

// MARK: - Sector

struct SectorItem: Codable, Identifiable {
    var id: String { name }
    let name: String
    let changePct: Double
    let leader: String
    let leaderCode: String
}

struct SectorsResponse: Codable {
    let date: String
    let sectors: [SectorItem]
}

// MARK: - Search Result

struct StockSearchResult: Codable, Identifiable, Hashable {
    var id: String { "\(resolvedMarket.rawValue)_\(code)" }
    let code: String
    let name: String
    let changePct: Double?   // percent: 2.34 = +2.34%
    let market: String?      // "cn" | "us" | nil

    var resolvedMarket: Market { market == "us" ? .us : .cn }
}

// MARK: - Global sentiment & indices

struct SentimentGauge: Codable {
    let score: Double
    let labelZh: String
    let labelEn: String
}

struct GlobalIndex: Codable, Identifiable {
    var id: String { symbol }
    let symbol: String
    let name: String
    let nameZh: String
    let region: String
    let close: Double?
    let changePct: Double?   // percent: 0.66 = +0.66%

    var displayName: String { Lang.code == "zh" ? nameZh : name }
    /// East-Asian markets quote red-up / green-down like A-shares; the rest follow the US convention.
    var market: Market { ["cn", "hk", "jp", "kr"].contains(region) ? .cn : .us }
}

struct SentimentResponse: Codable {
    let usSentiment: SentimentGauge
    let cnSentiment: SentimentGauge
    let indices: [GlobalIndex]
}
