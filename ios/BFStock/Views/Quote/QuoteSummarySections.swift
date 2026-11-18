import SwiftUI
import Charts

// MARK: - The website's Summary tab for a US stock, as cards under the price header
//
// Status line, range chart, key statistics, performance vs the S&P 500, analyst snapshot, peers, profile and links
// to the other quote screens. Words come from QuoteText ("summary" and "tabs" sections), as on the website.
// Every card loads on its own: one failing call never blanks the page.

// MARK: - Time helpers (US Eastern)

private enum SummaryTime {
    static let et: TimeZone = TimeZone(identifier: "America/New_York") ?? TimeZone.current
    private static var cache: [String: DateFormatter] = [:]
    private static let lock = NSLock()

    /// `template` is a localized date format template ("jmm", "MMMd", ...), shown in New York time
    static func format(_ ms: Double, _ template: String) -> String {
        lock.lock()
        defer { lock.unlock() }
        let key = template + "|" + Lang.code
        let f: DateFormatter
        if let c = cache[key] {
            f = c
        } else {
            let n = DateFormatter()
            n.locale = Lang.locale
            n.timeZone = et
            n.setLocalizedDateFormatFromTemplate(template)
            cache[key] = n
            f = n
        }
        return f.string(from: Date(timeIntervalSince1970: ms / 1000))
    }

    /// "2026-11-18" in New York
    static func dayKey(_ ms: Double) -> String {
        lock.lock()
        defer { lock.unlock() }
        let key = "daykey"
        let f: DateFormatter
        if let c = cache[key] {
            f = c
        } else {
            let n = DateFormatter()
            n.locale = Locale(identifier: "en_US_POSIX")
            n.timeZone = et
            n.dateFormat = "yyyy-MM-dd"
            cache[key] = n
            f = n
        }
        return f.string(from: Date(timeIntervalSince1970: ms / 1000))
    }

    /// Pre-market, regular and after-hours prices all move (04:00-20:00 ET, weekdays): poll fast then
    static func extendedSessionNow() -> Bool {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = et
        let c = cal.dateComponents([.weekday, .hour, .minute], from: Date())
        guard let wd = c.weekday, wd >= 2, wd <= 6 else { return false }
        let m = (c.hour ?? 0) * 60 + (c.minute ?? 0)
        return m >= 240 && m < 1200
    }
}

// MARK: - Chart data prepared once per answer

private struct SummaryPt: Identifiable {
    let id: Int
    let x: Double
    let y: Double
    let ms: Double
}

private struct SummaryChartData {
    let range: String
    let pts: [SummaryPt]
    let prevClose: Double?
    let color: Color
    let xLo: Double
    let xHi: Double
    let yLo: Double
    let yHi: Double
    let ticks: [Double]
    let tickLabels: [Double: String]
    let timeAxis: Bool

    static func make(_ chart: QuoteChart, range: String) -> SummaryChartData? {
        let raw = chart.points.filter { $0.count >= 2 }
        guard raw.count > 1 else { return nil }
        let timeAxis = range == "1d" && chart.session != nil
        var pts: [SummaryPt] = []
        for (i, p) in raw.enumerated() {
            pts.append(SummaryPt(id: i, x: timeAxis ? p[0] : Double(i), y: p[1], ms: p[0]))
        }
        let prev: Double? = range == "1d" ? chart.prevClose : nil
        var lo = pts.map { $0.y }.min() ?? 0
        var hi = pts.map { $0.y }.max() ?? 1
        if let pc = prev { lo = min(lo, pc); hi = max(hi, pc) }
        var pad = (hi - lo) * 0.08
        if pad <= 0 { pad = abs(hi) * 0.01 }
        if pad <= 0 { pad = 1 }

        var xLo = 0.0
        var xHi = Double(pts.count - 1)
        var ticks: [Double] = []
        var labels: [Double: String] = [:]
        if timeAxis, let s = chart.session {
            xLo = s.openMs
            xHi = s.closeMs
            var t = s.openMs
            while t < s.closeMs - 1 {
                ticks.append(t)
                t += 90 * 60_000
            }
        } else {
            let idx = labelIndexes(pts: pts, range: range)
            for i in idx {
                ticks.append(Double(i))
                labels[Double(i)] = axisLabel(ms: pts[i].ms, range: range)
            }
        }

        let pct = chart.changePct ?? 0
        let color: Color = pct > 0 ? DS.good : (pct < 0 ? DS.bad : Color.primary)
        return SummaryChartData(range: range, pts: pts, prevClose: prev, color: color, xLo: xLo, xHi: xHi,
                                yLo: lo - pad, yHi: hi + pad, ticks: ticks, tickLabels: labels, timeAxis: timeAxis)
    }

    /// 5D labels each day, 1M about five evenly spaced points, longer ranges the first point of each month or year
    private static func labelIndexes(pts: [SummaryPt], range: String) -> [Int] {
        if range == "1m" {
            let step = max(1, pts.count / 5)
            return Array(stride(from: 0, to: pts.count, by: step))
        }
        func key(_ ms: Double) -> String {
            let day = SummaryTime.dayKey(ms)
            if range == "5d" { return day }
            if range == "5y" || range == "10y" { return String(day.prefix(4)) }
            return String(day.prefix(7))
        }
        var seen = Set<String>()
        var out: [Int] = []
        for (i, p) in pts.enumerated() {
            let k = key(p.ms)
            if seen.insert(k).inserted { out.append(i) }
        }
        // a range that starts late in a month would label that sliver and crowd out the next month
        if range != "5d", let first = pts.first, out.first == 0 {
            let dayNum = Int(SummaryTime.dayKey(first.ms).suffix(2)) ?? 1
            if dayNum > 7 { out.removeFirst() }
        }
        return out
    }

    private static func axisLabel(ms: Double, range: String) -> String {
        switch range {
        case "5d": return SummaryTime.format(ms, "EEE")
        case "5y", "10y": return SummaryTime.format(ms, "y")
        case "1m": return SummaryTime.format(ms, "MMMd")
        default: return SummaryTime.format(ms, "MMMyy")
        }
    }

    func label(_ x: Double) -> String {
        if timeAxis { return SummaryTime.format(x, "jmm") }
        return tickLabels[x] ?? ""
    }

    func tip(_ p: SummaryPt) -> String {
        if range == "1d" || range == "5d" { return SummaryTime.format(p.ms, "MMMdjmm") + " ET" }
        return SummaryTime.format(p.ms, "yMMMd")
    }

    func nearest(_ x: Double) -> SummaryPt? {
        var best: SummaryPt?
        var bestD = Double.greatestFiniteMagnitude
        for p in pts {
            let d = abs(p.x - x)
            if d < bestD { bestD = d; best = p }
        }
        return best
    }
}

// MARK: - Models

/// Live quote (polled), and the range charts (cached per range while the view lives)
@MainActor
private final class SummaryModel: ObservableObject {
    let symbol: String
    @Published var live: QuoteLive?
    @Published var liveFailed = false
    @Published var charts: [String: SummaryChartData] = [:]
    @Published var chartFailed: Set<String> = []
    @Published var chartLoading: Set<String> = []
    @Published var chartEmpty: Set<String> = []
    @Published var rangePcts: [String: Double] = [:]
    private var fetched: [String: Date] = [:]
    private var liveLoading = false

    init(symbol: String) { self.symbol = symbol }

    var livePath: String { "/us/quote/\(symbol)/live" }

    func refreshLive() async {
        if liveLoading { return }
        liveLoading = true
        defer { liveLoading = false }
        if live == nil {
            let c: QuoteLive? = APIClient.shared.cached(livePath)
            if let c = c { live = c }
        }
        do {
            let d: QuoteLive = try await APIClient.shared.get(livePath, persist: true)
            live = d
            liveFailed = false
        } catch {
            if live == nil { liveFailed = true }
        }
    }

    func loadChart(_ range: String, force: Bool = false) async {
        if !force, fetched[range] != nil { return }
        if chartLoading.contains(range) { return }
        let path = "/us/quote/\(symbol)/chart"
        let params = ["range": range]
        if charts[range] == nil {
            let c: QuoteChart? = APIClient.shared.cached(path, params: params)
            if let c = c { apply(c, range: range) }
        }
        chartLoading.insert(range)
        chartFailed.remove(range)
        do {
            let c: QuoteChart = try await APIClient.shared.get(path, params: params, persist: true)
            apply(c, range: range)
            fetched[range] = Date()
            if charts[range] == nil { chartEmpty.insert(range) }
        } catch {
            if charts[range] == nil { chartFailed.insert(range) }
        }
        chartLoading.remove(range)
    }

    private func apply(_ c: QuoteChart, range: String) {
        if let d = SummaryChartData.make(c, range: range) { charts[range] = d }
        if let r = c.ranges, range == "1d" || rangePcts.isEmpty {
            var m: [String: Double] = [:]
            for (k, v) in r {
                if let v = v { m[k] = v }
            }
            rangePcts = m
        }
    }

    /// Refresh while the session runs: live every 15 s in the extended session (2 min otherwise), the short charts
    /// about once a minute while the market is not closed. Ends when the view's task is cancelled.
    func run() async {
        while !Task.isCancelled {
            await refreshLive()
            if live?.marketStatus != "closed" {
                for r in ["1d", "5d"] {
                    if let t = fetched[r], Date().timeIntervalSince(t) > 55 { await loadChart(r, force: true) }
                }
            }
            let secs: UInt64 = SummaryTime.extendedSessionNow() ? 15 : 120
            try? await Task.sleep(nanoseconds: secs * 1_000_000_000)
        }
    }
}

/// One endpoint: the saved answer at once, then the network
@MainActor
private final class SummaryLoader<T: Decodable>: ObservableObject {
    @Published var value: T?
    @Published var failed = false
    @Published var loading = false
    let path: String

    init(path: String) { self.path = path }

    func load(force: Bool = false) async {
        if loading { return }
        if value != nil && !force { return }
        if value == nil {
            let c: T? = APIClient.shared.cached(path)
            if let c = c { value = c }
        }
        loading = true
        failed = false
        do {
            let d: T = try await APIClient.shared.get(path, persist: true)
            value = d
        } catch {
            if value == nil { failed = true }
        }
        loading = false
    }
}

// MARK: - Root

struct QuoteSummarySections: View {
    let code: String
    @ObservedObject private var text = QuoteText.shared
    @StateObject private var model: SummaryModel
    @StateObject private var perf: SummaryLoader<QuotePerformance>
    @StateObject private var peers: SummaryLoader<QuotePeers>
    @StateObject private var fund: SummaryLoader<Fundamentals>

    init(code: String) {
        self.code = code
        _model = StateObject(wrappedValue: SummaryModel(symbol: code))
        _perf = StateObject(wrappedValue: SummaryLoader<QuotePerformance>(path: "/us/quote/\(code)/performance"))
        _peers = StateObject(wrappedValue: SummaryLoader<QuotePeers>(path: "/us/quote/\(code)/peers"))
        _fund = StateObject(wrappedValue: SummaryLoader<Fundamentals>(path: "/us/fundamentals/\(code)"))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SummaryStatusLine(model: model)
            SummaryChartCard(model: model)
            SummaryStatsCard(model: model)
            SummaryPerformanceCard(code: code, loader: perf)
            SummaryAnalystsCard(model: model, loader: fund)
            SummaryPeersCard(loader: peers)
            SummaryProfileCard(loader: fund)
            SummaryMoreCard(code: code)
        }
        .task(id: Lang.code) { await QuoteText.shared.ensure(Lang.code) }
        .task { await model.run() }
        .task { await perf.load() }
        .task { await peers.load() }
        .task { await fund.load() }
    }
}

// MARK: - 1. Status line

private struct SummaryStatusLine: View {
    @ObservedObject var model: SummaryModel
    @ObservedObject private var text = QuoteText.shared

    var body: some View {
        if let d = model.live {
            let line = status(d)
            VStack(alignment: .leading, spacing: 2) {
                if !line.isEmpty { Text(line) }
                if let e = d.extended, e.price != nil { extendedLine(e) }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
            .padding(.horizontal, 4)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
        }
    }

    private func status(_ d: QuoteLive) -> String {
        if d.marketStatus == "open", let t = d.tradeTime, !t.isEmpty {
            return fill(text.s("summary", "statusOpen"), ["time": t])
        }
        if let day = d.tradeDate, let t = d.tradeTime, !t.isEmpty {
            return fill(text.s("summary", "statusClosed"), ["date": QuoteFormat.date(day, withYear: false), "time": t])
        }
        if let day = d.tradeDate {
            return fill(text.s("summary", "statusDateOnly"), ["date": QuoteFormat.date(day, withYear: false)])
        }
        return d.asOfText ?? ""
    }

    private func extendedLine(_ e: QuoteLive.Extended) -> Text {
        let label = e.session == "pre" ? text.s("summary", "extPre") : text.s("summary", "extPost")
        var t = Text(label + " ") + Text(QuoteFormat.dollars(e.price)).fontWeight(.medium).foregroundColor(.primary)
        if let p = e.changePct {
            t = t + Text(" " + QuoteFormat.signedPct(p)).foregroundColor(QuoteFormat.changeColor(p))
        }
        if let a = e.asOfText, let r = a.range(of: "\\d{1,2}:\\d{2} [AP]M", options: .regularExpression) {
            t = t + Text("  " + String(a[r]) + " ET")
        }
        return t
    }
}

// MARK: - 2. Range chart

private struct SummaryChartCard: View {
    @ObservedObject var model: SummaryModel
    @ObservedObject private var text = QuoteText.shared
    @State private var range = "1d"

    private static let ranges: [(String, String)] = [
        ("1d", "1D"), ("5d", "5D"), ("1m", "1M"), ("6m", "6M"), ("ytd", "YTD"), ("1y", "1Y"), ("5y", "5Y"), ("10y", "10Y"),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            rangeButtons
            chartArea
            if range == "1d", let d = model.charts["1d"], let pc = d.prevClose {
                Text(fill(text.s("summary", "prevCloseDashed"), ["price": QuoteFormat.dollars(pc)]))
                    .font(.caption2).foregroundStyle(.secondary)
            }
        }
        .card(padding: 12)
        .task(id: range) { await model.loadChart(range) }
    }

    private var rangeButtons: some View {
        HStack(spacing: 2) {
            ForEach(Self.ranges, id: \.0) { r in
                rangeButton(key: r.0, label: r.1)
            }
        }
        .padding(2)
        .background(DS.surfaceHi, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .accessibilityElement(children: .contain)
        .accessibilityLabel(text.s("summary", "chartTitle"))
    }

    private func rangeButton(key: String, label: String) -> some View {
        let v: Double? = model.rangePcts[key]
        let selected = range == key
        return Button {
            range = key
        } label: {
            VStack(spacing: 2) {
                Text(label)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(selected ? Color.primary : Color.secondary)
                Text(pctText(v))
                    .font(.system(size: 9.5).weight(.medium))
                    .monospacedDigit()
                    .foregroundStyle(QuoteFormat.changeColor(v))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
            .background {
                if selected {
                    RoundedRectangle(cornerRadius: 8, style: .continuous).fill(DS.raised)
                        .overlay(RoundedRectangle(cornerRadius: 8, style: .continuous).strokeBorder(DS.stroke))
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label + (v != nil ? " " + QuoteFormat.signedPct(v) : ""))
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private func pctText(_ v: Double?) -> String {
        guard let v = v else { return " " }
        let a = abs(v)
        return QuoteFormat.signedPct(v, digits: a >= 100 ? 0 : (a >= 10 ? 1 : 2))
    }

    @ViewBuilder
    private var chartArea: some View {
        if let d = model.charts[range] {
            SummaryChartView(data: d, title: text.s("summary", "chartTitle"), hint: text.s("summary", "chartHint"))
        } else if model.chartFailed.contains(range) {
            VStack(spacing: 8) {
                Text(text.s("summary", "chartLoadError")).font(.footnote).foregroundStyle(.secondary)
                Button(text.s("summary", "retry")) { Task { await model.loadChart(range, force: true) } }
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(DS.accent)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 250)
        } else if !model.chartEmpty.contains(range) {
            SkeletonBar(height: 250, radius: 10)
        } else {
            Text(text.s("summary", "chartEmpty")).font(.footnote).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
                .frame(height: 250)
        }
    }
}

private struct SummaryChartView: View {
    let data: SummaryChartData
    let title: String
    let hint: String
    @State private var selX: Double?

    private var selected: SummaryPt? {
        guard let x = selX else { return nil }
        return data.nearest(x)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            readout
            chart
                .frame(height: 220)
        }
    }

    private var readout: some View {
        Group {
            if let p = selected {
                HStack {
                    Text(data.tip(p)).foregroundStyle(.secondary)
                    Spacer()
                    Text(QuoteFormat.dollars(p.y)).fontWeight(.semibold).monospacedDigit()
                }
            } else {
                Text(hint).foregroundStyle(.secondary)
            }
        }
        .font(.caption)
        .lineLimit(1)
        .frame(height: 16)
    }

    private var chart: some View {
        let d = data
        let digits = d.yHi < 5 ? 3 : (d.yHi < 1000 ? 2 : 0)
        return Chart {
            ForEach(d.pts) { p in
                AreaMark(x: .value("Time", p.x), yStart: .value("Base", d.yLo), yEnd: .value("Price", p.y))
                    .foregroundStyle(d.color.opacity(0.12))
            }
            ForEach(d.pts) { p in
                LineMark(x: .value("Time", p.x), y: .value("Price", p.y))
                    .foregroundStyle(d.color)
                    .lineStyle(StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round))
            }
            if let pc = d.prevClose {
                RuleMark(y: .value("Previous close", pc))
                    .foregroundStyle(Color.secondary.opacity(0.8))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 3]))
            }
            if let s = selected {
                RuleMark(x: .value("Time", s.x))
                    .foregroundStyle(Color.secondary.opacity(0.6))
                    .lineStyle(StrokeStyle(lineWidth: 1))
                PointMark(x: .value("Time", s.x), y: .value("Price", s.y))
                    .foregroundStyle(d.color)
                    .symbolSize(36)
            }
        }
        .chartXScale(domain: d.xLo...d.xHi)
        .chartYScale(domain: d.yLo...d.yHi)
        .chartXSelection(value: $selX)
        .chartXAxis {
            AxisMarks(values: d.ticks) { value in
                AxisValueLabel {
                    if let x = value.as(Double.self) {
                        Text(d.label(x)).font(.caption2).foregroundStyle(.secondary)
                    }
                }
            }
        }
        .chartYAxis {
            AxisMarks(position: .trailing) { value in
                AxisGridLine().foregroundStyle(DS.stroke)
                AxisValueLabel {
                    if let y = value.as(Double.self) {
                        Text(QuoteFormat.ratio(y, digits: digits)).font(.caption2).foregroundStyle(.secondary)
                    }
                }
            }
        }
        .accessibilityLabel(title)
    }
}

// MARK: - 3. Key statistics

private struct SummaryStatRowData: Identifiable {
    let key: String
    let value: String
    var second: String? = nil
    var bar: Double? = nil
    var id: String { key }
}

private struct SummaryStatsCard: View {
    @ObservedObject var model: SummaryModel
    @ObservedObject private var text = QuoteText.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(text.s("summary", "keyStats")).font(.subheadline.weight(.semibold))
            Text(text.s("summary", "keyStatsHint")).font(.caption).foregroundStyle(.secondary)
            content
                .padding(.top, 6)
        }
        .card(padding: 16)
    }

    @ViewBuilder
    private var content: some View {
        if let d = model.live {
            let rows = statRows(d)
            VStack(spacing: 0) {
                ForEach(Array(rows.enumerated()), id: \.element.id) { i, r in
                    SummaryStatRow(row: r, label: text.s("summary", "lbl_" + r.key))
                    if i < rows.count - 1 { Rectangle().fill(DS.stroke).frame(height: 1) }
                }
            }
        } else if model.liveFailed {
            ErrorRetryView(message: text.s("summary", "loadError")) { Task { await model.refreshLive() } }
        } else {
            SkeletonRows(rows: 8, trailingPill: false)
                .padding(.horizontal, -16)
        }
    }

    private func withSize(_ price: Double?, _ size: Int?) -> String {
        guard let p = price else { return QuoteFormat.dash }
        if let s = size { return QuoteFormat.price(p) + " × " + QuoteFormat.int(Double(s)) }
        return QuoteFormat.price(p)
    }

    private func range(_ lo: Double?, _ hi: Double?, _ price: Double?) -> (String, Double?) {
        guard let lo = lo, let hi = hi else { return (QuoteFormat.dash, nil) }
        var pos: Double? = nil
        if let p = price, hi > lo { pos = min(1, max(0, (p - lo) / (hi - lo))) }
        return (QuoteFormat.price(lo) + " – " + QuoteFormat.price(hi), pos)
    }

    private func statRows(_ d: QuoteLive) -> [SummaryStatRowData] {
        let day = range(d.dayLow, d.dayHigh, d.price)
        let wk = range(d.week52Low, d.week52High, d.price)

        var earnValue = QuoteFormat.dash
        var earnSecond: String? = nil
        if let e = d.earnings, let date = e.date {
            earnValue = QuoteFormat.date(date)
            var parts: [String] = []
            if let t = e.timing { parts.append(text.s("summary", t)) }
            if let eps = e.epsEstimate {
                parts.append(fill(text.s("summary", "epsEstimate"), ["value": QuoteFormat.dollars(eps)]))
            }
            let joined = parts.filter { !$0.isEmpty }.joined(separator: ", ")
            if !joined.isEmpty { earnSecond = joined }
        } else if d.earnings?.announced == false {
            earnValue = text.s("summary", "notAnnounced")
        }

        var div = QuoteFormat.dash
        if let r = d.dividendRate {
            div = QuoteFormat.dollars(r)
            if let y = d.dividendYield { div += " (" + QuoteFormat.pct(y) + ")" }
        }

        return [
            SummaryStatRowData(key: "prev_close", value: QuoteFormat.price(d.prevClose)),
            SummaryStatRowData(key: "open", value: QuoteFormat.price(d.open)),
            SummaryStatRowData(key: "bid", value: withSize(d.bid, d.bidSize)),
            SummaryStatRowData(key: "ask", value: withSize(d.ask, d.askSize)),
            SummaryStatRowData(key: "day_range", value: day.0, bar: day.1),
            SummaryStatRowData(key: "week52_range", value: wk.0, bar: wk.1),
            SummaryStatRowData(key: "volume", value: QuoteFormat.int(d.volume)),
            SummaryStatRowData(key: "avg_volume_3m", value: QuoteFormat.int(d.avgVolume3m)),
            SummaryStatRowData(key: "market_cap", value: QuoteFormat.money(d.marketCap)),
            SummaryStatRowData(key: "beta_5y_monthly", value: QuoteFormat.ratio(d.beta5yMonthly)),
            SummaryStatRowData(key: "pe_ttm", value: QuoteFormat.ratio(d.peTtm)),
            SummaryStatRowData(key: "eps_ttm", value: QuoteFormat.ratio(d.epsTtm)),
            SummaryStatRowData(key: "earnings_date", value: earnValue, second: earnSecond),
            SummaryStatRowData(key: "forward_dividend_yield", value: div),
            SummaryStatRowData(key: "ex_dividend_date", value: d.exDividendDate != nil ? QuoteFormat.date(d.exDividendDate) : QuoteFormat.dash),
            SummaryStatRowData(key: "target_1y", value: QuoteFormat.price(d.target1y)),
        ]
    }
}

private struct SummaryStatRow: View {
    let row: SummaryStatRowData
    let label: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            TermLabel(row.key, label)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 5) {
                Text(row.value)
                    .font(.subheadline)
                    .monospacedDigit()
                    .multilineTextAlignment(.trailing)
                if let s = row.second {
                    Text(s).font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.trailing)
                }
                if let b = row.bar { SummaryRangeBar(pos: b).frame(width: 120, height: 8) }
            }
        }
        .padding(.vertical, 10)
    }
}

/// A thin bar with a dot where the current price sits between the low and the high
private struct SummaryRangeBar: View {
    let pos: Double

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            ZStack(alignment: .leading) {
                Capsule().fill(DS.surfaceHi).frame(height: 3)
                Circle().fill(Color.primary).frame(width: 8, height: 8)
                    .offset(x: max(0, min(w - 8, CGFloat(pos) * w - 4)))
            }
            .frame(maxHeight: .infinity)
        }
        .accessibilityHidden(true)
    }
}

// MARK: - 4. Performance vs the S&P 500

private struct SummaryPerformanceCard: View {
    let code: String
    @ObservedObject var loader: SummaryLoader<QuotePerformance>
    @ObservedObject private var text = QuoteText.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(text.s("summary", "perfTitle")).font(.subheadline.weight(.semibold))
            content
        }
        .card(padding: 16)
    }

    @ViewBuilder
    private var content: some View {
        if let p = loader.value {
            if p.rows.contains(where: { $0.stock != nil || $0.benchmark != nil }) {
                details(p)
            } else {
                Text(text.s("summary", "perfEmpty")).font(.footnote).foregroundStyle(.secondary)
            }
        } else if loader.failed {
            ErrorRetryView(message: text.s("summary", "perfError")) { Task { await loader.load(force: true) } }
        } else {
            SkeletonRows(rows: 4, trailingPill: false).padding(.horizontal, -16)
        }
    }

    private func details(_ p: QuotePerformance) -> some View {
        let vals: [Double] = p.rows.flatMap { [$0.stock, $0.benchmark] }.compactMap { $0 }
        let neg = vals.filter { $0 < 0 }.map { -$0 }.max() ?? 0
        let pos = vals.filter { $0 > 0 }.max() ?? 0
        let bench = p.benchmark?.name == "S&P 500" ? text.s("summary", "sp500") : (p.benchmark?.name ?? "")
        let sentence = sentenceText(p.rows)
        return VStack(alignment: .leading, spacing: 12) {
            Text(text.s("summary", "perfHint")).font(.caption).foregroundStyle(.secondary)
            ForEach(p.rows) { r in
                VStack(alignment: .leading, spacing: 5) {
                    Text(text.s("summary", "perf_" + r.key)).font(.footnote.weight(.medium))
                    SummaryPerfLine(label: code, v: r.stock, neg: neg, pos: pos, color: r.stock.map { $0 >= 0 ? DS.good : DS.bad } ?? Color.secondary, valueColor: true)
                    SummaryPerfLine(label: bench, v: r.benchmark, neg: neg, pos: pos, color: Color.secondary, valueColor: false)
                }
                .accessibilityElement(children: .combine)
            }
            if !sentence.isEmpty { Text(sentence).font(.subheadline) }
            Text(text.s("summary", "perfNote")).font(.caption).foregroundStyle(.secondary)
        }
    }

    private func abs1(_ v: Double) -> String { String(format: "%.1f", abs(v)) }

    private func sentenceText(_ rows: [QuotePerformance.Row]) -> String {
        let both: (QuotePerformance.Row) -> Bool = { $0.stock != nil && $0.benchmark != nil }
        guard let r = rows.first(where: { $0.key == "1y" && both($0) }) ?? rows.first(where: { both($0) }),
              let s = r.stock, let b = r.benchmark else { return "" }
        let base = fill(text.s("summary", "perfSentence"), [
            "period": text.s("summary", "perfPhrase_" + r.key),
            "sym": code,
            "va": s >= 0 ? text.s("summary", "rose") : text.s("summary", "fell"),
            "a": abs1(s),
            "vb": b >= 0 ? text.s("summary", "rose") : text.s("summary", "fell"),
            "b": abs1(b),
        ])
        let diff = s - b
        if abs(diff) < 0.05 { return base }
        let tail = fill(text.s("summary", diff > 0 ? "perfBeat" : "perfTrail"), ["sym": code, "d": abs1(diff)])
        return base + " " + tail
    }
}

private struct SummaryPerfLine: View {
    let label: String
    let v: Double?
    let neg: Double
    let pos: Double
    let color: Color
    let valueColor: Bool

    var body: some View {
        HStack(spacing: 8) {
            Text(label).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                .frame(width: 70, alignment: .leading)
            GeometryReader { geo in
                let range = max(neg + pos, 1e-9)
                let w = geo.size.width
                let zero = CGFloat(neg / range) * w
                let bw = v.map { CGFloat(abs($0) / range) * w } ?? 0
                let x0: CGFloat = (v ?? 0) >= 0 ? zero : zero - bw
                ZStack(alignment: .leading) {
                    Rectangle().fill(DS.surfaceHi).frame(height: 1)
                    Rectangle().fill(color).frame(width: max(bw, v == nil ? 0 : 1), height: 8).offset(x: x0)
                    Rectangle().fill(Color.secondary.opacity(0.5)).frame(width: 1, height: 12).offset(x: zero)
                }
                .frame(maxHeight: .infinity)
            }
            .frame(height: 14)
            .accessibilityHidden(true)
            Text(v == nil ? QuoteFormat.dash : QuoteFormat.signedPct(v, digits: 1))
                .font(.caption.weight(.medium)).monospacedDigit()
                .foregroundStyle(valueColor ? QuoteFormat.changeColor(v) : Color.secondary)
                .frame(width: 58, alignment: .trailing)
                .lineLimit(1).minimumScaleFactor(0.8)
        }
    }
}

// MARK: - 5. Analyst snapshot

private struct SummaryAnalystsCard: View {
    @ObservedObject var model: SummaryModel
    @ObservedObject var loader: SummaryLoader<Fundamentals>
    @ObservedObject private var text = QuoteText.shared

    var body: some View {
        if let f = loader.value {
            if let a = f.analysts, hasData(a) {
                card(a)
            }
        } else if !loader.failed {
            SkeletonRows(rows: 3, trailingPill: false).card(padding: 16)
        }
    }

    private func hasData(_ a: Fundamentals.Analysts) -> Bool {
        a.target != nil || a.targetLow != nil || a.buy + a.hold + a.sell > 0
    }

    private func cell(_ key: String, _ v: Double?) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(text.s("summary", key)).font(.caption).foregroundStyle(.secondary)
            Text(v == nil ? QuoteFormat.dash : QuoteFormat.dollars(v)).font(.subheadline.weight(.medium)).monospacedDigit()
                .lineLimit(1).minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    private func card(_ a: Fundamentals.Analysts) -> some View {
        let price = model.live?.price
        let total = a.buy + a.hold + a.sell
        var upside: Double? = nil
        if let t = a.target, let p = price, p > 0 { upside = (t / p - 1) * 100 }
        return VStack(alignment: .leading, spacing: 12) {
            Text(text.s("summary", "analystsTitle")).font(.subheadline.weight(.semibold))
            Text(text.s("summary", "analystsHint")).font(.caption).foregroundStyle(.secondary)
            if let lo = a.targetLow, let hi = a.targetHigh, hi > lo {
                SummaryTargetScale(low: lo, high: hi, avg: a.target, price: price)
                    .frame(height: 18)
            }
            HStack(alignment: .top, spacing: 8) {
                cell("targetLow", a.targetLow)
                cell("targetAvg", a.target)
                cell("targetNow", price)
                cell("targetHigh", a.targetHigh)
            }
            if let u = upside {
                Text(fill(text.s("summary", u >= 0 ? "upside" : "downside"), ["d": String(format: "%.1f", abs(u))]))
                    .font(.subheadline)
            }
            if total > 0 {
                SummarySplitBar(buy: a.buy, hold: a.hold, sell: a.sell).frame(height: 8)
                HStack(spacing: 16) {
                    legend(a.buy, "buy", DS.good)
                    legend(a.hold, "hold", Color.secondary)
                    legend(a.sell, "sell", DS.bad)
                    Spacer(minLength: 0)
                }
            }
        }
        .card(padding: 16)
    }

    private func legend(_ n: Int, _ key: String, _ c: Color) -> some View {
        HStack(spacing: 5) {
            Circle().fill(c).frame(width: 7, height: 7)
            Text("\(n)").font(.footnote.weight(.semibold)).monospacedDigit()
            Text(text.s("summary", key)).font(.footnote).foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
    }
}

/// Price-target scale: low to high, the average as an accent tick, the current price as a dot
private struct SummaryTargetScale: View {
    let low: Double
    let high: Double
    let avg: Double?
    let price: Double?

    var body: some View {
        GeometryReader { geo in
            let lo = min(low, price ?? low)
            let hi = max(high, price ?? high)
            let w = geo.size.width
            ZStack(alignment: .leading) {
                Capsule().fill(DS.surfaceHi).frame(height: 4)
                if let a = avg {
                    Rectangle().fill(DS.accent).frame(width: 2, height: 14).offset(x: at(a, lo, hi, w) - 1)
                }
                if let p = price {
                    Circle().fill(Color.primary).frame(width: 10, height: 10).offset(x: at(p, lo, hi, w) - 5)
                }
            }
            .frame(maxHeight: .infinity)
        }
        .accessibilityHidden(true)
    }

    private func at(_ v: Double, _ lo: Double, _ hi: Double, _ w: CGFloat) -> CGFloat {
        guard hi > lo else { return 0 }
        return CGFloat(min(1, max(0, (v - lo) / (hi - lo)))) * w
    }
}

private struct SummarySplitBar: View {
    let buy: Int
    let hold: Int
    let sell: Int

    var body: some View {
        GeometryReader { geo in
            let total = max(1, buy + hold + sell)
            let w = geo.size.width
            HStack(spacing: 2) {
                if buy > 0 { Rectangle().fill(DS.good).frame(width: seg(buy, total, w)) }
                if hold > 0 { Rectangle().fill(Color.secondary).frame(width: seg(hold, total, w)) }
                if sell > 0 { Rectangle().fill(DS.bad).frame(width: seg(sell, total, w)) }
            }
            .clipShape(Capsule())
        }
        .accessibilityHidden(true)
    }

    private func seg(_ n: Int, _ total: Int, _ w: CGFloat) -> CGFloat {
        let gaps = CGFloat((buy > 0 ? 1 : 0) + (hold > 0 ? 1 : 0) + (sell > 0 ? 1 : 0) - 1) * 2
        return max(2, (w - max(0, gaps)) * CGFloat(n) / CGFloat(total))
    }
}

// MARK: - 6. Compare to

private struct SummaryPeersCard: View {
    @ObservedObject var loader: SummaryLoader<QuotePeers>
    @ObservedObject private var text = QuoteText.shared

    var body: some View {
        if let d = loader.value {
            if !d.peers.isEmpty { card(d) }
        } else if !loader.failed {
            SkeletonRows(rows: 4, trailingPill: false).card(padding: 16)
        }
    }

    private func card(_ d: QuotePeers) -> some View {
        let hintKey = d.basis == "industry" ? "peersHintIndustry" : "peersHintSector"
        return VStack(alignment: .leading, spacing: 10) {
            Text(text.s("summary", "peersTitle")).font(.subheadline.weight(.semibold))
            Text(fill(text.s("summary", hintKey), ["group": d.group ?? ""])).font(.caption).foregroundStyle(.secondary)
            VStack(spacing: 0) {
                ForEach(Array(d.peers.enumerated()), id: \.element.id) { i, p in
                    NavigationLink {
                        StockDetailView(code: p.symbol, name: p.name ?? p.symbol, market: .us)
                    } label: {
                        row(p)
                    }
                    .buttonStyle(.plain)
                    if i < d.peers.count - 1 { Rectangle().fill(DS.stroke).frame(height: 1) }
                }
            }
        }
        .card(padding: 16)
    }

    private func row(_ p: QuotePeers.Peer) -> some View {
        HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(p.symbol).font(.subheadline.weight(.semibold)).foregroundStyle(DS.accent)
                Text(p.name ?? "").font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 2) {
                Text(p.price == nil ? QuoteFormat.dash : QuoteFormat.dollars(p.price))
                    .font(.subheadline.weight(.medium)).monospacedDigit()
                Text(QuoteFormat.signedPct(p.changePct))
                    .font(.caption.weight(.medium)).monospacedDigit()
                    .foregroundStyle(QuoteFormat.changeColor(p.changePct))
            }
            .frame(minWidth: 78, alignment: .trailing)
            VStack(alignment: .trailing, spacing: 2) {
                Text(QuoteFormat.money(p.marketCap)).font(.subheadline).monospacedDigit()
                Text(text.s("summary", "pe") + " " + QuoteFormat.ratio(p.pe, digits: 1))
                    .font(.caption).foregroundStyle(.secondary).monospacedDigit()
            }
            .frame(minWidth: 70, alignment: .trailing)
        }
        .padding(.vertical, 10)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}

// MARK: - 7. Profile

private struct SummaryProfileCard: View {
    @ObservedObject var loader: SummaryLoader<Fundamentals>
    @ObservedObject private var text = QuoteText.shared
    @State private var open = false

    var body: some View {
        if let f = loader.value {
            let p = f.profile
            let has = (p.description ?? "").isEmpty == false || p.sector != nil || p.industry != nil || p.website != nil
            if has { card(p) }
        } else if !loader.failed {
            SkeletonRows(rows: 3, trailingPill: false).card(padding: 16)
        }
    }

    private func fact(_ key: String, _ v: String) -> some View {
        HStack(alignment: .top) {
            Text(text.s("summary", key)).font(.subheadline).foregroundStyle(.secondary)
            Spacer(minLength: 12)
            Text(v).font(.subheadline).multilineTextAlignment(.trailing)
        }
        .padding(.vertical, 9)
    }

    private func shorten(_ s: String, _ n: Int = 280) -> String {
        if s.count <= n { return s }
        let cut = String(s.prefix(n))
        if let sp = cut.lastIndex(of: " "), cut.distance(from: cut.startIndex, to: sp) >= n - 40 {
            return String(cut[cut.startIndex..<sp]) + "…"
        }
        return cut + "…"
    }

    private func card(_ p: Fundamentals.Profile) -> some View {
        let desc = p.description ?? ""
        let long = desc.count > 280
        var host: String? = nil
        var url: URL? = nil
        if let w = p.website, let u = URL(string: w), let h = u.host {
            url = u
            host = h.hasPrefix("www.") ? String(h.dropFirst(4)) : h
        }
        return VStack(alignment: .leading, spacing: 4) {
            Text(text.s("summary", "profileTitle")).font(.subheadline.weight(.semibold)).padding(.bottom, 4)
            if let s = p.sector, !s.isEmpty { fact("sector", s); Rectangle().fill(DS.stroke).frame(height: 1) }
            if let s = p.industry, !s.isEmpty { fact("industry", s); Rectangle().fill(DS.stroke).frame(height: 1) }
            if let u = url, let h = host {
                HStack {
                    Text(text.s("summary", "website")).font(.subheadline).foregroundStyle(.secondary)
                    Spacer(minLength: 12)
                    Link(h, destination: u).font(.subheadline).foregroundStyle(DS.accent)
                }
                .padding(.vertical, 9)
            }
            if !desc.isEmpty {
                Text(open || !long ? desc : shorten(desc)).font(.subheadline).padding(.top, 6)
                if long {
                    Button(open ? text.s("summary", "less") : text.s("summary", "more")) { open.toggle() }
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(DS.accent)
                        .padding(.top, 2)
                }
            }
        }
        .card(padding: 16)
    }
}

// MARK: - 8. More about {SYMBOL}

private struct SummaryMoreCard: View {
    let code: String
    @ObservedObject private var text = QuoteText.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(code.uppercased()) { EmptyView() }
            VStack(spacing: 0) {
                NavigationLink { QuoteStatisticsView(code: code) } label: { row("tabStatistics") }
                    .buttonStyle(.plain)
                Rectangle().fill(DS.stroke).frame(height: 1)
                NavigationLink { QuoteHistoryView(code: code) } label: { row("tabHistory") }
                    .buttonStyle(.plain)
                Rectangle().fill(DS.stroke).frame(height: 1)
                NavigationLink { QuoteHoldersView(code: code) } label: { row("tabHolders") }
                    .buttonStyle(.plain)
                Rectangle().fill(DS.stroke).frame(height: 1)
                NavigationLink { QuoteAnalystsView(code: code) } label: { row("tabAnalysts") }
                    .buttonStyle(.plain)
            }
            .card(padding: 16)
        }
    }

    private func row(_ key: String) -> some View {
        HStack {
            Text(text.s("tabs", key)).font(.subheadline.weight(.medium))
            Spacer()
            Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.secondary)
        }
        .padding(.vertical, 12)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}
