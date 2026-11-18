import Foundation

// MARK: - Quote pages: /us/quote/{symbol}/... and /events/... (the website's Yahoo-style US stock tabs)
//
// Decoded by APIClient with convertFromSnakeCase: "beta_5y_monthly" arrives as beta5yMonthly, "week52_low" as
// week52Low, "avg_volume_3m" as avgVolume3m, "target_1y" as target1y. Every figure is optional: the server sends
// null when it cannot source a number honestly, and the app then shows "—".

struct QuoteLive: Decodable, Equatable {
    struct Earnings: Decodable, Equatable {
        let date: String?
        let timing: String?          // "before_open" | "after_close"
        let epsEstimate: Double?
        let announced: Bool?         // false: Nasdaq's vendor has no date yet ("Not announced yet")
    }
    struct Extended: Decodable, Equatable {
        let session: String?         // "pre" | "post"
        let price: Double?
        let change: Double?
        let changePct: Double?
        let asOfText: String?
    }
    let symbol: String
    let name: String?
    let exchange: String?
    let assetClass: String?          // "stocks" | "etf"
    let currency: String?
    let price: Double?
    let change: Double?
    let changePct: Double?
    let prevClose: Double?
    let open: Double?
    let dayLow: Double?
    let dayHigh: Double?
    let week52Low: Double?
    let week52High: Double?
    let volume: Double?
    let avgVolume3m: Double?
    let bid: Double?
    let bidSize: Int?
    let ask: Double?
    let askSize: Int?
    let marketCap: Double?
    let beta5yMonthly: Double?
    let peTtm: Double?
    let epsTtm: Double?
    let earnings: Earnings?
    let dividendRate: Double?
    let dividendYield: Double?
    let exDividendDate: String?
    let target1y: Double?
    let marketStatus: String?        // "pre" | "open" | "post" | "closed"
    let asOfText: String?            // "Nov 18, 2026 11:52 AM ET"
    let tradeDate: String?           // "2026-11-18"
    let tradeTime: String?           // "11:52 AM ET"
    let extended: Extended?
}

/// /us/quote/{symbol}/chart?range=1d|5d|1m|6m|ytd|1y|5y|10y
struct QuoteChart: Decodable {
    struct Session: Decodable {
        let openMs: Double
        let closeMs: Double
    }
    let symbol: String
    let range: String
    let interval: String?
    let points: [[Double]]           // [epoch milliseconds, price]
    let prevClose: Double?           // 1D only: the dashed baseline
    let session: Session?            // 1D only: 9:30-16:00 ET, so a half day draws as half a line
    let change: Double?
    let changePct: Double?
    let ranges: [String: Double?]?   // % change of every range, for the range buttons ("1d", "5d", ..., "10y")
}

/// /us/quote/{symbol}/performance: price change of the stock and of the S&P 500 (SPY) over YTD, 1, 3 and 5 years
struct QuotePerformance: Decodable {
    struct Row: Decodable, Identifiable {
        let key: String              // "ytd" | "1y" | "3y" | "5y"
        let stock: Double?
        let benchmark: Double?
        var id: String { key }
    }
    struct Benchmark: Decodable {
        let symbol: String?
        let name: String?
    }
    let benchmark: Benchmark?
    let basis: String?               // "price": dividends not included
    let asOf: String?
    let rows: [Row]
}

/// /us/quote/{symbol}/peers: companies in the same industry, nearest market cap first
struct QuotePeers: Decodable {
    struct Peer: Decodable, Identifiable {
        let symbol: String
        let name: String?
        let price: Double?
        let changePct: Double?
        let marketCap: Double?
        let pe: Double?
        var id: String { symbol }
    }
    let basis: String?               // "industry" | "sector"
    let group: String?
    let peers: [Peer]
}

/// A figure that is a number for most rows and a date or text for a few ("fiscal_year_end": "2026-09-26")
enum QuoteValue: Decodable, Equatable {
    case number(Double)
    case text(String)

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let d = try? c.decode(Double.self) {
            self = .number(d)
        } else {
            self = .text(try c.decode(String.self))
        }
    }

    var number: Double? { if case .number(let d) = self { return d } else { return nil } }
    var text: String? { if case .text(let s) = self { return s } else { return nil } }
}

/// /us/quote/{symbol}/stats: Yahoo's key-statistics page. Groups and row keys are fixed (the glossary keys);
/// `fmt` says how to print the value (money | price | ratio | pct | signed_pct | compact | int | shares | date | text | x)
struct QuoteStats: Decodable {
    struct Row: Decodable, Identifiable {
        let key: String
        let value: QuoteValue?
        let fmt: String?
        let period: String?          // "ttm" | "mrq" | "fy" | nil
        let asOf: String?            // short interest: the settlement date
        var id: String { key }
    }
    struct Group: Decodable, Identifiable {
        let key: String              // valuation | fiscal | profitability | management | income | balance | cashflow | price_history | shares | dividends
        let rows: [Row]
        var id: String { key }
    }
    let asOf: String?
    let price: Double?
    let groups: [Group]
}

/// /us/quote/{symbol}/history?range=&interval=: rows newest first, prices split-adjusted, adjClose also for dividends
struct QuoteHistory: Decodable {
    struct Bar: Decodable, Identifiable {
        let date: String
        let open: Double?
        let high: Double?
        let low: Double?
        let close: Double?
        let adjClose: Double?
        let volume: Double?
        var id: String { date }
    }
    struct Dividend: Decodable, Identifiable {
        let date: String
        let amount: Double
        var id: String { date }
    }
    let symbol: String
    let range: String?
    let interval: String?
    let from: String?
    let to: String?
    let rows: [Bar]
    let dividends: [Dividend]?
    let adjusted: Bool?
    let dividendData: Bool?
    let dividendSource: String?
}

/// /us/quote/{symbol}/holders
struct QuoteHolders: Decodable {
    struct Position: Decodable {
        let holders: Int?
        let shares: Double?
    }
    struct Positions: Decodable {
        let increased: Position?
        let decreased: Position?
        let held: Position?
        let new: Position?
        let soldOut: Position?
    }
    struct Ownership: Decodable {
        let institutionalPct: Double?
        let institutionalShares: Double?
        let institutionsCount: Int?
        let sharesOutstanding: Double?
        let totalValue: Double?
        let positions: Positions?
    }
    struct Institution: Decodable, Identifiable {
        let name: String?
        let shares: Double?
        let value: Double?
        let changePct: Double?
        let asOf: String?
        var id: String { name ?? UUID().uuidString }
    }
    struct InsiderSummary: Decodable {
        let buys3m: Int?
        let sells3m: Int?
        let buys12m: Int?
        let sells12m: Int?
        let sharesBought3m: Double?
        let sharesSold3m: Double?
        let sharesBought12m: Double?
        let sharesSold12m: Double?
    }
    struct Transaction: Decodable, Identifiable {
        let name: String?
        let relation: String?
        let date: String?
        let type: String?
        let shares: Double?
        let price: Double?
        let value: Double?
        let sharesHeld: Double?
        let direct: Bool?
        let planned: Bool?           // "Automatic Sell/Buy": a pre-planned Rule 10b5-1 trade
        var id: String { "\(name ?? "")|\(date ?? "")|\(shares ?? 0)|\(type ?? "")" }
    }
    struct Insiders: Decodable {
        let summary: InsiderSummary?
        let transactions: [Transaction]?
    }
    struct ShortRow: Decodable, Identifiable {
        let settlementDate: String
        let sharesShort: Double?
        let avgDailyVolume: Double?
        let daysToCover: Double?
        var id: String { settlementDate }
    }
    struct ShortInterest: Decodable {
        let rows: [ShortRow]         // oldest -> newest
        let latestPctOfShares: Double?
    }
    let symbol: String
    let assetClass: String?
    let asOf: String?
    let ownership: Ownership?
    let topInstitutions: [Institution]?
    let insiders: Insiders?
    let shortInterest: ShortInterest?
}

/// /us/quote/{symbol}/analysts (ratings and targets are opinions, not facts)
struct QuoteAnalysts: Decodable {
    struct Rating: Decodable {
        let mean: String?
        let analysts: Int?
        let buy: Int?
        let hold: Int?
        let sell: Int?
    }
    struct Targets: Decodable {
        let low: Double?
        let average: Double?
        let high: Double?
        let current: Double?
    }
    struct HistoryPoint: Decodable, Identifiable {
        let date: String
        let buy: Int?
        let hold: Int?
        let sell: Int?
        let consensus: String?
        let price: Double?
        var id: String { date }
    }
    struct Forecast: Decodable, Identifiable {
        let fiscalEnd: String        // "2027-09" (month only: Nasdaq gives no day)
        let consensus: Double?
        let high: Double?
        let low: Double?
        let estimates: Int?
        let up: Int?
        let down: Int?
        var id: String { fiscalEnd }
    }
    struct Forecasts: Decodable {
        let quarterly: [Forecast]?
        let yearly: [Forecast]?
    }
    struct Peg: Decodable {
        let value: Double?
    }
    let symbol: String
    let assetClass: String?
    let rating: Rating?
    let targets: Targets?
    let history: [HistoryPoint]?
    let forecasts: Forecasts?
    let peg: Peg?
}

// MARK: - Events calendar (/events/week, /events/day)

struct EventsWeek: Decodable {
    struct Counts: Decodable {
        let economic: Int?
        let earnings: Int?
        let ipos: Int?
        let splits: Int?
        let dividends: Int?
    }
    struct Day: Decodable, Identifiable {
        let date: String
        let counts: Counts
        var id: String { date }
    }
    let start: String
    let end: String
    let days: [Day]
}

/// One row of /events/day. The five types share this shape; each fills its own fields.
struct CalendarEventRow: Decodable, Identifiable {
    // earnings, dividends, splits, IPOs
    let symbol: String?
    let name: String?
    // earnings
    let timing: String?              // "before_open" | "after_close"
    let epsEstimate: Double?
    let estimates: Int?
    let lastYearEps: Double?
    let lastYearDate: String?
    let marketCap: Double?
    let fiscalQuarter: String?
    // dividends
    let amount: Double?
    let annual: Double?
    let exDate: String?
    let recordDate: String?
    let paymentDate: String?
    let announcementDate: String?
    // splits
    let ratio: String?
    let effectiveDate: String?
    // IPOs
    let date: String?
    let company: String?
    let exchange: String?
    let priceText: String?
    let price: Double?
    let shares: Double?
    let dealSize: Double?
    let status: String?              // "priced" | "expected" | "filed"
    // economic releases
    let timeUtc: String?
    let country: String?
    let actual: String?
    let consensus: String?
    let previous: String?
    let family: String?
    let importance: Int?
    let explain: String?
    let surprise: String?            // "above" | "below"
    let released: Bool?
    let period: String?              // "mom" | "yoy"

    var id: String {
        [symbol, name, company, timeUtc, period, exDate, effectiveDate, date].compactMap { $0 }.joined(separator: "|")
    }
}

struct EventsDay: Decodable {
    let date: String
    let type: String
    let rows: [CalendarEventRow]
    let error: Bool?
    let note: String?
}
