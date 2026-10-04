import Foundation

@MainActor
final class AITeacherViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var inputText = ""
    @Published var isStreaming = false
    @Published var streamError: String?

    private let deviceID: String
    private var streamTask: Task<Void, Never>?

    init() {
        deviceID = KeychainHelper.getOrCreateDeviceID()
    }

    func send() {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isStreaming else { return }
        inputText = ""
        streamError = nil

        let userMsg = ChatMessage(role: "user", content: text)
        messages.append(userMsg)

        let assistantMsg = ChatMessage(role: "assistant", content: "", isStreaming: true)
        messages.append(assistantMsg)
        let assistantIndex = messages.count - 1

        isStreaming = true

        let history = messages.dropLast(2).map {
            ChatRequestBody.HistoryItem(role: $0.role, content: $0.content)
        }

        let body = ChatRequestBody(message: text, deviceId: deviceID, history: Array(history))
        guard let bodyData = try? JSONEncoder().encodeSnakeCase(body) else { return }

        let request = APIClient.shared.sseRequest(path: "/ai/chat", jsonBody: bodyData)

        streamTask = Task { [weak self] in
            guard let self else { return }
            do {
                let (asyncBytes, response) = try await URLSession.shared.bytes(for: request)
                guard let http = response as? HTTPURLResponse,
                      (200...299).contains(http.statusCode) else {
                    await MainActor.run { self.finishStream(at: assistantIndex, error: "服务器错误") }
                    return
                }

                var buffer = ""
                for try await byte in asyncBytes {
                    guard !Task.isCancelled else { break }
                    buffer.append(Character(UnicodeScalar(byte)))
                    while let newline = buffer.firstIndex(of: "\n") {
                        let line = String(buffer[buffer.startIndex..<newline])
                        buffer.removeSubrange(buffer.startIndex...newline)

                        guard line.hasPrefix("data: ") else { continue }
                        let json = String(line.dropFirst(6))
                        guard let data = json.data(using: .utf8),
                              let chunk = try? JSONDecoder().decode(SSEChunk.self, from: data) else { continue }

                        if let textPart = chunk.text {
                            await MainActor.run {
                                if assistantIndex < self.messages.count {
                                    self.messages[assistantIndex].content += textPart
                                }
                            }
                        }
                        if chunk.done == true { break }
                        if let err = chunk.error {
                            await MainActor.run { self.finishStream(at: assistantIndex, error: err) }
                            return
                        }
                    }
                }
                await MainActor.run { self.finishStream(at: assistantIndex, error: nil) }
            } catch {
                await MainActor.run {
                    self.finishStream(at: assistantIndex, error: error.localizedDescription)
                }
            }
        }
    }

    private func finishStream(at index: Int, error: String?) {
        if index < messages.count {
            messages[index].isStreaming = false
            if let error {
                messages[index].content = messages[index].content.isEmpty ? "出错了：\(error)" : messages[index].content
            }
        }
        isStreaming = false
        if let error { streamError = error }
    }

    func stopStream() {
        streamTask?.cancel()
        streamTask = nil
        if let last = messages.indices.last, messages[last].isStreaming {
            messages[last].isStreaming = false
        }
        isStreaming = false
    }

    func clearHistory() {
        messages.removeAll()
        streamError = nil
    }
}

// SSEChunk defined here for file-scoping
private struct SSEChunk: Decodable {
    let text: String?
    let done: Bool?
    let error: String?
}

// JSONEncoder with snake_case encoding
private extension JSONEncoder {
    func encodeSnakeCase<T: Encodable>(_ value: T) throws -> Data {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        return try encoder.encode(value)
    }
}
