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

// MARK: - Business school guide (/universities)

struct UniRequirements: Decodable {
    let gpa: String?
    let gmatMedian: Double?
    let greAccepted: Bool?
    let toefl: Double?
    let ielts: Double?

    private enum K: String, CodingKey { case gpa, gmatMedian, greAccepted, toefl, ielts }

    // Fields vary across schools (strings, numbers, nulls): read each one leniently.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: K.self)
        gpa = try? c.decodeIfPresent(String.self, forKey: .gpa)
        gmatMedian = try? c.decodeIfPresent(Double.self, forKey: .gmatMedian)
        greAccepted = try? c.decodeIfPresent(Bool.self, forKey: .greAccepted)
        toefl = try? c.decodeIfPresent(Double.self, forKey: .toefl)
        ielts = try? c.decodeIfPresent(Double.self, forKey: .ielts)
    }
}

struct University: Decodable, Identifiable {
    let id: String
    let name: String
    let university: String
    let region: String
    let country: String
    let city: String
    let qsRank: Int?
    let businessRank: String?
    let established: Int?
    let programs: [String]
    let specialties: [String]
    let descriptionEn: String
    let descriptionCn: String
    let tuitionUsd: String?
    let language: String?
    let notableAlumni: [String]?
    let url: String?
    let requirements: UniRequirements?
    let employment: [String]?
}
