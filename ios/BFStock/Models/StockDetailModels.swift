import Foundation

struct RealtimeQuote: Decodable {
    let code: String
    let name: String
    let price: Double
    let change: Double
    let pctChange: Double   // percentage: 1.9383 = +1.9383%
    let volume: Double
    let amount: Double
    let high: Double
    let low: Double
    let open: Double
    let prevClose: Double
}

// US realtime has different field names
struct USRealtimeQuote: Decodable {
    let symbol: String
    let name: String
    let price: Double
    let change: Double
    let changePct: Double   // percentage: 0.129 = +0.129%
    let volume: Double

    func toQuote() -> RealtimeQuote {
        RealtimeQuote(
            code: symbol, name: name, price: price,
            change: change, pctChange: changePct,
            volume: volume, amount: 0, high: 0, low: 0,
            open: 0, prevClose: price - change
        )
    }
}

// US history uses {symbol, data:[{date,open,high,low,close,volume}]}
struct USStockHistory: Decodable {
    let symbol: String
    let data: [USCandle]
}

struct USCandle: Decodable {
    let date: String
    let open: Double
    let high: Double
    let low: Double
    let close: Double
    let volume: Double

    func toCandle() -> Candle {
        Candle(date: date, open: open, close: close,
               high: high, low: low,
               volume: volume, amount: 0, pctChange: 0)
    }
}

struct StockHistory: Decodable {
    let symbol: String
    let name: String
    let candles: [Candle]
}

struct Candle: Decodable, Identifiable {
    let date: String
    let open: Double
    let close: Double
    let high: Double
    let low: Double
    let volume: Double
    let amount: Double
    let pctChange: Double   // percentage: 1.51 = +1.51%

    var id: String { date }
    var isUp: Bool { close >= open }

    // Parsed date for Swift Charts x-axis
    var parsedDate: Date {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: date) ?? Date()
    }
}

enum ChartPeriod: String, CaseIterable, Identifiable {
    case d10  = "10日"
    case d30  = "30日"
    case d60  = "60日"
    case d120 = "120日"
    case d250 = "1年"

    var id: String { rawValue }
    var count: Int {
        switch self {
        case .d10:  return 10
        case .d30:  return 30
        case .d60:  return 60
        case .d120: return 120
        case .d250: return 250
        }
    }
}

// Moving average computed over candles array
extension [Candle] {
    func ma(_ n: Int) -> [Double?] {
        enumerated().map { i, _ in
            guard i >= n - 1 else { return nil }
            let window = self[(i - n + 1)...i]
            return window.reduce(0) { $0 + $1.close } / Double(n)
        }
    }
}
