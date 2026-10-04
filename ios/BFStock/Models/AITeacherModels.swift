import Foundation

struct ChatMessage: Identifiable, Codable {
    let id: UUID
    let role: String     // "user" | "assistant"
    var content: String
    var isStreaming: Bool

    init(id: UUID = UUID(), role: String, content: String, isStreaming: Bool = false) {
        self.id = id
        self.role = role
        self.content = content
        self.isStreaming = isStreaming
    }
}

struct ChatRequestBody: Encodable {
    let message: String
    let deviceId: String
    let history: [HistoryItem]

    struct HistoryItem: Encodable {
        let role: String
        let content: String
    }
}

