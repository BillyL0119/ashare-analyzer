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

// MARK: - Search Result

struct StockSearchResult: Codable, Identifiable {
    var id: String { "\(resolvedMarket.rawValue)_\(code)" }
    let code: String
    let name: String
    let changePct: Double?   // percent: 2.34 = +2.34%
    let market: String?      // "cn" | "us" | nil

    var resolvedMarket: Market { market == "us" ? .us : .cn }
}
