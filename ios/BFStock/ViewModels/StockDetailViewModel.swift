import Foundation

@MainActor
final class StockDetailViewModel: ObservableObject {
    let code: String
    let market: Market

    @Published var quote: RealtimeQuote?
    /// Fetched series, including extra leading days so MA/MACD/BOLL are warmed up at the left edge.
    @Published private var history: [Candle] = []
    /// The visible window for the selected period.
    var candles: [Candle] { Array(history.suffix(period.count)) }
    @Published var period: ChartPeriod = .d30
    @Published var isLoadingQuote = false
    @Published var isLoadingChart = false
    @Published var quoteError: String?
    @Published var chartError: String?

    init(code: String, market: Market) {
        self.code = code
        self.market = market
    }

    @Published var newsItems: [NewsItem] = []
    @Published var newsOverall: NewsOverall?
    @Published var isLoadingNews = false
    @Published var newsError: String?

    func loadAll() async {
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadQuote() }
            group.addTask { await self.loadCandles() }
            group.addTask { await self.loadNews() }
        }
    }

    func loadNews() async {
        isLoadingNews = true
        newsError = nil
        do {
            let mkt = market == .cn ? "cn" : "us"
            let resp: StockNewsResponse = try await APIClient.shared.get("/news/\(code)", params: ["market": mkt])
            newsItems = resp.news
            newsOverall = resp.overall
        } catch {
            newsError = errorMessage(error)
        }
        isLoadingNews = false
    }

    func loadQuote() async {
        isLoadingQuote = true
        quoteError = nil
        do {
            if market == .cn {
                let q: RealtimeQuote = try await APIClient.shared.get("/stocks/\(code)/realtime")
                quote = q
            } else {
                let q: USRealtimeQuote = try await APIClient.shared.get("/us/stock/\(code)/realtime")
                quote = q.toQuote()
            }
        } catch {
            quoteError = errorMessage(error)
        }
        isLoadingQuote = false
    }

    func loadCandles() async {
        isLoadingChart = true
        chartError = nil
        do {
            if market == .cn {
                let hist: StockHistory = try await APIClient.shared.get(
                    "/stocks/\(code)/history", params: ["count": "\(fetchCount)"]
                )
                history = hist.candles
            } else {
                let hist: USStockHistory = try await APIClient.shared.get(
                    "/us/stock/\(code)/history", params: ["count": "\(fetchCount)"]
                )
                history = hist.data.map { $0.toCandle() }
            }
        } catch {
            chartError = errorMessage(error)
        }
        isLoadingChart = false
    }

    /// MACD needs 26 + 9 days before its first value; 60 covers every indicator.
    private var fetchCount: Int { period.count + 60 }

    func changePeriod(_ p: ChartPeriod) {
        period = p
        // A shorter window is already in memory; only fetch when more history is needed.
        if history.count < fetchCount { Task { await loadCandles() } }
    }

    /// Indicator values for the visible window, computed on the full history.
    private func visible(_ series: [Double?]) -> [Double?] { Array(series.suffix(candles.count)) }

    @Published var indicator: Indicator = .none

    // Computed MA series
    var ma5:  [Double?] { visible(history.ma(5))  }
    var ma10: [Double?] { visible(history.ma(10)) }
    var ma20: [Double?] { visible(history.ma(20)) }

    // Technical indicators (computed from the full history)
    var macdTuple: (macdLine: [Double?], signalLine: [Double?], histogram: [Double?]) {
        let m = history.macd()
        return (visible(m.macdLine), visible(m.signalLine), visible(m.histogram))
    }
    var rsi14: [Double?] { visible(history.rsi()) }
    var bollTuple: (upper: [Double?], middle: [Double?], lower: [Double?]) {
        let b = history.bollingerBands()
        return (visible(b.upper), visible(b.middle), visible(b.lower))
    }

    // Y-axis range with 2% padding
    var priceRange: ClosedRange<Double> {
        guard !candles.isEmpty else { return 0...1 }
        let lo = candles.map(\.low).min()!
        let hi = candles.map(\.high).max()!
        let pad = (hi - lo) * 0.02
        return (lo - pad)...(hi + pad)
    }

    var chartPriceRange: ClosedRange<Double> {
        guard indicator == .boll, !candles.isEmpty else { return priceRange }
        let b = bollTuple
        let allUpper = b.upper.compactMap { $0 }
        let allLower = b.lower.compactMap { $0 }
        guard !allUpper.isEmpty else { return priceRange }
        let hi = max(candles.map(\.high).max()!, allUpper.max()!)
        let lo = min(candles.map(\.low).min()!,  allLower.min()!)
        let pad = (hi - lo) * 0.02
        return (lo - pad)...(hi + pad)
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
