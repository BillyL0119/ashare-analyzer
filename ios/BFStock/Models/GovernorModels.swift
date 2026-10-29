import Foundation

// MARK: - Be the Fed chair (/api/governor)
// The server sends only the quarters already played, and the real Fed's rate for a quarter only
// after the student has set theirs. Rates and inflation figures are percentages.

struct GVScenario: Decodable, Identifiable {
    let id: String
    let title: String
    let tagline: String
    let chair: String
    let start: String            // "2021Q2"
    let end: String
    let nDecisions: Int
    let startRate: Double?       // picker list only: the quarter before the start
    let startPce4: Double?
    let startU: Double?
    let progress: GVProgress?    // picker list only, when this device has a run
}

struct GVProgress: Decodable {
    let decision: Int
    let finished: Bool
    let best: Double?            // smallest average miss so far
}

struct GVHistoryRow: Decodable {
    let q: String
    let u: Double
    let un: Double               // natural rate of unemployment (Fed staff estimate)
    let pce4: Double             // PCE inflation over four quarters
    let exp: Double              // long-run expected inflation
    let ff: Double               // fed funds rate, quarterly average
}

struct GVReal: Decodable {
    let ff: Double
    let u: Double
    let pce4: Double
    let exp: Double
}

/// One quarter of the student's economy, with what really happened beside it
struct GVPlayed: Decodable {
    let q: String
    let rate: Double?            // nil for the end quarter, which only shows the last decision's effect
    let u: Double
    let pce4: Double
    let exp: Double
    let un: Double
    let real: GVReal
}

struct GVEvent: Decodable, Identifiable {
    let q: String
    let source: String
    let text: String
    let new: Bool
    var id: String { q + text }
}

/// The decision to make: the rate for quarter `q`, starting from the last one set
struct GVNow: Decodable {
    let q: String
    let rate: Double
    let taylor: Double
}

struct GVSummary: Decodable {
    let miss: Double
    let avgPce4: Double
    let peakPce4: Double
    let endPce4: Double
    let avgU: Double
    let peakU: Double
    let endU: Double
    let endExp: Double
    let avgRate: Double
    let peakRate: Double
}

struct GVResult: Decodable {
    let me: GVSummary
    let fed: GVSummary
    let verdict: String          // better | same | worse
    let lessons: [String]
    let epilogue: String
}

struct GVRun: Decodable {
    let scenario: GVScenario
    let history: [GVHistoryRow]  // the lead-in before the first decision
    let played: [GVPlayed]
    let decision: Int            // decisions made so far
    let finished: Bool
    let events: [GVEvent]        // newest first
    let now: GVNow?              // nil once finished
    let result: GVResult?
}

struct GVBoard: Decodable {
    struct Row: Decodable, Identifiable {
        let rank: Int
        let nickname: String?
        let miss: Double
        let isMe: Bool
        var id: Int { rank }
    }
    let rows: [Row]
    let players: Int
}

struct GVScenarioList: Decodable { let scenarios: [GVScenario] }
struct GVRunEnvelope: Decodable { let run: GVRun? }

struct GVRunBody: Encodable {
    let deviceId: String
    let scenario: String
    let lang: String
}

struct GVDecideBody: Encodable {
    let deviceId: String
    let scenario: String
    let lang: String
    let rate: Double
}
