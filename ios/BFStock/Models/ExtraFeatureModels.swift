import Foundation

// MARK: - Stock score (/stock/score/{symbol})

struct ScoreDetail: Decodable, Identifiable {
    var id: String { dim }
    let dim: String
    let dimZh: String
    let score: Double
    let max: Double
    let noteZh: String
    let noteEn: String
}

struct ScoreDimension: Decodable {
    let score: Double
    let max: Double
    let details: [ScoreDetail]
}

struct ScoreDimensions: Decodable {
    let technical: ScoreDimension
    let fundamental: ScoreDimension
    let sentiment: ScoreDimension
    let risk: ScoreDimension
}

struct StockScore: Decodable {
    let symbol: String
    let total: Double
    let grade: String
    let summaryZh: String
    let summaryEn: String
    let dimensions: ScoreDimensions
}

// MARK: - News feeds (/news/daily, /news/bank-views)

struct NewsFeedItem: Decodable, Identifiable {
    var id: String { url }
    let title: String
    let summary: String?
    let source: String
    let publishedAt: String
    let url: String
    let lang: String?
    let category: String?
    // bank views only
    let banks: [String]?
    let banksZh: [String]?
    let actionType: String?
    let aiSummary: String?
}

struct NewsFeedResponse: Decodable {
    let items: [NewsFeedItem]
}

// MARK: - Daily knowledge (/knowledge/today)

struct KnowledgeEntry: Decodable {
    let topicZh: String
    let topicEn: String
    let category: String?
    let contentZh: String
    let contentEn: String
    let keyFormula: String?
    let example: String?
}

struct DailyKnowledge: Decodable {
    let date: String
    let economics: KnowledgeEntry
    let finance: KnowledgeEntry
}
