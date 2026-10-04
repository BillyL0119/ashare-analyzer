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

    enum CodingKeys: String, CodingKey {
        case paperID = "id"
        case title
        case topics
    }
}

struct TopicSummary: Decodable, Identifiable {
    var id: String { topicID }
    let topicID: String
    let title: String
    let estimatedTime: String?
    let sectionCount: Int?

    enum CodingKeys: String, CodingKey {
        case topicID = "id"
        case title
        case estimatedTime
        case sectionCount
    }
}

// Full topic detail
struct TopicDetail: Decodable {
    let id: String
    let title: String
    let estimatedTime: String?
    let sections: [TopicSection]
}

struct TopicSection: Decodable, Identifiable {
    var id: String { heading }
    let heading: String
    let body: String
    let keyTerms: [String]?
    let examTip: String?
    let realWorld: String?
}
