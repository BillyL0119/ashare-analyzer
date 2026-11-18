import SwiftUI
import Charts

// MARK: - Loading

@MainActor
private final class QuoteHoldersModel: ObservableObject {
    @Published var data: QuoteHolders?
    @Published var failed = false
    @Published var isLoading = false
    let symbol: String

    init(symbol: String) { self.symbol = symbol }

    func load(force: Bool = false) async {
        if isLoading { return }
        if data != nil && !force { return }
        let path = "/us/quote/\(symbol)/holders"
        if data == nil, let c: QuoteHolders = APIClient.shared.cached(path) { data = c }
        isLoading = true
        failed = false
        do {
            let fresh: QuoteHolders = try await APIClient.shared.get(path, persist: true)
            data = fresh
        } catch {
            if data == nil { failed = true }
        }
        isLoading = false
    }
}

// MARK: - Screen

/// Holders tab: institutional ownership, position changes, top 10 institutions, insider activity, short interest.
struct QuoteHoldersView: View {
    let code: String
    @StateObject private var vm: QuoteHoldersModel
    @ObservedObject private var text = QuoteText.shared

    init(code: String) {
        self.code = code
        _vm = StateObject(wrappedValue: QuoteHoldersModel(symbol: code))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                content
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle(text.s("tabs", "tabHolders"))
        .navigationBarTitleDisplayMode(.inline)
        .task(id: Lang.code) { await QuoteText.shared.ensure(Lang.code) }
        .task { await vm.load() }
        .refreshable { await vm.load(force: true) }
    }

    @ViewBuilder private var content: some View {
        if let d = vm.data {
            if isEmpty(d) {
                emptyCard
            } else {
                loaded(d)
            }
        } else if vm.failed {
            ErrorRetryView(message: text.s("holders", "loadError")) {
                Task { await vm.load(force: true) }
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 40)
        } else {
            SkeletonRows(rows: 6, trailingPill: false).card(padding: 0)
        }
    }

    private func isEmpty(_ d: QuoteHolders) -> Bool {
        let noOwn = d.ownership == nil
        let noTop = (d.topInstitutions ?? []).isEmpty
        let noIns = d.insiders == nil
        let noShort = (d.shortInterest?.rows ?? []).isEmpty
        return noOwn && noTop && noIns && noShort
    }

    private var emptyCard: some View {
        Text(fill(text.s("holders", "holdersEmpty"), ["sym": code]))
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .card()
    }

    @ViewBuilder private func loaded(_ d: QuoteHolders) -> some View {
        if let o = d.ownership {
            QuoteHoldersOwnership(own: o)
            if let p = o.positions { QuoteHoldersPositions(pos: p) }
        }
        let top: [QuoteHolders.Institution] = d.topInstitutions ?? []
        if !top.isEmpty { QuoteHoldersTop(rows: Array(top.prefix(10))) }
        QuoteHoldersInsiders(insiders: d.insiders)
        QuoteHoldersShort(short: d.shortInterest, symbol: code)
        if let a = d.asOf {
            Text(fill(text.s("holders", "source"), ["date": QuoteFormat.date(a)]))
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 4)
        }
    }
}

// MARK: - Shared bits

private struct QuoteHoldersSection<Content: View>: View {
    let title: String
    let how: String
    let content: Content
    init(_ title: String, how: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.how = how
        self.content = content()
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title)
            if !how.isEmpty {
                Text(how)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 4)
                    .fixedSize(horizontal: false, vertical: true)
            }
            content
        }
    }
}

private struct QuoteHoldersLine: View {
    let label: String
    let value: String
    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label).font(.subheadline).foregroundStyle(.secondary)
            Spacer(minLength: 12)
            Text(value).font(.subheadline.weight(.medium)).monospacedDigit()
        }
        .padding(.vertical, 11)
        .accessibilityElement(children: .combine)
    }
}

private func holdersSigned(_ v: Double?, plus: Bool) -> String {
    guard let v, v.isFinite else { return QuoteFormat.dash }
    if v == 0 { return QuoteFormat.compact(0) }
    return (plus ? "+" : "−") + QuoteFormat.compact(abs(v))
}

// MARK: - 1. Ownership

private struct QuoteHoldersOwnership: View {
    let own: QuoteHolders.Ownership
    @ObservedObject private var text = QuoteText.shared

    var body: some View {
        QuoteHoldersSection(text.s("holders", "ownH"), how: text.s("holders", "ownHow")) {
            VStack(spacing: 0) {
                QuoteHoldersLine(label: text.s("holders", "instPct"), value: QuoteFormat.pct(own.institutionalPct))
                Rectangle().fill(DS.stroke).frame(height: 1)
                QuoteHoldersLine(label: text.s("holders", "instCount"),
                                 value: QuoteFormat.int(own.institutionsCount.map { Double($0) }))
                Rectangle().fill(DS.stroke).frame(height: 1)
                QuoteHoldersLine(label: text.s("holders", "sharesOut"), value: QuoteFormat.compact(own.sharesOutstanding))
                Rectangle().fill(DS.stroke).frame(height: 1)
                QuoteHoldersLine(label: text.s("holders", "instValue"), value: QuoteFormat.money(own.totalValue))
            }
            .padding(.horizontal, 4)
        }
    }
}

// MARK: - 2. Position changes

private struct QuoteHoldersPositions: View {
    let pos: QuoteHolders.Positions
    @ObservedObject private var text = QuoteText.shared

    private struct Item: Identifiable {
        let id: String
        let label: String
        let p: QuoteHolders.Position?
        let sign: Int          // 1 plus, -1 minus, 0 none
        let color: Color
    }

    private var items: [Item] {
        [
            Item(id: "increased", label: text.s("holders", "pos_increased"), p: pos.increased, sign: 1, color: DS.goodFill),
            Item(id: "decreased", label: text.s("holders", "pos_decreased"), p: pos.decreased, sign: -1, color: DS.badFill),
            Item(id: "new", label: text.s("holders", "pos_new"), p: pos.new, sign: 1, color: DS.goodFill),
            Item(id: "sold_out", label: text.s("holders", "pos_sold_out"), p: pos.soldOut, sign: -1, color: DS.badFill),
            Item(id: "held", label: text.s("holders", "pos_held"), p: pos.held, sign: 0, color: Color.gray)
        ]
    }

    private var maxShares: Double {
        let all: [Double] = items.map { $0.p?.shares ?? 0 }
        return max(all.max() ?? 0, 1)
    }

    var body: some View {
        QuoteHoldersSection(text.s("holders", "changesH"), how: text.s("holders", "changesHow")) {
            VStack(spacing: 0) {
                ForEach(Array(items.enumerated()), id: \.element.id) { idx, it in
                    row(it)
                    if idx < items.count - 1 { Rectangle().fill(DS.stroke).frame(height: 1) }
                }
            }
            .padding(.horizontal, 4)
        }
    }

    private func row(_ it: Item) -> some View {
        let shares: Double = it.p?.shares ?? 0
        let frac: CGFloat = CGFloat(min(max(shares / maxShares, 0), 1))
        let sharesText: String = it.sign == 0
            ? QuoteFormat.compact(it.p?.shares)
            : holdersSigned(it.p?.shares, plus: it.sign > 0)
        return VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(it.label).font(.subheadline)
                Spacer(minLength: 12)
                Text("\(text.s("holders", "colHolders")) \(QuoteFormat.int(it.p?.holders.map { Double($0) }))")
                    .font(.footnote).foregroundStyle(.secondary).monospacedDigit()
                Text(sharesText)
                    .font(.subheadline.weight(.medium))
                    .monospacedDigit()
                    .frame(minWidth: 72, alignment: .trailing)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(DS.surfaceHi)
                    Capsule().fill(it.color)
                        .frame(width: shares > 0 ? max(3, geo.size.width * frac) : 0)
                }
            }
            .frame(height: 4)
        }
        .padding(.vertical, 10)
        .accessibilityElement(children: .combine)
    }
}

// MARK: - 3. Top institutions

private struct QuoteHoldersTop: View {
    let rows: [QuoteHolders.Institution]
    @ObservedObject private var text = QuoteText.shared

    var body: some View {
        QuoteHoldersSection(text.s("holders", "topH"), how: text.s("holders", "topHow")) {
            VStack(spacing: 0) {
                ForEach(Array(rows.enumerated()), id: \.offset) { idx, r in
                    row(r)
                    if idx < rows.count - 1 { Rectangle().fill(DS.stroke).frame(height: 1) }
                }
            }
            .padding(.horizontal, 4)
        }
    }

    private func row(_ r: QuoteHolders.Institution) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text(r.name ?? QuoteFormat.dash)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(2)
                Spacer(minLength: 12)
                Text(QuoteFormat.money(r.value)).font(.subheadline.weight(.medium)).monospacedDigit()
            }
            HStack(alignment: .firstTextBaseline) {
                Text("\(QuoteFormat.compact(r.shares)) · \(QuoteFormat.date(r.asOf))")
                    .font(.footnote).foregroundStyle(.secondary).monospacedDigit()
                Spacer(minLength: 12)
                Text(QuoteFormat.signedPct(r.changePct))
                    .font(.footnote.weight(.medium))
                    .monospacedDigit()
                    .foregroundStyle(QuoteFormat.changeColor(r.changePct))
            }
        }
        .padding(.vertical, 10)
        .accessibilityElement(children: .combine)
    }
}

// MARK: - 4. Insiders

private struct QuoteHoldersInsiders: View {
    let insiders: QuoteHolders.Insiders?
    @ObservedObject private var text = QuoteText.shared

    private var rows: [QuoteHolders.Transaction] { insiders?.transactions ?? [] }

    var body: some View {
        QuoteHoldersSection(text.s("holders", "insH"), how: text.s("holders", "insHow")) {
            VStack(alignment: .leading, spacing: 10) {
                if let s = insiders?.summary {
                    Text(sentence(months: "3", sells: s.sells3m, buys: s.buys3m))
                    Text(sentence(months: "12", sells: s.sells12m, buys: s.buys12m))
                }
                Text(text.s("holders", "insPlanned"))
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                if rows.isEmpty {
                    Text(text.s("holders", "insEmpty")).font(.subheadline).foregroundStyle(.secondary)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(rows.enumerated()), id: \.offset) { idx, r in
                            row(r)
                            if idx < rows.count - 1 { Rectangle().fill(DS.stroke).frame(height: 1) }
                        }
                    }
                }
            }
            .font(.subheadline)
            .padding(.horizontal, 4)
        }
    }

    /// insSentence: {0} sales, {1} purchases, {2} months
    private func sentence(months: String, sells: Int?, buys: Int?) -> String {
        let a: String = sells.map { String($0) } ?? QuoteFormat.dash
        let b: String = buys.map { String($0) } ?? QuoteFormat.dash
        return fill(text.s("holders", "insSentence"), args: [a, b, months])
    }

    private func typeText(_ r: QuoteHolders.Transaction) -> String {
        guard let t = r.type, !t.isEmpty else { return QuoteFormat.dash }
        let name = text.s("holders", "types", t.lowercased())
        return name.isEmpty ? t : name
    }

    private func row(_ r: QuoteHolders.Transaction) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text(r.name ?? QuoteFormat.dash)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(2)
                Spacer(minLength: 12)
                Text(QuoteFormat.money(r.value)).font(.subheadline.weight(.medium)).monospacedDigit()
            }
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(r.relation ?? QuoteFormat.dash)
                    .lineLimit(1)
                Spacer(minLength: 12)
                Text("\(QuoteFormat.compact(r.shares)) × \(QuoteFormat.dollars(r.price))")
                    .monospacedDigit()
            }
            .font(.footnote)
            .foregroundStyle(.secondary)
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(QuoteFormat.date(r.date)).monospacedDigit()
                Text(typeText(r))
                if r.planned == true {
                    Text(text.s("holders", "planned"))
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 1)
                        .overlay(Capsule().stroke(DS.stroke, lineWidth: 1))
                }
            }
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 10)
        .accessibilityElement(children: .combine)
    }
}

// MARK: - 5. Short interest

private struct QuoteHoldersShort: View {
    let short: QuoteHolders.ShortInterest?
    let symbol: String
    @ObservedObject private var text = QuoteText.shared

    private struct Point: Identifiable {
        let id: String
        let date: Date
        let shares: Double
        let dtc: Double?
    }

    private var points: [Point] {
        (short?.rows ?? []).compactMap { (r: QuoteHolders.ShortRow) -> Point? in
            guard let d = QuoteFormat.parseDay(r.settlementDate), let s = r.sharesShort else { return nil }
            return Point(id: r.settlementDate, date: d, shares: s, dtc: r.daysToCover)
        }
    }

    var body: some View {
        QuoteHoldersSection(text.s("holders", "shortH"), how: text.s("holders", "shortHow")) {
            if points.isEmpty {
                Text(fill(text.s("holders", "shortEmpty"), ["sym": symbol]))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .card()
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    latest
                    Text(text.s("holders", "shortChartLabel"))
                        .font(.footnote).foregroundStyle(.secondary)
                    sharesChart
                    dtcChart
                }
                .padding(.horizontal, 4)
            }
        }
    }

    @ViewBuilder private var latest: some View {
        let last: Point? = points.last
        VStack(spacing: 0) {
            QuoteHoldersLine(label: text.s("holders", "shortLatest"), value: QuoteFormat.date(short?.rows.last?.settlementDate))
            Rectangle().fill(DS.stroke).frame(height: 1)
            QuoteHoldersLine(label: text.s("holders", "shortShares"), value: QuoteFormat.compact(last?.shares))
            Rectangle().fill(DS.stroke).frame(height: 1)
            QuoteHoldersLine(label: text.s("holders", "shortPct"), value: QuoteFormat.pct(short?.latestPctOfShares))
            Rectangle().fill(DS.stroke).frame(height: 1)
            QuoteHoldersLine(label: text.s("holders", "shortDtc"), value: QuoteFormat.ratio(last?.dtc, digits: 1))
        }
    }

    private var sharesChart: some View {
        Chart(points) { (p: Point) in
            BarMark(x: .value("Date", p.date, unit: .day), y: .value("Shares", p.shares))
                .foregroundStyle(DS.accentFill)
        }
        .chartXAxis {
            AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                AxisValueLabel(format: .dateTime.month(.abbreviated).year(.twoDigits).locale(Lang.locale))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading, values: .automatic(desiredCount: 4)) { v in
                AxisGridLine().foregroundStyle(DS.stroke)
                AxisValueLabel {
                    if let d = v.as(Double.self) {
                        Text(QuoteFormat.compact(d)).font(.caption2).foregroundStyle(.secondary)
                    }
                }
            }
        }
        .frame(height: 160)
        .accessibilityLabel(text.s("holders", "shortShares"))
    }

    @ViewBuilder private var dtcChart: some View {
        let withDtc: [Point] = points.filter { $0.dtc != nil }
        if withDtc.count > 1 {
            VStack(alignment: .leading, spacing: 4) {
                Text(text.s("holders", "shortDtc")).font(.footnote).foregroundStyle(.secondary)
                Chart(withDtc) { (p: Point) in
                    LineMark(x: .value("Date", p.date, unit: .day), y: .value("Days", p.dtc ?? 0))
                        .lineStyle(StrokeStyle(lineWidth: 1.5))
                        .foregroundStyle(DS.accent)
                }
                .chartXAxis(.hidden)
                .chartYAxis {
                    AxisMarks(position: .leading, values: .automatic(desiredCount: 3)) { v in
                        AxisGridLine().foregroundStyle(DS.stroke)
                        AxisValueLabel {
                            if let d = v.as(Double.self) {
                                Text(QuoteFormat.ratio(d, digits: 1)).font(.caption2).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                .frame(height: 70)
                .accessibilityLabel(text.s("holders", "shortDtc"))
            }
        }
    }
}
