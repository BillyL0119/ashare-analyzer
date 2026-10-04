import Foundation

@MainActor
final class LearningViewModel: ObservableObject {
    @Published var curricula: [Curriculum] = []
    @Published var selectedKey: String = "alevel"
    @Published var isLoading = false
    @Published var error: String?

    var selected: Curriculum? {
        curricula.first { $0.key == selectedKey }
    }

    func load() async {
        guard curricula.isEmpty else { return }
        isLoading = true
        error = nil
        do {
            let resp: CurriculumResponse = try await APIClient.shared.get("/study/curriculum")
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
