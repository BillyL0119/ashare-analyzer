import Foundation

@MainActor
final class StockDetailViewModel: ObservableObject {
    let code: String
    let market: Market

    @Published var quote: RealtimeQuote?
    @Published var candles: [Candle] = []
    @Published var period: ChartPeriod = .d30
    @Published var isLoadingQuote = false
    @Published var isLoadingChart = false
    @Published var quoteError: String?
    @Published var chartError: String?

    init(code: String, market: Market) {
        self.code = code
        self.market = market
    }

    func loadAll() async {
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadQuote() }
            group.addTask { await self.loadCandles() }
        }
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
                    "/stocks/\(code)/history", params: ["count": "\(period.count)"]
                )
                candles = hist.candles
            } else {
                let hist: USStockHistory = try await APIClient.shared.get(
                    "/us/stock/\(code)/history", params: ["count": "\(period.count)"]
                )
                candles = hist.data.map { $0.toCandle() }
            }
        } catch {
            chartError = errorMessage(error)
        }
        isLoadingChart = false
    }

    func changePeriod(_ p: ChartPeriod) {
        period = p
        Task { await loadCandles() }
    }

    @Published var indicator: Indicator = .none

    // Computed MA series
    var ma5:  [Double?] { candles.ma(5)  }
    var ma10: [Double?] { candles.ma(10) }
    var ma20: [Double?] { candles.ma(20) }

    // Technical indicators (computed from candles)
    var macdTuple: (macdLine: [Double?], signalLine: [Double?], histogram: [Double?]) {
        candles.macd()
    }
    var rsi14: [Double?] { candles.rsi() }
    var bollTuple: (upper: [Double?], middle: [Double?], lower: [Double?]) {
        candles.bollingerBands()
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
