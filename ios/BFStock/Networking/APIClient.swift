import Foundation

// MARK: - Error types

enum APIError: Error, LocalizedError {
    case networkError(Error)
    case httpError(Int, String)
    case decodingError(Error)
    case timeout

    var errorDescription: String? {
        switch self {
        case .networkError(let e):
            return "\(String(localized: "error.network"))：\(e.localizedDescription)"
        case .httpError(let code, let msg):
            return "HTTP \(code)：\(msg.isEmpty ? "服务器错误" : msg)"
        case .decodingError(let e):
            return "\(String(localized: "error.decoding"))：\(e.localizedDescription)"
        case .timeout:
            return String(localized: "error.timeout")
        }
    }
}

// MARK: - APIClient

final class APIClient: @unchecked Sendable {
    static let shared = APIClient()

    private let baseURL = "https://bestfriendstock.com/api"
    private let session: URLSession

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 60
        config.tlsMinimumSupportedProtocolVersion = .TLSv12
        self.session = URLSession(configuration: config)
    }

    // MARK: GET

    func get<T: Decodable>(_ path: String, params: [String: String] = [:], persist: Bool = false) async throws -> T {
        let url = try buildURL(path: path, params: params)
        let request = URLRequest(url: url)
        return try await perform(request, persistKey: persist ? url : nil)
    }

    /// Last successful response for this request, if it is younger than 24 hours.
    func cached<T: Decodable>(_ path: String, params: [String: String] = [:]) -> T? {
        guard let url = try? buildURL(path: path, params: params),
              let data = ResponseCache.load(for: url) else { return nil }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try? decoder.decode(T.self, from: data)
    }

    // MARK: POST

    func post<B: Encodable, T: Decodable>(_ path: String, body: B) async throws -> T {
        let url = try buildURL(path: path)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)
        return try await perform(request)
    }

    // MARK: SSE request builder (used by AI Teacher)

    func sseRequest(path: String, jsonBody: Data) -> URLRequest {
        var request = URLRequest(url: URL(string: baseURL + path)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        request.httpBody = jsonBody
        request.timeoutInterval = 60
        return request
    }

    // MARK: Private helpers

    private func buildURL(path: String, params: [String: String] = [:]) throws -> URL {
        guard var components = URLComponents(string: baseURL + path) else {
            throw URLError(.badURL)
        }
        if !params.isEmpty {
            components.queryItems = params.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = components.url,
              url.scheme == "https", url.host == "bestfriendstock.com" else { throw URLError(.badURL) }
        return url
    }

    private func perform<T: Decodable>(_ request: URLRequest, persistKey: URL? = nil) async throws -> T {
        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw APIError.networkError(URLError(.badServerResponse))
            }
            guard (200...299).contains(http.statusCode) else {
                let msg = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["detail"] as? String
                    ?? String(data: data, encoding: .utf8) ?? ""
                throw APIError.httpError(http.statusCode, msg)
            }
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            do {
                let value = try decoder.decode(T.self, from: data)
                if let key = persistKey { ResponseCache.store(data, for: key) }
                return value
            } catch {
                throw APIError.decodingError(error)
            }
        } catch let e as APIError {
            throw e
        } catch let urlError as URLError where urlError.code == .timedOut {
            throw APIError.timeout
        } catch {
            throw APIError.networkError(error)
        }
    }
}
