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
}

struct SellBody: Encodable {
    let deviceId: String
    let symbol: String
    let shares: Int
    let market: String
}
