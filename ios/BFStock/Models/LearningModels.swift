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
    /// Reads `base_<lang>` when the app language has a backend translation, English when this text was
    /// not translated into it (as the website does), then `base`; English again when there is no `base`.
    func localized(_ base: String) throws -> String {
        guard let v = localizedIfPresent(base) else {
            throw DecodingError.keyNotFound(DynamicKey(stringValue: base),
                                            .init(codingPath: codingPath, debugDescription: "No \(base) in any language"))
        }
        return v
    }

    func localizedIfPresent(_ base: String) -> String? {
        if let suffix = Lang.contentSuffix {
            if let v = text("\(base)\(suffix.prefix(1).uppercased())\(suffix.dropFirst())") { return v }
            if suffix != "en", let v = text("\(base)En") { return v }
        }
        if let v = text(base) {
            // Curriculum titles are stored as "中文 / English"; Chinese UI shows the Chinese half.
            if base == "title", Lang.code == "zh", let zh = v.components(separatedBy: " / ").first, zh != v { return zh }
            return v
        }
        return text("\(base)En")
    }

    private func text(_ key: String) -> String? {
        guard let v = try? decodeIfPresent(String.self, forKey: DynamicKey(stringValue: key)), !v.isEmpty else { return nil }
        return v
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

/// The backend's "30 min" in the app's language.
func studyMinutes(_ raw: String) -> String {
    guard let n = raw.split(separator: " ").first.flatMap({ Int($0) }) else { return raw }
    return L("%lld 分钟", n)
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
        body = c.localizedIfPresent("body") ?? ""     // one missing text must not lose the whole topic
        // Key terms exist in zh and en only; any non-Chinese UI gets the English list when present.
        let zhTerms = try c.decodeIfPresent([String].self, forKey: DynamicKey(stringValue: "keyTerms"))
        let enTerms = (try? c.decodeIfPresent([String].self, forKey: DynamicKey(stringValue: "keyTermsEn"))) ?? nil
        keyTerms = Lang.code == "zh" || (enTerms ?? []).isEmpty ? zhTerms : enTerms
        examTip = c.localizedIfPresent("examTip")
        realWorld = c.localizedIfPresent("realWorld")
    }
}
