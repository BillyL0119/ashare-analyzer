import SwiftUI

// MARK: - The website's wording for the quote pages and the events calendar
//
// /us/quote/text?lang= returns the strings the website itself uses (frontend/tools/quote_text.mjs exports them at
// every build), grouped by section: summary, stats, holders, history, events, tabs, and glossary (definition and
// formula of every figure). The app shows the same words as the site, and a wording fix needs no app release.
// Kept on disk (ResponseCache) so a second launch has the text before the network answers.
//
// Templates: named slots from the web ("As of {time}. Market open.") and positional ones for strings that are
// functions on the web ("Show all {0}"). Fill them with `fill(_:_:)` / `fill(_:args:)`.

enum TextValue: Decodable, Equatable {
    case text(String)
    case table([String: TextValue])
    case other

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let s = try? c.decode(String.self) {
            self = .text(s)
        } else if let d = try? c.decode([String: TextValue].self) {
            self = .table(d)
        } else {
            self = .other
        }
    }
}

struct GlossaryEntry: Decodable, Equatable {
    let d: String
    let f: String?
}

private struct QuoteTextPayload: Decodable {
    let lang: String
    let summary: [String: TextValue]?
    let stats: [String: TextValue]?
    let holders: [String: TextValue]?
    let history: [String: TextValue]?
    let events: [String: TextValue]?
    let tabs: [String: TextValue]?
    let glossary: [String: GlossaryEntry]?
}

@MainActor
final class QuoteText: ObservableObject {
    static let shared = QuoteText()

    @Published private(set) var lang: String = ""
    @Published private(set) var sections: [String: [String: TextValue]] = [:]
    @Published private(set) var glossary: [String: GlossaryEntry] = [:]
    private var loading: String?

    /// Load the text in `lang` (the app's language) unless it is already there. Call from `.task(id: Lang.code)`.
    func ensure(_ lang: String) async {
        if self.lang == lang && !sections.isEmpty { return }
        if loading == lang { return }
        loading = lang
        defer { loading = nil }
        let params = ["lang": lang]
        if let data = APIClient.shared.cachedData("/us/quote/text", params: params) { apply(data, lang: lang) }
        if let data = try? await APIClient.shared.getData("/us/quote/text", params: params, persist: true) {
            apply(data, lang: lang)
        }
    }

    private func apply(_ data: Data, lang: String) {
        // Plain decoder: the keys are ids such as "pe_ttm" and must not be converted from snake_case
        guard let p = try? JSONDecoder().decode(QuoteTextPayload.self, from: data) else { return }
        sections = [
            "summary": p.summary ?? [:], "stats": p.stats ?? [:], "holders": p.holders ?? [:],
            "history": p.history ?? [:], "events": p.events ?? [:], "tabs": p.tabs ?? [:],
        ]
        glossary = p.glossary ?? [:]
        self.lang = lang
    }

    var isLoaded: Bool { !sections.isEmpty }

    /// The string at section / key / (nested key...), or "" when the text has not arrived or has no such key.
    func s(_ section: String, _ path: String...) -> String {
        var node: TextValue? = sections[section].map { TextValue.table($0) }
        for key in path {
            guard case .table(let t)? = node else { return "" }
            node = t[key]
        }
        if case .text(let s)? = node { return s }
        return ""
    }

    /// The figure's plain-language definition and formula, or nil when the glossary has no entry
    func term(_ key: String) -> GlossaryEntry? { glossary[key] }
}

/// "As of {time}. Market open." + ["time": "11:52 AM ET"]
func fill(_ template: String, _ vars: [String: String]) -> String {
    vars.reduce(template) { $0.replacingOccurrences(of: "{\($1.key)}", with: $1.value) }
}

/// "Show all {0}" + ["24"]
func fill(_ template: String, args: [String]) -> String {
    args.enumerated().reduce(template) { $0.replacingOccurrences(of: "{\($1.offset)}", with: $1.element) }
}

// MARK: - A figure's label that explains itself

/// The label of a figure. When the glossary explains the term it gets a dotted underline and a tap opens the
/// definition and the formula in a small popover; otherwise it is plain text.
struct TermLabel: View {
    let key: String
    let label: String
    @ObservedObject private var text = QuoteText.shared
    @State private var open = false

    init(_ key: String, _ label: String) {
        self.key = key
        self.label = label
    }

    var body: some View {
        if let entry = text.term(key) {
            Button { open = true } label: {
                Text(label)
                    .underline(pattern: .dot, color: .secondary)
                    .multilineTextAlignment(.leading)
            }
            .buttonStyle(.plain)
            .accessibilityHint(entry.d)
            .popover(isPresented: $open) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(label).font(.subheadline.weight(.semibold))
                    Text(entry.d).font(.subheadline)
                    if let f = entry.f, !f.isEmpty {
                        Text(f).font(.footnote).foregroundStyle(.secondary)
                    }
                }
                .fixedSize(horizontal: false, vertical: true)
                .padding(16)
                .frame(idealWidth: 300, maxWidth: 320, alignment: .leading)
                .presentationCompactAdaptation(.popover)
            }
        } else {
            Text(label)
        }
    }
}

// MARK: - Number formats shared by the quote screens (same rules as the website's quotepage/format.js)

enum QuoteFormat {
    static let dash = "—"

    private static func number(_ v: Double, _ digits: Int) -> String {
        v.formatted(.number.precision(.fractionLength(digits)).locale(Lang.locale))
    }

    /// 1,234.56 (prices under $1 get four decimals)
    static func price(_ v: Double?) -> String {
        guard let v, v.isFinite else { return dash }
        return number(v, abs(v) < 1 && v != 0 ? 4 : 2)
    }

    /// $1,234.56
    static func dollars(_ v: Double?) -> String {
        guard let v, v.isFinite else { return dash }
        return "$" + price(v)
    }

    /// $5.14T / $382.4M / $12,345.00 (compact currency notation needs iOS 18: a compact number after "$" instead)
    static func money(_ v: Double?) -> String {
        guard let v, v.isFinite else { return dash }
        if abs(v) < 10_000 { return v.formatted(.currency(code: "USD").locale(Lang.locale)) }
        let digits = abs(v).formatted(.number.notation(.compactName).precision(.fractionLength(0...2)).locale(Lang.locale))
        return (v < 0 ? "−$" : "$") + digits
    }

    /// 42.6M (shares, volume)
    static func compact(_ v: Double?) -> String {
        guard let v, v.isFinite else { return dash }
        return v.formatted(.number.notation(.compactName).precision(.fractionLength(0...2)).locale(Lang.locale))
    }

    /// 12,640,411
    static func int(_ v: Double?) -> String {
        guard let v, v.isFinite else { return dash }
        return v.formatted(.number.precision(.fractionLength(0)).locale(Lang.locale))
    }

    /// 37.62
    static func ratio(_ v: Double?, digits: Int = 2) -> String {
        guard let v, v.isFinite else { return dash }
        return number(v, digits)
    }

    /// 12.34% from a percent number (12.34, not 0.1234)
    static func pct(_ v: Double?, digits: Int = 2) -> String {
        guard let v, v.isFinite else { return dash }
        return String(format: "%.\(digits)f%%", v)
    }

    /// +12.34% / −3.10% (a true minus sign)
    static func signedPct(_ v: Double?, digits: Int = 2) -> String {
        guard let v, v.isFinite else { return dash }
        let sign = v > 0 ? "+" : v < 0 ? "−" : ""
        return sign + String(format: "%.\(digits)f%%", abs(v))
    }

    /// +1.23 / −0.45
    static func signed(_ v: Double?, digits: Int = 2) -> String {
        guard let v, v.isFinite else { return dash }
        let sign = v > 0 ? "+" : v < 0 ? "−" : ""
        return sign + number(abs(v), digits)
    }

    /// "2026-11-18" -> Nov 18, 2026 in the app's language
    static func date(_ iso: String?, withYear: Bool = true) -> String {
        guard let iso, let d = parseDay(iso) else { return dash }
        let style: Date.FormatStyle = withYear
            ? .dateTime.year().month(.abbreviated).day()
            : .dateTime.month(.abbreviated).day()
        return d.formatted(style.locale(Lang.locale))
    }

    /// "2026-11-18" -> a Date at noon UTC (so no time zone shifts the day)
    static func parseDay(_ iso: String) -> Date? {
        let parts = iso.prefix(10).split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        var c = DateComponents()
        c.year = parts[0]; c.month = parts[1]; c.day = parts[2]; c.hour = 12
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC") ?? .current
        return cal.date(from: c)
    }

    /// A value from the stats API, printed by its `fmt` tag
    static func value(_ v: QuoteValue?, fmt: String?) -> String {
        guard let v else { return dash }
        switch (fmt ?? "", v) {
        case ("money", .number(let d)): return money(d)
        case ("price", .number(let d)): return dollars(d)
        case ("ratio", .number(let d)): return ratio(d)
        case ("pct", .number(let d)): return pct(d)
        case ("signed_pct", .number(let d)): return signedPct(d)
        case ("compact", .number(let d)), ("shares", .number(let d)): return compact(d)
        case ("int", .number(let d)): return int(d)
        case ("x", .number(let d)): return ratio(d) + "x"
        case ("date", .text(let s)): return date(s)
        case (_, .text(let s)): return s.isEmpty ? dash : s
        case (_, .number(let d)): return ratio(d)
        }
    }

    /// Rise / fall colour for a US change (green up, red down); neutral for zero or missing
    static func changeColor(_ v: Double?) -> Color {
        guard let v, v != 0 else { return .secondary }
        return v > 0 ? DS.good : DS.bad
    }
}
