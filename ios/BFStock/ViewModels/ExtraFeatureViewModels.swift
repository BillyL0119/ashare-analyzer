import Foundation

@MainActor
final class StockScoreViewModel: ObservableObject {
    @Published var score: StockScore?
    @Published var isLoading = false
    @Published var failed = false
    private let symbol: String

    init(symbol: String) { self.symbol = symbol }

    func load() async {
        guard score == nil else { return }
        isLoading = true
        failed = false
        do {
            score = try await APIClient.shared.get("/stock/score/\(symbol)")
        } catch {
            failed = true
        }
        isLoading = false
    }
}

@MainActor
final class NewsFeedViewModel: ObservableObject {
    enum Feed: String { case daily = "/news/daily", banks = "/news/bank-views" }

    @Published var items: [Feed: [NewsFeedItem]] = [:]
    @Published var loading: Set<String> = []
    @Published var error: String?

    func load(_ feed: Feed, force: Bool = false) async {
        if !force, items[feed] != nil { return }
        if items[feed] == nil, let c: NewsFeedResponse = APIClient.shared.cached(feed.rawValue) { items[feed] = c.items }
        loading.insert(feed.rawValue)
        error = nil
        do {
            let r: NewsFeedResponse = try await APIClient.shared.get(feed.rawValue, persist: true)
            items[feed] = r.items
        } catch {
            if items[feed] == nil { self.error = error.localizedDescription }
        }
        loading.remove(feed.rawValue)
    }
}

@MainActor
final class DailyKnowledgeViewModel: ObservableObject {
    @Published var knowledge: DailyKnowledge?

    func load() async {
        if knowledge == nil, let c: DailyKnowledge = APIClient.shared.cached("/knowledge/today") { knowledge = c }
        if let k: DailyKnowledge = try? await APIClient.shared.get("/knowledge/today", persist: true) { knowledge = k }
    }
}

@MainActor
final class UniversitiesViewModel: ObservableObject {
    @Published var all: [University] = []
    @Published var isLoading = false
    @Published var error: String?

    func load() async {
        if all.isEmpty, let c: [University] = APIClient.shared.cached("/universities") { all = c }
        guard all.isEmpty else { return }
        isLoading = true
        error = nil
        do {
            all = try await APIClient.shared.get("/universities", persist: true)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

@MainActor
final class CareerViewModel: ObservableObject {
    @Published var roles: [CareerRole] = []
    @Published var isLoading = false
    @Published var error: String?

    func load() async {
        if roles.isEmpty, let c: CareerRolesResponse = APIClient.shared.cached("/career/roles") { roles = c.roles }
        guard roles.isEmpty else { return }
        isLoading = true
        error = nil
        do {
            let r: CareerRolesResponse = try await APIClient.shared.get("/career/roles", persist: true)
            roles = r.roles
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

/// Streaming mock interview (POST /career/mock-interview, same SSE format as the AI teacher).
@MainActor
final class MockInterviewViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var inputText = ""
    @Published var isStreaming = false
    @Published var started = false
    @Published var interviewType = "technical"

    private let roleID: String
    private let deviceID = KeychainHelper.getOrCreateDeviceID()
    private var task: Task<Void, Never>?

    init(roleID: String) { self.roleID = roleID }

    func start() {
        guard !started else { return }
        started = true
        messages = []
        request()
    }

    func reset() {
        task?.cancel()
        messages = []
        started = false
        isStreaming = false
        inputText = ""
    }

    func send() {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isStreaming else { return }
        inputText = ""
        messages.append(ChatMessage(role: "user", content: text))
        request()
    }

    private struct Body: Encodable {
        let role: String
        let interviewType: String
        let history: [[String: String]]
        let deviceId: String
        let lang: String
    }

    private struct Chunk: Decodable { let text: String?; let done: Bool?; let error: String? }

    private func request() {
        let history = messages.map { ["role": $0.role, "content": $0.content] }
        messages.append(ChatMessage(role: "assistant", content: "", isStreaming: true))
        let idx = messages.count - 1
        isStreaming = true

        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        guard let data = try? encoder.encode(Body(role: roleID, interviewType: interviewType, history: history, deviceId: deviceID, lang: Lang.code == "zh" ? "zh" : "en")) else { return }
        let req = APIClient.shared.sseRequest(path: "/career/mock-interview", jsonBody: data)

        task = Task { [weak self] in
            guard let self else { return }
            var failure: String?
            do {
                let (bytes, resp) = try await URLSession.shared.bytes(for: req)
                guard let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
                    await MainActor.run { self.finish(idx, error: L("服务器错误")) }
                    return
                }
                var buffer = Data()
                for try await byte in bytes {
                    guard !Task.isCancelled else { break }
                    if byte != UInt8(ascii: "\n") { buffer.append(byte); continue }
                    let line = String(decoding: buffer, as: UTF8.self)
                    buffer.removeAll(keepingCapacity: true)
                    guard line.hasPrefix("data: "), let d = String(line.dropFirst(6)).data(using: .utf8),
                          let chunk = try? JSONDecoder().decode(Chunk.self, from: d) else { continue }
                    if let t = chunk.text {
                        await MainActor.run { if idx < self.messages.count { self.messages[idx].content += t } }
                    }
                    if let e = chunk.error { failure = e; break }
                    if chunk.done == true { break }
                }
            } catch {
                failure = error.localizedDescription
            }
            await MainActor.run { self.finish(idx, error: failure) }
        }
    }

    private func finish(_ idx: Int, error: String?) {
        if idx < messages.count {
            messages[idx].isStreaming = false
            if let error, messages[idx].content.isEmpty { messages[idx].content = L("出错了：%@", error) }
        }
        isStreaming = false
    }
}

@MainActor
final class SimilarViewModel: ObservableObject {
    @Published var peers: [SimilarPeer] = []
    @Published var industry: String?
    @Published var isLoading = false
    @Published var failed = false
    private let code: String
    private let market: Market

    init(code: String, market: Market) { self.code = code; self.market = market }

    func load() async {
        guard peers.isEmpty else { return }
        isLoading = true
        failed = false
        do {
            let path = market == .us ? "/us/similar/\(code)" : "/similar/\(code)"
            let r: SimilarResponse = try await APIClient.shared.get(path)
            peers = r.results
            industry = r.industry
        } catch {
            failed = true
        }
        isLoading = false
    }
}
