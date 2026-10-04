import Foundation

struct AISentiment: Codable {
    let sentiment: String
    let impact: String?
    let summary: String?
    let reason: String?
}

struct NewsItem: Codable, Identifiable {
    var id: String { title + source }
    let title: String
    let source: String
    let time: String
    let url: String
    let lang: String
    let finalSentiment: String
    let aiSentiment: AISentiment?
}

struct NewsOverall: Codable {
    let positiveCount: Int
    let neutralCount: Int
    let negativeCount: Int
    let sentimentScore: Double
    let aiSummary: String
}

struct StockNewsResponse: Codable {
    let symbol: String
    let stockName: String
    let news: [NewsItem]
    let overall: NewsOverall
}
