import Foundation

@MainActor
final class PaperTradingViewModel: ObservableObject {
    @Published var account: PaperAccount?
    @Published var isLoading = false
    @Published var error: String?
    @Published var tradeResult: TradeResult?
    @Published var tradeError: String?
    @Published var isTradingBusy = false
    @Published var leaderboard: [LeaderboardEntry] = []
    @Published var leaderboardLoaded = false

    private let deviceID: String

    init() {
        deviceID = KeychainHelper.getOrCreateDeviceID()
    }

    func loadAccount() async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            let encoder = JSONEncoder()
            encoder.keyEncodingStrategy = .convertToSnakeCase
            let body = PaperAccountBody(deviceId: deviceID)
            let data = try encoder.encode(body)
            var req = URLRequest(url: URL(string: "https://bestfriendstock.com/api/paper/account")!)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = data
            req.timeoutInterval = 15
            let (respData, _) = try await URLSession.shared.data(for: req)
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            account = try decoder.decode(PaperAccount.self, from: respData)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func buy(symbol: String, shares: Int, market: Market) async {
        isTradingBusy = true
        tradeError = nil
        tradeResult = nil
        defer { isTradingBusy = false }
        do {
            let body = BuyBody(deviceId: deviceID, symbol: symbol, shares: shares, market: market.rawValue)
            let result: TradeResult = try await postTrade(path: "/paper/buy", body: body)
            tradeResult = result
            await loadAccount()
        } catch let e as APIError {
            tradeError = e.errorDescription
        } catch {
            tradeError = error.localizedDescription
        }
    }

    func sell(symbol: String, shares: Int, market: Market) async {
        isTradingBusy = true
        tradeError = nil
        tradeResult = nil
        defer { isTradingBusy = false }
        do {
            let body = SellBody(deviceId: deviceID, symbol: symbol, shares: shares, market: market.rawValue)
            let result: TradeResult = try await postTrade(path: "/paper/sell", body: body)
            tradeResult = result
            await loadAccount()
        } catch let e as APIError {
            tradeError = e.errorDescription
        } catch {
            tradeError = error.localizedDescription
        }
    }

    func loadLeaderboard(market: Market) async {
        leaderboardLoaded = false
        defer { leaderboardLoaded = true }
        do {
            let entries: [LeaderboardEntry] = try await APIClient.shared.get(
                "/paper/leaderboard", params: ["device_id": deviceID, "market": market.rawValue]
            )
            leaderboard = entries
        } catch {
            leaderboard = []   // non-critical: show the empty state
        }
    }

    func resetAccount() async {
        do {
            let encoder = JSONEncoder()
            encoder.keyEncodingStrategy = .convertToSnakeCase
            let body = PaperAccountBody(deviceId: deviceID)
            let data = try encoder.encode(body)
            var req = URLRequest(url: URL(string: "https://bestfriendstock.com/api/paper/reset")!)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = data
            req.timeoutInterval = 15
            _ = try await URLSession.shared.data(for: req)
            await loadAccount()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func postTrade<B: Encodable, T: Decodable>(path: String, body: B) async throws -> T {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let data = try encoder.encode(body)
        var req = URLRequest(url: URL(string: "https://bestfriendstock.com/api\(path)")!)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = data
        req.timeoutInterval = 15
        let (respData, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.networkError(URLError(.badServerResponse))
        }
        guard (200...299).contains(http.statusCode) else {
            let msg = (try? JSONSerialization.jsonObject(with: respData) as? [String: Any])?["detail"] as? String
                ?? String(data: respData, encoding: .utf8) ?? ""
            throw APIError.httpError(http.statusCode, msg)
        }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        do {
            return try decoder.decode(T.self, from: respData)
        } catch {
            throw APIError.decodingError(error)
        }
    }
}
