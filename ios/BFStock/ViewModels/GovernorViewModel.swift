import Foundation

/// "Be the Fed chair": one run per scenario for this device (the paper-trading device id).
@MainActor
final class GovernorViewModel: ObservableObject {
    @Published var scenarios: [GVScenario]?
    @Published var listError: String?
    @Published var run: GVRun?
    @Published var openError: String?        // the chosen scenario could not be opened
    @Published var error: String?            // last decision failure
    @Published var busy = false
    @Published var board: GVBoard?

    // Starting or playing a run writes run and leaderboard files: test against a local backend
    // (http://127.0.0.1:8004/api/governor), never production.
    private static let base = "https://bestfriendstock.com/api/governor"
    private let deviceID = KeychainHelper.getOrCreateDeviceID()
    private var lang: String { Lang.code }

    func loadScenarios() async {
        do {
            let r: GVScenarioList = try await request("/scenarios", query: ["lang": lang, "device_id": deviceID])
            scenarios = r.scenarios
            listError = nil
        } catch {
            listError = message(error)
            if scenarios == nil { scenarios = [] }
        }
    }

    /// Resume the saved run, or start one (always start when `fresh`).
    func open(_ id: String, fresh: Bool) async {
        run = nil
        board = nil
        openError = nil
        error = nil
        do {
            let body = GVRunBody(deviceId: deviceID, scenario: id, lang: lang)
            var r: GVRun? = nil
            if !fresh {
                let saved: GVRunEnvelope = try await request("/state", body: body)
                r = saved.run
            }
            if r == nil {
                let started: GVRunEnvelope = try await request("/start", body: body)
                r = started.run
            }
            run = r
        } catch {
            openError = message(error)
        }
    }

    func restart() async {
        guard let id = run?.scenario.id else { return }
        board = nil
        await act("/start", GVRunBody(deviceId: deviceID, scenario: id, lang: lang))
    }

    /// Sets this quarter's rate (the server rounds it to a quarter point). Returns whether it went through.
    @discardableResult
    func decide(_ rate: Double) async -> Bool {
        guard let id = run?.scenario.id else { return false }
        return await act("/decide", GVDecideBody(deviceId: deviceID, scenario: id, lang: lang, rate: rate))
    }

    func loadBoard() async {
        guard let id = run?.scenario.id else { return }
        board = try? await request("/leaderboard", query: ["scenario": id, "device_id": deviceID])
    }

    func close() {
        run = nil
        board = nil
        error = nil
        openError = nil
    }

    // MARK: - Requests

    @discardableResult
    private func act<B: Encodable>(_ path: String, _ body: B) async -> Bool {
        busy = true
        error = nil
        defer { busy = false }
        do {
            let r: GVRunEnvelope = try await request(path, body: body)
            if let next = r.run { run = next }
            return true
        } catch {
            self.error = message(error)
            return false
        }
    }

    private struct ServerMessage: Error { let text: String }

    /// The server's own wording for refused actions (HTTP 400 `detail`), otherwise a generic line.
    private func message(_ error: Error) -> String {
        if let m = error as? ServerMessage { return m.text }
        if let e = error as? URLError, e.code == .timedOut { return String(localized: "error.timeout") }
        return L("gv.err")
    }

    private func request<T: Decodable>(_ path: String, query: [String: String] = [:]) async throws -> T {
        var c = URLComponents(string: Self.base + path)!
        c.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        return try await send(URLRequest(url: c.url!))
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
            if let detail = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["detail"] as? String {
                throw ServerMessage(text: detail)
            }
            throw URLError(.badServerResponse)
        }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(T.self, from: data)
    }
}
