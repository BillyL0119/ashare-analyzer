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
    @Published var performance: [String: PaperPerformance] = [:]   // by market raw value, or "g:<id>"
    @Published var gameAccount: PaperGameAccount?
    @Published var gameError: String?

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

    /// Value curve vs the market, rebuilt by the server from the trades. Kept by market (or competition).
    func loadPerformance(market: Market, gameId: String? = nil) async {
        if let p: PaperPerformance = try? await postTrade(path: "/paper/performance",
                                                          body: PerformanceBody(deviceId: deviceID, market: market.rawValue, gameId: gameId)) {
            performance[gameId.map { "g:\($0)" } ?? market.rawValue] = p
        }
    }

    // MARK: - Order desk

    /// Any order type; market orders fill now while the exchange is open, the rest wait for their price.
    func placeOrder(_ body: (String) -> OrderBody) async {
        isTradingBusy = true
        tradeError = nil
        tradeResult = nil
        defer { isTradingBusy = false }
        do {
            let result: TradeResult = try await postTrade(path: "/paper/order", body: body(deviceID))
            tradeResult = result
            await refresh()
        } catch let e as APIError {
            tradeError = e.errorDescription
        } catch {
            tradeError = error.localizedDescription
        }
    }

    func cancel(_ order: PaperOrder, gameId: String?) async {
        tradeResult = nil
        do {
            let result: TradeResult = try await postTrade(path: "/paper/order/cancel",
                                                          body: CancelOrderBody(deviceId: deviceID, orderId: order.id, gameId: gameId))
            tradeResult = result
            await refresh()
        } catch let e as APIError {
            tradeError = e.errorDescription
        } catch {
            tradeError = error.localizedDescription
        }
    }

    /// Reload the account, and the open competition if one is showing.
    func refresh() async {
        await loadAccount()
        if let gid = gameAccount?.game.id { await loadGame(gid) }
    }

    // MARK: - Competitions

    func loadGame(_ id: String) async {
        do {
            gameAccount = try await postTrade(path: "/paper/games/account", body: GameIdBody(deviceId: deviceID, gameId: id))
        } catch let e as APIError {
            gameError = e.errorDescription
        } catch {
            gameError = error.localizedDescription
        }
    }

    func joinGame(code: String, nickname: String?) async throws -> PaperGame {
        let r: GameWrapper = try await postTrade(path: "/paper/games/join", body: GameJoinBody(deviceId: deviceID, code: code, nickname: nickname))
        await loadAccount()
        return r.game
    }

    func createGame(_ make: (String) -> GameCreateBody) async throws -> PaperGame {
        let r: GameWrapper = try await postTrade(path: "/paper/games/create", body: make(deviceID))
        await loadAccount()
        return r.game
    }

    func leaveGame(_ game: PaperGame) async {
        struct OK: Decodable { let success: Bool }
        do {
            let _: OK = try await postTrade(path: game.isOwner == true ? "/paper/games/delete" : "/paper/games/leave",
                                            body: GameIdBody(deviceId: deviceID, gameId: game.id))
            gameAccount = nil
            await loadAccount()
        } catch let e as APIError {
            gameError = e.errorDescription
        } catch {
            gameError = error.localizedDescription
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
