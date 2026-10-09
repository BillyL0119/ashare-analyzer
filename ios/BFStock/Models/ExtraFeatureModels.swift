import SwiftUI

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
    let qsBmRank: String?
    let qsBmRankNum: Int?
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

/// QS Business & Management Studies ranking (/universities/business-rankings).
struct BusinessRankings: Decodable {
    let source: String
    let published: String
    let overallSource: String
    let overallPublished: String
    let entries: [BusinessRankEntry]
}

struct BusinessRankEntry: Decodable, Identifiable {
    let rank: String
    let rankNum: Int
    let name: String
    let country: String
    let city: String
    let overall: String?
    let overallNum: Int?
    let schoolIds: [String]
    var id: String { name }
}

// MARK: - Career guide (/career/roles)

struct CareerRole: Decodable, Identifiable {
    let id: String
    let title: String
    let titleEn: String
    let icon: String
    let color: String
    let tagline: String
    let taglineEn: String
    let description: String
    let descriptionEn: String
    let coreScenario: String
    let coreScenarioEn: String
    let skills: [String]
    let skillsEn: [String]
    let differentiators: [String]
    let differentiatorsEn: [String]
    let certs: [String]
    let certsEn: [String]
    let entry: String
    let entryEn: String
    let career: String
    let careerEn: String
    let salary: String
    let salaryEn: String
    let disclaimer: String
    let disclaimerEn: String
    let typicalDay: [String]
    let typicalDayEn: [String]

    private var zh: Bool { Lang.code == "zh" }
    var displayTitle: String { zh ? title : titleEn }
    var displayTagline: String { zh ? tagline : taglineEn }
    var displayDescription: String { zh ? description : descriptionEn }
    var displayScenario: String { zh ? coreScenario : coreScenarioEn }
    var displaySkills: [String] { zh ? skills : skillsEn }
    var displayDifferentiators: [String] { zh ? differentiators : differentiatorsEn }
    var displayCerts: [String] { zh ? certs : certsEn }
    var displayEntry: String { zh ? entry : entryEn }
    var displayCareer: String { zh ? career : careerEn }
    var displaySalary: String { zh ? salary : salaryEn }
    var displayDisclaimer: String { zh ? disclaimer : disclaimerEn }
    var displayTypicalDay: [String] { zh ? typicalDay : typicalDayEn }

    var tint: Color {
        let h = color.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        guard h.count == 6, let v = UInt32(h, radix: 16) else { return DS.accent }
        return Color(red: Double((v >> 16) & 255) / 255, green: Double((v >> 8) & 255) / 255, blue: Double(v & 255) / 255)
    }
}

struct CareerRolesResponse: Decodable {
    let roles: [CareerRole]
}

// MARK: - Similar trends (/similar/{code}, /us/similar/{symbol})

struct SimilarPeer: Decodable, Identifiable {
    var id: String { code }
    let code: String
    let name: String
    let correlation: Double
    let sparkline: [Double]
}

struct SimilarResponse: Decodable {
    let industry: String?
    let results: [SimilarPeer]
}

// MARK: - Monte Carlo (/simulation/{code})

struct MonteCarloStats: Decodable {
    let expectedReturn: Double
    let stdReturn: Double
    let probGain: Double
    let var95Price: Double
    let var95Pct: Double
    let minPrice: Double
    let maxPrice: Double
    let medianPrice: Double
}

struct MonteCarloResult: Decodable {
    let currentPrice: Double
    let days: Int
    let paths: [String: [Double]]     // "p10" ... "p90"
    let stats: MonteCarloStats
}

struct MonteCarloRequest: Encodable {
    let days: Int
    let simulations: Int
}
