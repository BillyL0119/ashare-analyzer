import Foundation

/// Classroom mode for students. Classes are joined with the paper-trading device id, so the app's own
/// paper account (not the browser's) is what the teacher sees and what completes the assignments.
@MainActor
final class ClassesViewModel: ObservableObject {
    @Published var classes: [StudentClass]?
    @Published var loadError: String?
    @Published var found: ClassInfo?          // the class a typed code points to
    @Published var joinError: String?
    @Published var busy = false

    // Joining and leaving write the class file: test against a local backend
    // (http://127.0.0.1:8003/api/classes), never production.
    private static let base = "https://bestfriendstock.com/api/classes"
    private let deviceID = KeychainHelper.getOrCreateDeviceID()

    func load() async {
        do {
            let r: StudentClassList = try await request("/student", body: ClassStudentBody(deviceId: deviceID, lang: Lang.code))
            classes = r.classes
            loadError = nil
        } catch {
            loadError = message(error)
            if classes == nil { classes = [] }
        }
    }

    func find(_ code: String) async {
        found = nil
        joinError = nil
        guard code.count == 6 else { return }
        busy = true
        defer { busy = false }
        do {
            found = try await request("/info/\(code)")
        } catch {
            joinError = message(error)
        }
    }

    /// Returns whether the join went through.
    func join(nickname: String) async -> Bool {
        guard let code = found?.code else { return false }
        busy = true
        joinError = nil
        defer { busy = false }
        do {
            let _: ClassJoined = try await request("/join", body: ClassJoinBody(code: code, deviceId: deviceID, nickname: nickname))
            found = nil
            await load()
            return true
        } catch {
            joinError = message(error)
            return false
        }
    }

    func leave(_ c: StudentClass) async {
        busy = true
        defer { busy = false }
        do {
            let _: [String: Bool] = try await request("/leave", body: ClassLeaveBody(classId: c.id, deviceId: deviceID))
        } catch {
            loadError = message(error)
        }
        await load()
    }

    // MARK: - Requests

    private struct ServerMessage: Error {
        let status: Int
        let text: String
    }

    /// The server only speaks English, so the refusals a student can cause get the app's own wording.
    private func message(_ error: Error) -> String {
        if let m = error as? ServerMessage {
            if m.status == 404 { return L("没有找到这个班级码，请向老师确认。") }
            if m.text.hasPrefix("Nickname") { return L("昵称需要 2–16 个字，只能用文字、数字、空格或 - _ . #") }
            if m.text.contains("full") { return L("这个班级已满") }
            return m.text
        }
        if let e = error as? URLError, e.code == .timedOut { return String(localized: "error.timeout") }
        return L("出错了，请稍后再试")
    }

    private func request<T: Decodable>(_ path: String) async throws -> T {
        try await send(URLRequest(url: URL(string: Self.base + path)!))
    }

    private func request<B: Encodable, T: Decodable>(_ path: String, body: B) async throws -> T {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        var req = URLRequest(url: URL(string: Self.base + path)!)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try encoder.encode(body)
        return try await send(req)
    }

    private func send<T: Decodable>(_ req: URLRequest) async throws -> T {
        var req = req
        req.timeoutInterval = 20
        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw URLError(.badServerResponse) }
        guard (200...299).contains(http.statusCode) else {
            let detail = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["detail"] as? String
            if let detail { throw ServerMessage(status: http.statusCode, text: detail) }
            throw URLError(.badServerResponse)
        }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(T.self, from: data)
    }
}
