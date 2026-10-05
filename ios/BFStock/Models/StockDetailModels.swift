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
    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    var parsedDate: Date { Self.dayFormatter.date(from: date) ?? Date() }
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

enum Indicator: String, CaseIterable, Identifiable {
    case none, macd, rsi, boll
    var id: String { rawValue }
    var label: String {
        switch self {
        case .none: return "指标"
        case .macd: return "MACD"
        case .rsi:  return "RSI"
        case .boll: return "BOLL"
        }
    }
}

// Technical indicator calculations on candle arrays
extension [Candle] {
    func ma(_ n: Int) -> [Double?] {
        enumerated().map { i, _ in
            guard i >= n - 1 else { return nil }
            let window = self[(i - n + 1)...i]
            return window.reduce(0) { $0 + $1.close } / Double(n)
        }
    }

    func ema(_ n: Int) -> [Double?] {
        var out = [Double?](repeating: nil, count: count)
        guard count >= n else { return out }
        let k = 2.0 / Double(n + 1)
        let seed = self[0..<n].reduce(0.0) { $0 + $1.close } / Double(n)
        out[n - 1] = seed
        var prev = seed
        for i in n..<count {
            prev = self[i].close * k + prev * (1 - k)
            out[i] = prev
        }
        return out
    }

    func macd(fast: Int = 12, slow: Int = 26, signal: Int = 9)
        -> (macdLine: [Double?], signalLine: [Double?], histogram: [Double?])
    {
        let ema12 = ema(fast), ema26 = ema(slow)
        var macdLine  = [Double?](repeating: nil, count: count)
        for i in 0..<count {
            if let f = ema12[i], let s = ema26[i] { macdLine[i] = f - s }
        }
        var signalLine = [Double?](repeating: nil, count: count)
        var histogram  = [Double?](repeating: nil, count: count)
        let sk = 2.0 / Double(signal + 1)
        var prev: Double? = nil
        var seen = 0, sum = 0.0
        for i in 0..<count {
            guard let m = macdLine[i] else { continue }
            seen += 1
            if seen < signal {
                sum += m
            } else if seen == signal {
                prev = (sum + m) / Double(signal)
                signalLine[i] = prev; histogram[i] = m - prev!
            } else {
                prev = m * sk + prev! * (1 - sk)
                signalLine[i] = prev; histogram[i] = m - prev!
            }
        }
        return (macdLine, signalLine, histogram)
    }

    func rsi(_ n: Int = 14) -> [Double?] {
        var out = [Double?](repeating: nil, count: count)
        guard count > n else { return out }
        var avgGain = 0.0, avgLoss = 0.0
        for i in 1...n {
            let d = self[i].close - self[i - 1].close
            if d > 0 { avgGain += d } else { avgLoss -= d }
        }
        avgGain /= Double(n); avgLoss /= Double(n)
        out[n] = avgLoss == 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
        for i in (n + 1)..<count {
            let d = self[i].close - self[i - 1].close
            avgGain = (avgGain * Double(n - 1) + Swift.max(d, 0))  / Double(n)
            avgLoss = (avgLoss * Double(n - 1) + Swift.max(-d, 0)) / Double(n)
            out[i] = avgLoss == 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
        }
        return out
    }

    func bollingerBands(_ n: Int = 20, multiplier: Double = 2.0)
        -> (upper: [Double?], middle: [Double?], lower: [Double?])
    {
        var upper  = [Double?](repeating: nil, count: count)
        var middle = [Double?](repeating: nil, count: count)
        var lower  = [Double?](repeating: nil, count: count)
        for i in (n - 1)..<count {
            let window = self[(i - n + 1)...i]
            let sma = window.reduce(0.0) { $0 + $1.close } / Double(n)
            let std = sqrt(window.reduce(0.0) { $0 + pow($1.close - sma, 2) } / Double(n))
            middle[i] = sma
            upper[i]  = sma + multiplier * std
            lower[i]  = sma - multiplier * std
        }
        return (upper, middle, lower)
    }
}
