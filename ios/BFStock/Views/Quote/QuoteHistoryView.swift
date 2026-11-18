import SwiftUI

// Historical data tab: range and interval pickers, a compact table, CSV export.
// Same content as the website's QuoteHistory.jsx; the CSV is built exactly like historyCsv.js.

private let historyRanges: [String] = ["1m", "3m", "6m", "ytd", "1y", "2y", "5y", "10y"]
private let historyIntervals: [String] = ["1d", "1wk", "1mo"]
private let historyPage = 100

// MARK: - CSV (historyCsv.js)

private enum HistoryCSV {
    static func cell(_ v: Double?) -> String {
        guard let v, v.isFinite else { return "" }
        if v == v.rounded() && abs(v) < 1e15 { return String(Int64(v)) }
        return "\(v)"
    }

    static func history(_ rows: [QuoteHistory.Bar]) -> String {
        var lines: [String] = ["Date,Open,High,Low,Close,Adj Close,Volume"]
        for r in rows.reversed() {
            let parts: [String] = [r.date, cell(r.open), cell(r.high), cell(r.low), cell(r.close), cell(r.adjClose), cell(r.volume)]
            lines.append(parts.joined(separator: ","))
        }
        return lines.joined(separator: "\r\n") + "\r\n"
    }

    static func dividends(_ divs: [QuoteHistory.Dividend]) -> String {
        var lines: [String] = ["Date,Dividend"]
        for d in divs.reversed() { lines.append(d.date + "," + cell(d.amount)) }
        return lines.joined(separator: "\r\n") + "\r\n"
    }

    static func clean(_ s: String) -> String {
        String(s.filter { $0.isASCII && ($0.isLetter || $0.isNumber || $0 == ".") })
    }

    static func name(_ symbol: String, _ interval: String, _ from: String, _ to: String) -> String {
        let words: [String: String] = ["1d": "daily", "1wk": "weekly", "1mo": "monthly"]
        return "\(clean(symbol))_\(words[interval] ?? interval)_\(from)_\(to).csv"
    }

    static func dividendsName(_ symbol: String, _ from: String, _ to: String) -> String {
        "\(clean(symbol))_dividends_\(from)_\(to).csv"
    }

    static func write(_ content: String, name: String) -> URL? {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        do {
            try content.write(to: url, atomically: true, encoding: .utf8)
            return url
        } catch {
            return nil
        }
    }
}

// MARK: - Model

@MainActor
private final class QuoteHistoryModel: ObservableObject {
    @Published var data: QuoteHistory?
    @Published var failed = false
    @Published var isLoading = false
    @Published var csvURL: URL?
    @Published var dividendsURL: URL?
    let symbol: String
    private var current = ""

    init(symbol: String) { self.symbol = symbol }

    func load(range: String, interval: String) async {
        let path = "/us/quote/\(symbol)/history"
        let params: [String: String] = ["range": range, "interval": interval]
        let key = range + "|" + interval
        current = key
        if let c: QuoteHistory = APIClient.shared.cached(path, params: params) {
            apply(c, key: key)
        } else {
            data = nil
            csvURL = nil
            dividendsURL = nil
        }
        isLoading = true
        failed = false
        do {
            let fresh: QuoteHistory = try await APIClient.shared.get(path, params: params, persist: true)
            apply(fresh, key: key)
        } catch {
            if current == key && data == nil { failed = true }
        }
        if current == key { isLoading = false }
    }

    private func apply(_ d: QuoteHistory, key: String) {
        guard current == key else { return }
        data = d
        csvURL = nil
        dividendsURL = nil
        let from = d.from ?? ""
        let to = d.to ?? ""
        let sym = d.symbol
        if !d.rows.isEmpty {
            csvURL = HistoryCSV.write(HistoryCSV.history(d.rows), name: HistoryCSV.name(sym, d.interval ?? "1d", from, to))
        }
        if let divs = d.dividends, !divs.isEmpty {
            dividendsURL = HistoryCSV.write(HistoryCSV.dividends(divs), name: HistoryCSV.dividendsName(sym, from, to))
        }
    }
}

// MARK: - Screen

struct QuoteHistoryView: View {
    let code: String
    @ObservedObject private var text = QuoteText.shared
    @StateObject private var vm: QuoteHistoryModel
    @State private var range = "1y"
    @State private var interval = "1d"

    init(code: String) {
        self.code = code
        _vm = StateObject(wrappedValue: QuoteHistoryModel(symbol: code))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text(text.s("history", "intro"))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                controls
                content
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle(text.s("tabs", "tabHistory"))
        .navigationBarTitleDisplayMode(.inline)
        .task(id: Lang.code) { await QuoteText.shared.ensure(Lang.code) }
        .task(id: range + "|" + interval) { await vm.load(range: range, interval: interval) }
        .refreshable { await vm.load(range: range, interval: interval) }
    }

    private var controls: some View {
        VStack(alignment: .leading, spacing: 10) {
            Picker(text.s("history", "rangeLabel"), selection: $range) {
                ForEach(historyRanges, id: \.self) { (r: String) in
                    Text(text.s("history", "ranges", r)).tag(r)
                }
            }
            .pickerStyle(.segmented)
            Picker(text.s("history", "intervalLabel"), selection: $interval) {
                ForEach(historyIntervals, id: \.self) { (i: String) in
                    Text(text.s("history", "intervals", i)).tag(i)
                }
            }
            .pickerStyle(.segmented)
            exportButtons
        }
    }

    @ViewBuilder private var exportButtons: some View {
        HStack(spacing: 16) {
            if let url = vm.csvURL {
                ShareLink(item: url) {
                    Label(text.s("history", "download"), systemImage: "square.and.arrow.up")
                        .font(.subheadline.weight(.medium))
                }
            }
            if let url = vm.dividendsURL {
                ShareLink(item: url) {
                    Label(text.s("history", "downloadDivs"), systemImage: "square.and.arrow.up")
                        .font(.subheadline.weight(.medium))
                }
            }
            Spacer(minLength: 0)
        }
        .tint(DS.accent)
    }

    @ViewBuilder private var content: some View {
        if let d = vm.data {
            if d.rows.isEmpty {
                Text(text.s("history", "empty"))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .card()
            } else {
                loaded(d)
            }
        } else if vm.failed {
            ErrorRetryView(message: text.s("history", "error")) {
                Task { await vm.load(range: range, interval: interval) }
            }
        } else {
            VStack { SkeletonRows(rows: 10, trailingPill: true) }.card()
        }
    }

    @ViewBuilder private func loaded(_ d: QuoteHistory) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(rowsLine(d)).font(.footnote).foregroundStyle(.secondary)
            if d.adjusted == true && d.dividendData == false {
                Text(text.s("history", "noDivData")).font(.footnote).foregroundStyle(.secondary)
            }
        }
        HistoryTableView(data: d)
            .id(d.symbol + (d.range ?? "") + (d.interval ?? ""))
        VStack(alignment: .leading, spacing: 6) {
            Text(text.s("history", "foot1"))
            if d.adjusted == true { Text(text.s("history", "foot2")) }
            Text(text.s("history", "source"))
        }
        .font(.footnote)
        .foregroundStyle(.secondary)
    }

    private func rowsLine(_ d: QuoteHistory) -> String {
        var s = fill(text.s("history", "rows"), [
            "n": QuoteFormat.int(Double(d.rows.count)),
            "from": QuoteFormat.date(d.from),
            "to": QuoteFormat.date(d.to),
        ])
        if d.interval == "1wk" { s += " " + text.s("history", "weekly") }
        if d.interval == "1mo" { s += " " + text.s("history", "monthly") }
        return s
    }
}

// MARK: - Table

/// Shows 100 rows at a time. Tap a row to see open / high / low. Rebuilt (via .id) when symbol, range or interval change.
private struct HistoryTableView: View {
    let data: QuoteHistory
    @ObservedObject private var text = QuoteText.shared
    @State private var shown = historyPage
    @State private var expanded: Set<String> = []

    private var under: [Int: [QuoteHistory.Dividend]] {
        var map: [Int: [QuoteHistory.Dividend]] = [:]
        let rows = data.rows
        for d in data.dividends ?? [] {
            var at = rows.firstIndex(where: { $0.date <= d.date }) ?? -1
            if at < 0 { at = rows.count - 1 }
            if at < 0 { continue }
            map[at, default: []].append(d)
        }
        return map
    }

    var body: some View {
        let rows = data.rows
        let visible = Array(rows.prefix(shown))
        let left = rows.count - visible.count
        let divs = under
        return VStack(spacing: 12) {
            LazyVStack(spacing: 0) {
                ForEach(Array(visible.enumerated()), id: \.element.id) { pair in
                    if pair.offset > 0 { Rectangle().fill(DS.stroke).frame(height: 1) }
                    barRow(pair.element)
                    ForEach(divs[pair.offset] ?? []) { (d: QuoteHistory.Dividend) in
                        Rectangle().fill(DS.stroke).frame(height: 1)
                        dividendRow(d)
                    }
                }
            }
            .padding(.horizontal, 16)
            .card(padding: 0)
            if left > 0 {
                Button {
                    shown += historyPage
                } label: {
                    Text(fill(text.s("history", "showMore"), ["n": String(min(historyPage, left))]))
                        .font(.subheadline.weight(.medium))
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .tint(DS.accent)
            }
        }
    }

    private func barRow(_ r: QuoteHistory.Bar) -> some View {
        let open = expanded.contains(r.date)
        return VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text(QuoteFormat.date(r.date)).font(.subheadline)
                Spacer(minLength: 8)
                Text(text.s("history", "close")).font(.caption).foregroundStyle(.secondary)
                Text(QuoteFormat.price(r.close))
                    .font(.subheadline.weight(.semibold))
                    .monospacedDigit()
            }
            HStack(alignment: .firstTextBaseline) {
                Text(text.s("history", "adj") + " " + QuoteFormat.price(r.adjClose))
                Spacer(minLength: 8)
                Text(text.s("history", "volume") + " " + QuoteFormat.int(r.volume))
            }
            .font(.caption)
            .monospacedDigit()
            .foregroundStyle(.secondary)
            if open {
                HStack {
                    Text(text.s("history", "open") + " " + QuoteFormat.price(r.open))
                    Spacer(minLength: 4)
                    Text(text.s("history", "high") + " " + QuoteFormat.price(r.high))
                    Spacer(minLength: 4)
                    Text(text.s("history", "low") + " " + QuoteFormat.price(r.low))
                }
                .font(.caption)
                .monospacedDigit()
                .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
        .onTapGesture {
            if expanded.contains(r.date) { expanded.remove(r.date) } else { expanded.insert(r.date) }
        }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
    }

    private func dividendRow(_ d: QuoteHistory.Dividend) -> some View {
        let amount = "$" + d.amount.formatted(.number.precision(.fractionLength(2...4)).locale(Lang.locale))
        return HStack {
            Text(text.s("history", "dividend")).font(.subheadline)
            Text(amount).font(.subheadline.weight(.semibold)).monospacedDigit()
            Spacer(minLength: 0)
        }
        .foregroundStyle(DS.accent)
        .padding(.vertical, 8)
        .accessibilityElement(children: .combine)
    }
}
