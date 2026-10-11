import SwiftUI

// MARK: - Model (/macro/calendar)

struct MacroEvent: Decodable, Identifiable {
    let timeUtc: String?
    let name: String
    let actual: String
    let consensus: String
    let previous: String
    let family: String?
    let importance: Int
    let explain: String?
    let released: Bool
    let period: String?
    var id: String { "\(timeUtc ?? "")|\(name)|\(period ?? "")" }

    var date: Date? {
        guard let timeUtc else { return nil }
        return MacroEvent.parser.date(from: timeUtc)
    }
    private static let parser: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()
}

struct MacroCalendarResponse: Decodable {
    let events: [MacroEvent]
}

// MARK: - View

/// Upcoming market-moving US releases (CPI, jobs, Fed, GDP). Tap a row for what the number means.
struct MacroEventsSection: View {
    @State private var events: [MacroEvent] = []
    @State private var loaded = false
    @State private var open: String?

    var body: some View {
        Group {
            if !loaded || !events.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    SectionHeader(L("重要经济数据"))
                    VStack(spacing: 0) {
                        if !loaded {
                            SkeletonRows(rows: 3, trailingPill: false)
                        } else {
                            ForEach(Array(events.enumerated()), id: \.element.id) { i, e in
                                row(e)
                                if i < events.count - 1 { RowDivider() }
                            }
                        }
                    }
                    .card(padding: 0)
                }
            }
        }
        .task { await load() }
    }

    private func load() async {
        let params = ["country": "us", "days_back": "0", "days_ahead": "14", "min_importance": "3", "lang": Lang.code]
        if let cached: MacroCalendarResponse = APIClient.shared.cached("/macro/calendar", params: params) {
            events = Self.pick(cached.events); loaded = true
        }
        if let r: MacroCalendarResponse = try? await APIClient.shared.get("/macro/calendar", params: params, persist: true) {
            events = Self.pick(r.events)
        }
        loaded = true
    }

    /// One row per release (CPI comes as headline/core x month/year): keep the headline monthly figure.
    static func pick(_ all: [MacroEvent]) -> [MacroEvent] {
        let cutoff = Date().addingTimeInterval(-3 * 3600)
        func rank(_ e: MacroEvent) -> Int { (e.name.lowercased().hasPrefix("core") ? 2 : 0) + (e.period == "yoy" ? 1 : 0) }
        var best: [String: MacroEvent] = [:]
        var order: [String] = []
        for e in all {
            guard let d = e.date, d > cutoff else { continue }
            let k = "\(e.timeUtc ?? "")|\(e.family ?? e.name)"
            if let cur = best[k] {
                if rank(e) < rank(cur) { best[k] = e }
            } else {
                best[k] = e; order.append(k)
            }
        }
        return order.prefix(6).compactMap { best[$0] }
    }

    private func row(_ e: MacroEvent) -> some View {
        Button {
            withAnimation(.snappy(duration: 0.25)) { open = open == e.id ? nil : e.id }
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        if let d = e.date {
                            Text(d, format: .dateTime.month(.abbreviated).day())
                            Text(d, format: .dateTime.hour().minute())
                        }
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(width: 54, alignment: .leading)
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 6) {
                            Text(Self.displayName(e.name)).font(.subheadline.weight(.semibold)).lineLimit(1)
                            if let p = e.period {
                                Text(L(p == "mom" ? "环比" : "同比")).font(.caption2).foregroundStyle(.secondary)
                            }
                        }
                        Text(detail(e)).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    }
                    Spacer(minLength: 4)
                    Image(systemName: open == e.id ? "chevron.up" : "chevron.down")
                        .font(.caption2.weight(.semibold)).foregroundStyle(.tertiary)
                }
                if open == e.id, let ex = e.explain {
                    Text(ex).font(.footnote).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func detail(_ e: MacroEvent) -> String {
        var parts: [String] = []
        if e.released, !e.actual.isEmpty { parts.append("\(L("实际")) \(e.actual)") }
        parts.append("\(L("预期")) \(e.consensus.isEmpty ? "—" : e.consensus)")
        parts.append("\(L("前值")) \(e.previous.isEmpty ? "—" : e.previous)")
        return parts.joined(separator: " · ")
    }

    /// Chinese names for the common releases; other languages keep the official English names.
    static func displayName(_ name: String) -> String {
        guard Lang.code == "zh" else { return name }
        let zh: [String: String] = [
            "Core CPI": "核心CPI", "CPI": "CPI 消费者物价指数", "PPI": "PPI 生产者物价指数", "Core PPI": "核心PPI",
            "Retail Sales": "零售销售", "Core Retail Sales": "核心零售销售", "Initial Jobless Claims": "首次申领失业救济人数",
            "Nonfarm Payrolls": "非农就业人数", "Unemployment Rate": "失业率", "Fed Interest Rate Decision": "美联储利率决议",
            "FOMC Meeting Minutes": "美联储会议纪要", "Beige Book": "美联储褐皮书", "GDP": "GDP 国内生产总值",
            "Core PCE Price Index": "核心PCE物价指数", "PCE price index": "PCE物价指数", "PCE Price index": "PCE物价指数",
            "Michigan Consumer Sentiment": "密歇根大学消费者信心", "CB Consumer Confidence": "世企研究会消费者信心",
            "ISM Manufacturing PMI": "ISM制造业PMI", "ISM Non-Manufacturing PMI": "ISM非制造业PMI",
        ]
        return zh[name] ?? name
    }
}
