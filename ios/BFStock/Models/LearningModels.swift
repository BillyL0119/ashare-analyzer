import Foundation

struct CurriculumResponse: Decodable {
    let curricula: [Curriculum]
}

struct Curriculum: Decodable, Identifiable {
    var id: String { key }
    let key: String
    let exam: String
    let board: String?
    let papers: [Paper]?

    // For curricula without papers (e.g. stocks), flat topics at top level
    let topics: [TopicSummary]?

    var allTopics: [TopicSummary] {
        if let papers { return papers.flatMap(\.topics) }
        return topics ?? []
    }
}

struct Paper: Decodable, Identifiable {
    var id: String { paperID }
    let paperID: String
    let title: String
    let topics: [TopicSummary]

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: DynamicKey.self)
        paperID = try c.decode(String.self, forKey: DynamicKey(stringValue: "id"))
        title = try c.localized("title")
        topics = try c.decode([TopicSummary].self, forKey: DynamicKey(stringValue: "topics"))
    }
}

struct DynamicKey: CodingKey {
    var stringValue: String
    var intValue: Int? { nil }
    init(stringValue: String) { self.stringValue = stringValue }
    init?(intValue: Int) { nil }
}

extension KeyedDecodingContainer where K == DynamicKey {
    /// Reads `base`, or `base_<lang>` when the app language has a backend translation.
    func localized(_ base: String) throws -> String {
        if let suffix = Lang.contentSuffix,
           let v = try? decodeIfPresent(String.self, forKey: DynamicKey(stringValue: "\(base)\(suffix.prefix(1).uppercased())\(suffix.dropFirst())")),
           !v.isEmpty {
            return v
        }
        return try decode(String.self, forKey: DynamicKey(stringValue: base))
    }

    func localizedIfPresent(_ base: String) -> String? {
        if let suffix = Lang.contentSuffix,
           let v = try? decodeIfPresent(String.self, forKey: DynamicKey(stringValue: "\(base)\(suffix.prefix(1).uppercased())\(suffix.dropFirst())")),
           !v.isEmpty {
            return v
        }
        return try? decodeIfPresent(String.self, forKey: DynamicKey(stringValue: base))
    }
}

struct TopicSummary: Decodable, Identifiable {
    var id: String { topicID }
    let topicID: String
    let title: String
    let estimatedTime: String?
    let sectionCount: Int?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: DynamicKey.self)
        topicID = try c.decode(String.self, forKey: DynamicKey(stringValue: "id"))
        title = try c.localized("title")
        estimatedTime = try c.decodeIfPresent(String.self, forKey: DynamicKey(stringValue: "estimatedTime"))
        sectionCount = try c.decodeIfPresent(Int.self, forKey: DynamicKey(stringValue: "sectionCount"))
    }
}

// Full topic detail
struct TopicDetail: Decodable {
    let id: String
    let title: String
    let estimatedTime: String?
    let sections: [TopicSection]

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: DynamicKey.self)
        id = try c.decode(String.self, forKey: DynamicKey(stringValue: "id"))
        title = try c.localized("title")
        estimatedTime = try c.decodeIfPresent(String.self, forKey: DynamicKey(stringValue: "estimatedTime"))
        sections = try c.decode([TopicSection].self, forKey: DynamicKey(stringValue: "sections"))
    }
}

struct TopicSection: Decodable, Identifiable {
    var id: String { heading }
    let heading: String
    let body: String
    let keyTerms: [String]?
    let examTip: String?
    let realWorld: String?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: DynamicKey.self)
        heading = try c.localized("heading")
        body = try c.localized("body")
        keyTerms = try c.decodeIfPresent([String].self, forKey: DynamicKey(stringValue: "keyTerms"))
        examTip = c.localizedIfPresent("examTip")
        realWorld = c.localizedIfPresent("realWorld")
    }
}
