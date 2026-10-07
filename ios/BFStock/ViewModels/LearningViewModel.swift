import Foundation

@MainActor
final class LearningViewModel: ObservableObject {
    @Published var curricula: [Curriculum] = []
    @Published var selectedKey: String = "stocks"
    @Published var isLoading = false
    @Published var error: String?
    private var didRefresh = false

    var selected: Curriculum? {
        curricula.first { $0.key == selectedKey }
    }

    func load() async {
        guard curricula.isEmpty || !didRefresh else { return }
        defer { didRefresh = true }
        isLoading = true
        error = nil
        if let c: CurriculumResponse = APIClient.shared.cached("/study/curriculum") { curricula = c.curricula }
        do {
            let resp: CurriculumResponse = try await APIClient.shared.get("/study/curriculum", persist: true)
            curricula = resp.curricula
        } catch {
            self.error = errorMessage(error)
        }
        isLoading = false
    }

    private func errorMessage(_ error: Error) -> String {
        if let api = error as? APIError {
            switch api {
            case .timeout: return String(localized: "error.timeout")
            case .networkError: return String(localized: "error.network")
            default: return String(localized: "error.decoding")
            }
        }
        return error.localizedDescription
    }
}

@MainActor
final class TopicViewModel: ObservableObject {
    @Published var topic: TopicDetail?
    @Published var isLoading = false
    @Published var error: String?

    func load(exam: String, topicID: String) async {
        isLoading = true
        error = nil
        do {
            let t: TopicDetail = try await APIClient.shared.get("/study/topic/\(exam)/\(topicID)")
            topic = t
        } catch {
            self.error = errorMessage(error)
        }
        isLoading = false
    }

    private func errorMessage(_ error: Error) -> String {
        if let api = error as? APIError {
            switch api {
            case .timeout: return String(localized: "error.timeout")
            case .networkError: return String(localized: "error.network")
            default: return String(localized: "error.decoding")
            }
        }
        return error.localizedDescription
    }
}

@MainActor
final class LearningProgressStore: ObservableObject {
    static let shared = LearningProgressStore()
    private let key = "learningProgress.v1"

    @Published private(set) var done: Set<String> = []

    private init() {
        if let arr = UserDefaults.standard.array(forKey: key) as? [String] { done = Set(arr) }
    }

    private func token(_ exam: String, _ topicID: String) -> String { "\(exam)/\(topicID)" }

    func isDone(_ exam: String, _ topicID: String) -> Bool { done.contains(token(exam, topicID)) }

    func toggle(_ exam: String, _ topicID: String) {
        let t = token(exam, topicID)
        if done.contains(t) { done.remove(t) } else { done.insert(t) }
        UserDefaults.standard.set(Array(done), forKey: key)
    }

    func count(exam: String, topics: [TopicSummary]) -> Int {
        topics.filter { isDone(exam, $0.topicID) }.count
    }
}
