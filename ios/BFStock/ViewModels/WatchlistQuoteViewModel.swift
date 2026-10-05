import Foundation

@MainActor
final class WatchlistQuoteViewModel: ObservableObject {
    @Published var changePct: Double?
    @Published var price: Double?
    @Published var closes: [Double] = []

    private let code: String
    private let market: Market

    private static var cache: [String: (date: Date, closes: [Double])] = [:]
    private var cacheKey: String { "\(market.rawValue)_\(code)" }

    init(code: String, market: Market) {
        self.code = code
        self.market = market
        if let hit = Self.cache[cacheKey], Date().timeIntervalSince(hit.date) < 300 {
            closes = hit.closes
        }
    }

    var trendPct: Double? {
        guard let first = closes.first, let last = closes.last, first != 0 else { return nil }
        return (last - first) / first * 100
    }

    func load() async {
        async let quote: Void = loadQuote()
        async let history: Void = loadHistory()
        _ = await (quote, history)
    }

    private func loadQuote() async {
        do {
            if market == .cn {
                let q: RealtimeQuote = try await APIClient.shared.get("/stocks/\(code)/realtime")
                price = q.price
                changePct = q.pctChange
            } else {
                let q: USRealtimeQuote = try await APIClient.shared.get("/us/stock/\(code)/realtime")
                price = q.price
                changePct = q.changePct
            }
        } catch {
            // silently ignore — row stays showing "--"
        }
    }

    private func loadHistory() async {
        if let hit = Self.cache[cacheKey], Date().timeIntervalSince(hit.date) < 300 { return }
        do {
            let candles: [Candle]
            if market == .cn {
                let h: StockHistory = try await APIClient.shared.get("/stocks/\(code)/history", params: ["count": "30"])
                candles = h.candles
            } else {
                let h: USStockHistory = try await APIClient.shared.get("/us/stock/\(code)/history", params: ["count": "30"])
                candles = h.data.map { $0.toCandle() }
            }
            let tail = candles.suffix(30).map(\.close)
            guard tail.count > 1 else { return }
            closes = Array(tail)
            Self.cache[cacheKey] = (Date(), closes)
        } catch {
            // sparkline is optional
        }
    }
}
