import Foundation

// MARK: - History time machine (/api/time-machine)
// The server only ever sends what was known on the run's current day: prices up to that day and the
// events that had already happened.

struct TMScenario: Decodable, Identifiable {
    let id: String
    let title: String
    let tagline: String
    let market: String
    let currency: String
    let cash: Double
    let lot: Int
    let startDate: String
    let endDate: String
    let nDays: Int
    let benchmark: String
    let instruments: Int?        // how many can be traded; picker list only
    let progress: TMProgress?    // picker list only, when this device has a run

    var marketValue: Market { Market(rawValue: market) ?? .us }
    var year: String { String(startDate.prefix(4)) }
}

struct TMProgress: Decodable {
    let day: Int
    let finished: Bool
    let returnPct: Double
    let best: Double?
}

struct TMInstrument: Decodable, Identifiable {
    let symbol: String
    let name: String
    let kind: String
    let price: Double?
    let changePct: Double?
    let suspended: Bool
    let closes: [Double?]        // one per run date; nil while suspended
    var id: String { symbol }
}

struct TMPosition: Decodable, Identifiable {
    let symbol: String
    let name: String
    let shares: Double
    let cost: Double
    let price: Double
    let value: Double
    let pl: Double
    let plPct: Double?
    var id: String { symbol }
}

struct TMPortfolio: Decodable {
    let cash: Double
    let value: Double
    let returnPct: Double
    let benchReturnPct: Double
    let positions: [TMPosition]
    let values: [Double]         // from the first day of the window
    let bench: [Double]          // the same money in the index fund
}

struct TMEvent: Decodable, Identifiable {
    let date: String             // the trading day it became known
    let happened: String
    let source: String
    let text: String
    let new: Bool
    var id: String { date + text }
}

/// Dividends and bonus shares paid into the account on an ex-date.
struct TMNote: Decodable, Identifiable {
    let date: String
    let symbol: String
    let text: String
    let cash: Double
    let shares: Double
    let new: Bool
    var id: String { date + symbol }
}

struct TMTrade: Decodable {
    let date: String
    let symbol: String
    let side: String             // buy | sell
    let shares: Double
    let price: Double
    let pl: Double?
}

struct TMExamPoint: Decodable, Identifiable {
    let exam: String
    let point: String
    var id: String { exam }
}

struct TMResult: Decodable {
    let returnPct: Double
    let benchReturnPct: Double
    let maxDrawdownPct: Double
    let benchMaxDrawdownPct: Double
    let trades: Int
    let best: TMTrade?
    let worst: TMTrade?
    let lowDate: String
    let lessons: [String]
    let epilogue: String
    let examPoints: [TMExamPoint]
}

struct TMRun: Decodable {
    let scenario: TMScenario
    let day: Int                 // 0-based day of the window
    let date: String
    let finished: Bool
    let dates: [String]          // lead-in plus the window up to today
    let startIndex: Int          // first day of the window in `dates`
    let instruments: [TMInstrument]
    let portfolio: TMPortfolio
    let events: [TMEvent]        // newest first
    let notes: [TMNote]
    let trades: [TMTrade]        // newest first
    let result: TMResult?
}

struct TMBoard: Decodable {
    struct Row: Decodable, Identifiable {
        let rank: Int
        let nickname: String?
        let returnPct: Double
        let benchReturnPct: Double
        let isMe: Bool
        var id: Int { rank }
    }
    let rows: [Row]
    let players: Int
}

struct TMScenarioList: Decodable { let scenarios: [TMScenario] }
struct TMRunEnvelope: Decodable { let run: TMRun? }

struct TMRunBody: Encodable {
    let deviceId: String
    let scenario: String
    let lang: String
}

struct TMTradeBody: Encodable {
    let deviceId: String
    let scenario: String
    let lang: String
    let symbol: String
    let side: String
    let shares: Int
}

struct TMAdvanceBody: Encodable {
    let deviceId: String
    let scenario: String
    let lang: String
    let days: Int
}

// MARK: - Dates ("2008-09-15") in the app's language

enum TMDate {
    private static let parser: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    static func date(_ iso: String) -> Date? { parser.date(from: iso) }

    /// "Monday, September 15, 2008" style, with the weekday shortened
    static func long(_ iso: String) -> String {
        guard let d = date(iso) else { return iso }
        return d.formatted(.dateTime.year().month(.wide).day().weekday(.abbreviated).locale(Lang.locale))
    }

    static func short(_ iso: String) -> String {
        guard let d = date(iso) else { return iso }
        return d.formatted(.dateTime.year().month(.abbreviated).day().locale(Lang.locale))
    }

    /// Axis label without the year
    static func tick(_ iso: String) -> String {
        guard let d = date(iso) else { return iso }
        return d.formatted(.dateTime.month(.abbreviated).day().locale(Lang.locale))
    }
}
