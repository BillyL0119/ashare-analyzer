import SwiftUI

// Statistics tab: Yahoo-style groups of figures, each label explained by the glossary.
// Same content and order as the website's QuoteStatistics.jsx.

@MainActor
private final class QuoteStatisticsModel: ObservableObject {
    @Published var data: QuoteStats?
    @Published var failed = false
    @Published var isLoading = false
    let symbol: String

    init(symbol: String) { self.symbol = symbol }

    private var path: String { "/us/quote/\(symbol)/stats" }

    func load(force: Bool = false) async {
        if isLoading { return }
        if data == nil, let c: QuoteStats = APIClient.shared.cached(path) { data = c }
        isLoading = true
        failed = false
        do {
            let fresh: QuoteStats = try await APIClient.shared.get(path, persist: true)
            data = fresh
        } catch {
            if data == nil { failed = true }
        }
        isLoading = false
    }
}

struct QuoteStatisticsView: View {
    let code: String
    @ObservedObject private var text = QuoteText.shared
    @StateObject private var vm: QuoteStatisticsModel

    init(code: String) {
        self.code = code
        _vm = StateObject(wrappedValue: QuoteStatisticsModel(symbol: code))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(text.s("stats", "intro"))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                content
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(DS.bg.ignoresSafeArea())
        .quoteScreenTitle(text.s("tabs", "tabStatistics"), code: code)
        .task(id: Lang.code) { await QuoteText.shared.ensure(Lang.code) }
        .task { await vm.load() }
        .refreshable { await vm.load(force: true) }
    }

    @ViewBuilder private var content: some View {
        if let d = vm.data {
            loaded(d)
        } else if vm.failed {
            ErrorRetryView(message: text.s("stats", "error")) {
                Task { await vm.load(force: true) }
            }
        } else {
            VStack { SkeletonRows(rows: 8, trailingPill: true) }.card()
        }
    }

    private func rows(_ d: QuoteStats, _ key: String) -> [QuoteStats.Row] {
        d.groups.first(where: { $0.key == key })?.rows ?? []
    }

    @ViewBuilder private func loaded(_ d: QuoteStats) -> some View {
        let valuation = rows(d, "valuation")
        if !valuation.isEmpty {
            groupCard(title: text.s("stats", "g_valuation"), hint: text.s("stats", "h_valuation")) {
                StatsRowsView(rows: valuation)
            }
        }
        groupCard(title: text.s("stats", "g_highlights"), hint: text.s("stats", "h_highlights")) {
            subGroups(d, ["fiscal", "profitability", "management", "income", "balance", "cashflow"])
        }
        groupCard(title: text.s("stats", "g_trading"), hint: text.s("stats", "h_trading")) {
            subGroups(d, ["price_history", "shares", "dividends"])
        }
        abbreviations(d)
    }

    private func groupCard<Content: View>(title: String, hint: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title)
            Text(hint)
                .font(.footnote)
                .foregroundStyle(.secondary)
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }

    @ViewBuilder private func subGroups(_ d: QuoteStats, _ keys: [String]) -> some View {
        ForEach(keys, id: \.self) { key in
            let r = rows(d, key)
            if !r.isEmpty {
                VStack(alignment: .leading, spacing: 0) {
                    Text(text.s("stats", "g_" + key))
                        .font(.subheadline.weight(.semibold))
                        .padding(.top, 12)
                        .padding(.bottom, 4)
                    StatsRowsView(rows: r)
                }
            }
        }
    }

    private func abbreviations(_ d: QuoteStats) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(text.s("stats", "abbrTitle"))
            ForEach(["ttm", "mrq", "yoy"], id: \.self) { k in
                VStack(alignment: .leading, spacing: 2) {
                    Text(text.s("stats", "abbr_" + k)).font(.subheadline.weight(.medium))
                    Text(text.term("abbr_" + k)?.d ?? "")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .accessibilityElement(children: .combine)
            }
            Text(text.s("stats", "stale")).font(.footnote).foregroundStyle(.secondary)
            Text(fill(text.s("stats", "sourceLine"), args: [QuoteFormat.date(String((d.asOf ?? "").prefix(10)))]))
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }
}

private struct StatsRowsView: View {
    let rows: [QuoteStats.Row]
    @ObservedObject private var text = QuoteText.shared

    var body: some View {
        VStack(spacing: 0) {
            ForEach(Array(rows.enumerated()), id: \.element.id) { pair in
                if pair.offset > 0 { Rectangle().fill(DS.stroke).frame(height: 1) }
                rowView(pair.element)
            }
        }
    }

    private func label(_ row: QuoteStats.Row) -> String {
        let l = text.s("stats", "labels", row.key)
        return l.isEmpty ? row.key : l
    }

    private func tag(_ row: QuoteStats.Row) -> String? {
        if row.value == nil { return nil }
        if let a = row.asOf, !a.isEmpty { return QuoteFormat.date(a) }
        if row.period == "ttm" || row.period == "mrq" {
            let t = text.s("stats", "tag_" + (row.period ?? ""))
            return t.isEmpty ? nil : t
        }
        return nil
    }

    private func valueText(_ row: QuoteStats.Row) -> String {
        if row.fmt == "price", let n = row.value?.number, n < 0 {
            return "−" + QuoteFormat.value(.number(-n), fmt: "price")
        }
        return QuoteFormat.value(row.value, fmt: row.fmt)
    }

    private func rowView(_ row: QuoteStats.Row) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            TermLabel(row.key, label(row))
                .font(.subheadline)
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 2) {
                Text(valueText(row))
                    .font(.subheadline.weight(.medium))
                    .monospacedDigit()
                if let t = tag(row) {
                    Text(t)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 9)
    }
}
