import Foundation

struct PaperAccount: Decodable {
    let deviceId: String
    let nickname: String
    let createdAt: String
    // CN
    let cash: Double
    let portfolio: [String: PaperPosition]
    let totalValue: Double
    let returnPct: Double
    let rank: Int
    /// US-market rank; -1 until the account has traded US stocks (absent on older backends).
    let usRank: Int?
    let transactions: [PaperTransaction]
    // US
    let usCash: Double
    let usPortfolio: [String: PaperPosition]
    let usTotalValue: Double
    let usReturnPct: Double
    let usTransactions: [PaperTransaction]
    /// Every market in one shape ("us", "cn", "hk", "jp"); absent on older backends.
    let markets: [String: PaperMarketAccount]?
}

/// One market's side of the account, as /api/paper/account sends it under `markets`.
struct PaperMarketAccount: Decodable {
    let cash: Double
    let portfolio: [String: PaperPosition]
    let totalValue: Double
    let returnPct: Double
    let rank: Int
    let transactions: [PaperTransaction]
    let initial: Double?
}

extension PaperAccount {
    private func m(_ market: Market) -> PaperMarketAccount? { markets?[market.rawValue] }
    func cash(_ market: Market) -> Double { m(market)?.cash ?? (market == .cn ? cash : usCash) }
    func totalValue(_ market: Market) -> Double { m(market)?.totalValue ?? (market == .cn ? totalValue : usTotalValue) }
    func returnPct(_ market: Market) -> Double { m(market)?.returnPct ?? (market == .cn ? returnPct : usReturnPct) }
    func rank(_ market: Market) -> Int { m(market)?.rank ?? (market == .cn ? rank : (usRank ?? -1)) }
    func positions(_ market: Market) -> [String: PaperPosition] { m(market)?.portfolio ?? (market == .cn ? portfolio : usPortfolio) }
    func transactions(_ market: Market) -> [PaperTransaction] { m(market)?.transactions ?? (market == .cn ? transactions : usTransactions) }
}

struct PaperPosition: Decodable {
    let shares: Double
    let avgCost: Double
    let currentPrice: Double
    let marketValue: Double
    let profitLoss: Double
    let profitLossPct: Double
    let availableShares: Double
    let buyDate: String
    let availableDate: String?
    /// Hong Kong board lot (sell in whole lots); nil elsewhere
    let lot: Int?

    var sharesInt: Int { Int(shares) }
    var availableSharesInt: Int { Int(availableShares) }
}

struct PaperTransaction: Decodable, Identifiable {
    let date: String
    let type: String
    let symbol: String
    let name: String
    let shares: Double
    let price: Double
    let amount: Double
    let commission: Double
    let profitLoss: Double?
    let market: String

    var id: String { "\(date)_\(symbol)_\(type)_\(amount)" }
    var isBuy: Bool { type == "buy" }
}

struct LeaderboardEntry: Decodable, Identifiable {
    let rank: Int
    let nickname: String
    let returnPct: Double
    let totalValue: Double
    let isMe: Bool

    var id: Int { rank }
}

struct TradeResult: Decodable, Equatable {
    let success: Bool
    let message: String
    let price: Double?
    let commission: Double?
    let totalCost: Double?
    let netProceeds: Double?
    let profitLoss: Double?
    let profitLossPct: Double?
    let cashRemaining: Double?
}

struct PaperAccountBody: Encodable {
    let deviceId: String
}

struct BuyBody: Encodable {
    let deviceId: String
    let symbol: String
    let shares: Int
    let market: String
    var lang: String = Lang.code      // language of the confirmation message
}

struct SellBody: Encodable {
    let deviceId: String
    let symbol: String
    let shares: Int
    let market: String
    var lang: String = Lang.code
}
