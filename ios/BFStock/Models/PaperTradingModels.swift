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
    /// Competitions this device has joined
    let games: [PaperGame]?
}

/// One portfolio (a market account or a competition), as the server sends it.
struct PaperMarketAccount: Decodable {
    let cash: Double
    let portfolio: [String: PaperPosition]
    let totalValue: Double
    let returnPct: Double
    let rank: Int?                     // absent for competitions (they have their own standings)
    let transactions: [PaperTransaction]
    let initial: Double?
    // Order desk (absent on older backends)
    let buyingPower: Double?
    let shorts: [String: PaperShort]?
    let shortOk: Bool?
    let orders: [PaperOrder]?
    let analytics: PaperAnalytics?
    let session: PaperSession?

    var openOrders: [PaperOrder] { (orders ?? []).filter { $0.status == "open" } }
}

struct PaperShort: Decodable {
    let shares: Double
    let avgPrice: Double
    let currentPrice: Double
    let marketValue: Double
    let profitLoss: Double
    let profitLossPct: Double
    let name: String?

    var sharesInt: Int { Int(shares) }
}

struct PaperOrder: Decodable, Identifiable {
    let id: String
    let side: String              // buy | sell | short | cover
    let type: String              // market | limit | stop | stop_limit | trailing_stop
    let symbol: String
    let name: String?
    let shares: Int
    let tif: String?
    let status: String            // open | filled | cancelled | expired | rejected
    let limitPrice: Double?
    let stopPrice: Double?
    let trailPct: Double?
    let filledPrice: Double?
    let createdAt: String?
    let reason: String?
}

struct PaperAnalytics: Decodable {
    let dayChange: Double?
    let dayChangePct: Double?
    let unrealizedPl: Double?
    let realizedPl: Double?
    let winRate: Double?
}

struct PaperSession: Decodable {
    let open: Bool
    let holiday: Bool?          // a weekday the exchange is closed for a holiday
}

struct PaperGame: Decodable, Identifiable, Equatable {
    let id: String
    let code: String
    let name: String
    let market: String
    let startCash: Double
    let endDate: String
    let allowShort: Bool?
    let members: Int
    let status: String            // upcoming | active | ended
    let isOwner: Bool?

    var marketValue: Market { Market(rawValue: market) ?? .us }
}

struct GameStanding: Decodable, Identifiable {
    let nickname: String
    let totalValue: Double
    let returnPct: Double
    let isMe: Bool
    var id: String { "\(nickname)|\(totalValue)" }
}

/// /api/paper/games/account: the competition portfolio plus the game and its standings.
struct PaperGameAccount: Decodable {
    let view: PaperMarketAccount
    let game: PaperGame
    let leaderboard: [GameStanding]

    private enum K: String, CodingKey { case game, leaderboard }
    init(from decoder: Decoder) throws {
        view = try PaperMarketAccount(from: decoder)
        let c = try decoder.container(keyedBy: K.self)
        game = try c.decode(PaperGame.self, forKey: .game)
        leaderboard = try c.decode([GameStanding].self, forKey: .leaderboard)
    }
}

struct GameWrapper: Decodable { let game: PaperGame }

extension PaperAccount {
    private func m(_ market: Market) -> PaperMarketAccount? { markets?[market.rawValue] }
    func cash(_ market: Market) -> Double { m(market)?.cash ?? (market == .cn ? cash : usCash) }
    func totalValue(_ market: Market) -> Double { m(market)?.totalValue ?? (market == .cn ? totalValue : usTotalValue) }
    func returnPct(_ market: Market) -> Double { m(market)?.returnPct ?? (market == .cn ? returnPct : usReturnPct) }
    func rank(_ market: Market) -> Int { m(market)?.rank ?? (market == .cn ? rank : (usRank ?? -1)) }
    func view(_ market: Market) -> PaperMarketAccount? { m(market) }
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
    let name: String?

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
    /// Splits / bonus shares: "4:1" or "+4/10"
    let ratio: String?

    var id: String { "\(date)_\(symbol)_\(type)_\(amount)" }
    /// Dividend, split or bonus shares (applied on the ex-date), not a trade
    var isCorporateAction: Bool { ["dividend", "split", "bonus"].contains(type) }
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

struct OrderBody: Encodable {
    let deviceId: String
    let market: String
    let symbol: String
    let shares: Int
    let side: String
    let type: String
    var limitPrice: Double? = nil
    var stopPrice: Double? = nil
    var trailPct: Double? = nil
    var tif: String = "day"
    var gameId: String? = nil
    var lang: String = Lang.code
}

struct CancelOrderBody: Encodable {
    let deviceId: String
    let orderId: String
    var gameId: String? = nil
    var lang: String = Lang.code
}

struct GameIdBody: Encodable {
    let deviceId: String
    let gameId: String
}

struct GameJoinBody: Encodable {
    let deviceId: String
    let code: String
    let nickname: String?
}

struct GameCreateBody: Encodable {
    let deviceId: String
    let name: String
    let market: String
    let startCash: Double
    let endDate: String
    let allowShort: Bool
    let nickname: String?
}

struct SellBody: Encodable {
    let deviceId: String
    let symbol: String
    let shares: Int
    let market: String
    var lang: String = Lang.code
}
