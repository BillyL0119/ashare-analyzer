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
    /// "AI 速读": one sentence written by AI in the reader's language
    let aiSummary: String?
    // bank views only
    let banks: [String]?
    let banksZh: [String]?
    let actionType: String?
}

struct NewsFeedResponse: Decodable {
    let items: [NewsFeedItem]
    let aiPending: Int?
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
    /// Either a number (e.g. 710) or a labelled figure (e.g. "730 median (Focus 685)").
    let gmat: String?
    let greAccepted: Bool?
    let toefl: Double?
    let ielts: Double?
    let acceptanceRate: String?
    let deadlines: [String: String]?

    private enum K: String, CodingKey { case gpa, gmatMedian, greAccepted, toefl, ielts, acceptanceRate, deadlines }

    // Fields vary across schools (strings, numbers, nulls): read each one leniently.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: K.self)
        gpa = try? c.decodeIfPresent(String.self, forKey: .gpa)
        if let n = try? c.decodeIfPresent(Double.self, forKey: .gmatMedian) {
            gmat = String(Int(n))
        } else {
            gmat = try? c.decodeIfPresent(String.self, forKey: .gmatMedian)
        }
        greAccepted = try? c.decodeIfPresent(Bool.self, forKey: .greAccepted)
        toefl = try? c.decodeIfPresent(Double.self, forKey: .toefl)
        ielts = try? c.decodeIfPresent(Double.self, forKey: .ielts)
        acceptanceRate = try? c.decodeIfPresent(String.self, forKey: .acceptanceRate)
        deadlines = try? c.decodeIfPresent([String: String].self, forKey: .deadlines)
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
    let nameCn: String?
    let universityCn: String?
    /// Undergraduate entry, checked against official pages (absent when not verified yet)
    let undergrad: UniUndergrad?

    /// 麻省理工学院 · 斯隆管理学院 for Chinese readers, the official English name otherwise.
    var displayName: String {
        guard Lang.code == "zh", let n = nameCn, !n.isEmpty else { return name }
        if let u = universityCn, u != n, !n.contains(String(u.prefix(2))) { return "\(u) · \(n)" }
        return n
    }
}

struct UniUndergrad: Decodable {
    let none: Bool?
    let program: String?
    let length: String?
    let alevel: String?
    let ib: String?
    let english: String?
    let test: String?
    let tuition: String?
    let apply: String?
    let deadline: String?       // "2027-01-13"
    let noteEn: String?
    let noteCn: String?
    let source: String?
    let checked: String?

    var isGraduateOnly: Bool { none == true }
    var note: String? { Lang.code == "zh" ? noteCn : noteEn }

    /// "A-level A*AA · IELTS 7.0" (or the test policy for US schools), for list rows.
    var summary: String? {
        guard !isGraduateOnly else { return nil }
        func first(_ s: String?, _ pattern: String) -> String? {
            guard let s, let r = s.range(of: pattern, options: .regularExpression) else { return nil }
            return String(s[r])
        }
        let grade = first(alevel, "A\\*[A-E*]{2,3}|\\b[A-E][A-E*]{2,4}\\b")
        let ibPts = grade == nil ? first(ib, "\\d{2}(–\\d{2})?") : nil
        let ielts = first(english, "IELTS [0-9.]+")
        var parts = [grade.map { "A-level \($0)" }, ibPts.map { "IB \($0)" }, ielts].compactMap { $0 }
        if parts.isEmpty, let t = test { parts.append(t.components(separatedBy: "(").first!.trimmingCharacters(in: .whitespaces)) }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    var deadlineDate: Date? {
        guard let d = deadline else { return nil }
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.timeZone = .current
        return f.date(from: String(d.prefix(10)))
    }
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

// MARK: - Career guide data (/career/guide), shared with the web Career Guide

/// Text the backend sends in Chinese and English; other app languages fall back to English.
struct LocText: Decodable, Hashable {
    let zh: String
    let en: String
    var text: String { Lang.code == "zh" ? zh : en }
}

struct LocList: Decodable {
    let zh: [String]
    let en: [String]
    var items: [String] { Lang.code == "zh" ? zh : en }
}

struct CareerLadderRow: Decodable {
    let level: LocText
    let years: String
    let base: String
    let allIn: String
}

struct CareerStep: Decodable {
    let when: LocText
    let what: LocText
}

struct TrackMeta: Decodable {
    let short: LocText
    let hours: String
    let entryAllIn: String
    let recruitStart: LocText
    let exits: LocList
    let ladder: [CareerLadderRow]
    let timeline: [CareerStep]
}

struct FirmCategory: Decodable, Identifiable, Hashable {
    let key: String
    let zh: String
    let en: String
    var id: String { key }
    var name: String { Lang.code == "zh" ? zh : en }
}

struct Firm: Decodable, Identifiable {
    let name: String
    let cat: String
    let hq: String
    let ticker: String?
    let known: LocText
    var id: String { name }

    /// (code, market) when the listing is one our stock pages cover (US, A-share, Hong Kong, Tokyo).
    var stock: (code: String, market: Market)? {
        guard let t = ticker else { return nil }
        let parts = t.split(separator: ":", maxSplits: 1).map(String.init)
        guard parts.count == 2, let m = Market(rawValue: parts[0]) else { return nil }
        return (parts[1], m)
    }
    /// Symbol for listings elsewhere (e.g. EQT in Stockholm), shown without a link.
    var otherListing: String? {
        guard let t = ticker, stock == nil else { return nil }
        return t.split(separator: ":").last.map(String.init)
    }
}

struct CareerGuideData: Decodable {
    let meta: [String: TrackMeta]
    let trackFirms: [String: [String]]
    let categories: [FirmCategory]
    let firms: [Firm]
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
