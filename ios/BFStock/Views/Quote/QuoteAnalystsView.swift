import SwiftUI
import Charts

// MARK: - Loading

@MainActor
private final class QuoteAnalystsModel: ObservableObject {
    @Published var data: QuoteAnalysts?
    @Published var failed = false
    @Published var isLoading = false
    let symbol: String

    init(symbol: String) { self.symbol = symbol }

    func load(force: Bool = false) async {
        if isLoading { return }
        if data != nil && !force { return }
        let path = "/us/quote/\(symbol)/analysts"
        if data == nil, let c: QuoteAnalysts = APIClient.shared.cached(path) { data = c }
        isLoading = true
        failed = false
        do {
            let fresh: QuoteAnalysts = try await APIClient.shared.get(path, persist: true)
            data = fresh
        } catch {
            if data == nil { failed = true }
        }
        isLoading = false
    }
}

// MARK: - Screen

/// Analysts tab: rating, price targets, recommendation trend, EPS forecasts, PEG.
struct QuoteAnalystsView: View {
    let code: String
    @StateObject private var vm: QuoteAnalystsModel
    @ObservedObject private var text = QuoteText.shared

    init(code: String) {
        self.code = code
        _vm = StateObject(wrappedValue: QuoteAnalystsModel(symbol: code))
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
        .navigationTitle(text.s("tabs", "tabAnalysts"))
        .navigationBarTitleDisplayMode(.inline)
        .task(id: Lang.code) { await QuoteText.shared.ensure(Lang.code) }
        .task { await vm.load() }
        .refreshable { await vm.load(force: true) }
    }

    @ViewBuilder private var content: some View {
        if let d = vm.data {
            if isEmpty(d) {
                Text(fill(text.s("holders", "analystsEmpty"), ["sym": code]))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .card()
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

    private func isEmpty(_ d: QuoteAnalysts) -> Bool {
        let noRating = (d.rating?.analysts ?? 0) == 0
        let noTargets = d.targets?.average == nil
        let noHistory = (d.history ?? []).isEmpty
        let noQ = (d.forecasts?.quarterly ?? []).isEmpty
        let noY = (d.forecasts?.yearly ?? []).isEmpty
        return noRating && noTargets && noHistory && noQ && noY
    }

    @ViewBuilder private func loaded(_ d: QuoteAnalysts) -> some View {
        Text(text.s("holders", "aNote"))
            .font(.footnote)
            .foregroundStyle(.secondary)
            .padding(.horizontal, 4)
            .fixedSize(horizontal: false, vertical: true)
        if let r = d.rating, (r.analysts ?? 0) > 0 { QuoteAnalystsRating(rating: r) }
        if let t = d.targets, t.average != nil { QuoteAnalystsTargets(targets: t) }
        let hist: [QuoteAnalysts.HistoryPoint] = d.history ?? []
        if !hist.isEmpty { QuoteAnalystsTrend(history: hist) }
        let q: [QuoteAnalysts.Forecast] = d.forecasts?.quarterly ?? []
        let y: [QuoteAnalysts.Forecast] = d.forecasts?.yearly ?? []
        if !q.isEmpty || !y.isEmpty { QuoteAnalystsEps(quarterly: q, yearly: y) }
        if let v = d.peg?.value { QuoteAnalystsPeg(value: v) }
    }
}

// MARK: - Shared bits

private struct QuoteAnalystsSection<Content: View>: View {
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

private struct QuoteAnalystsLine: View {
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

private let quoteAnalystsHoldColor: Color = Color.gray

// MARK: - Rating

private struct QuoteAnalystsRating: View {
    let rating: QuoteAnalysts.Rating
    @ObservedObject private var text = QuoteText.shared

    private var consensus: String {
        guard let m = rating.mean, !m.isEmpty else { return QuoteFormat.dash }
        let name = text.s("holders", "means", m.lowercased())
        return name.isEmpty ? m : name
    }

    var body: some View {
        let buy: Int = rating.buy ?? 0
        let hold: Int = rating.hold ?? 0
        let sell: Int = rating.sell ?? 0
        let total: Double = Double(max(buy + hold + sell, 1))
        QuoteAnalystsSection(text.s("holders", "rateH"), how: text.s("holders", "rateHow")) {
            VStack(alignment: .leading, spacing: 0) {
                QuoteAnalystsLine(label: text.s("holders", "consensus"), value: consensus)
                Rectangle().fill(DS.stroke).frame(height: 1)
                QuoteAnalystsLine(label: text.s("holders", "analystsCounted"),
                                  value: QuoteFormat.int(rating.analysts.map { Double($0) }))
                Rectangle().fill(DS.stroke).frame(height: 1)
                GeometryReader { geo in
                    HStack(spacing: 2) {
                        segment(buy, total, geo.size.width, DS.goodFill)
                        segment(hold, total, geo.size.width, quoteAnalystsHoldColor)
                        segment(sell, total, geo.size.width, DS.badFill)
                    }
                }
                .frame(height: 10)
                .padding(.top, 12)
                .accessibilityHidden(true)
                HStack {
                    legend(text.s("holders", "rate_buy"), buy, DS.goodFill)
                    Spacer()
                    legend(text.s("holders", "rate_hold"), hold, quoteAnalystsHoldColor)
                    Spacer()
                    legend(text.s("holders", "rate_sell"), sell, DS.badFill)
                }
                .padding(.top, 8)
            }
            .padding(.horizontal, 4)
        }
    }

    @ViewBuilder private func segment(_ n: Int, _ total: Double, _ width: CGFloat, _ color: Color) -> some View {
        if n > 0 {
            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: max(4, (width - 4) * CGFloat(Double(n) / total)))
        }
    }

    private func legend(_ word: String, _ n: Int, _ color: Color) -> some View {
        HStack(spacing: 6) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text("\(word) \(n)").font(.subheadline).monospacedDigit()
        }
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Price targets

private struct QuoteAnalystsTargets: View {
    let targets: QuoteAnalysts.Targets
    @ObservedObject private var text = QuoteText.shared

    private var bounds: (lo: Double, hi: Double)? {
        var vals: [Double] = []
        if let v = targets.low { vals.append(v) }
        if let v = targets.high { vals.append(v) }
        if let v = targets.average { vals.append(v) }
        if let v = targets.current { vals.append(v) }
        guard let lo = vals.min(), let hi = vals.max(), hi > lo else { return nil }
        return (lo, hi)
    }

    private func frac(_ v: Double?) -> CGFloat? {
        guard let v, let b = bounds else { return nil }
        return CGFloat((v - b.lo) / (b.hi - b.lo))
    }

    private var sentence: String {
        guard let avg = targets.average, let cur = targets.current, cur > 0 else { return "" }
        let diff: Double = (avg - cur) / cur * 100
        let key: String = diff >= 0 ? "upside" : "downside"
        return fill(text.s("holders", key), args: [QuoteFormat.pct(abs(diff), digits: 1)])
    }

    var body: some View {
        QuoteAnalystsSection(text.s("holders", "targetsH"), how: text.s("holders", "targetsHow")) {
            VStack(alignment: .leading, spacing: 0) {
                scale
                    .padding(.vertical, 12)
                row(text.s("holders", "tLow"), targets.low)
                Rectangle().fill(DS.stroke).frame(height: 1)
                row(text.s("holders", "tAvg"), targets.average)
                Rectangle().fill(DS.stroke).frame(height: 1)
                row(text.s("holders", "tHigh"), targets.high)
                Rectangle().fill(DS.stroke).frame(height: 1)
                row(text.s("holders", "tCurrent"), targets.current)
                if !sentence.isEmpty {
                    Text(sentence)
                        .font(.subheadline)
                        .padding(.top, 10)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(.horizontal, 4)
        }
    }

    private func row(_ label: String, _ v: Double?) -> some View {
        QuoteAnalystsLine(label: label, value: QuoteFormat.dollars(v))
    }

    /// Track from the lowest to the highest figure; a bar from low to high, a tick for the average and a dot for
    /// the current price. The exact figures are in the rows below, so the scale is hidden from VoiceOver.
    private var scale: some View {
        GeometryReader { geo in
            let w: CGFloat = geo.size.width
            let lo: CGFloat = frac(targets.low) ?? 0
            let hi: CGFloat = frac(targets.high) ?? 1
            ZStack(alignment: .leading) {
                Capsule().fill(DS.surfaceHi).frame(height: 6)
                Capsule().fill(DS.accentFill.opacity(0.35))
                    .frame(width: max(4, (hi - lo) * w), height: 6)
                    .offset(x: lo * w)
                if let a = frac(targets.average) {
                    Rectangle().fill(DS.accentFill)
                        .frame(width: 3, height: 16)
                        .offset(x: min(max(a * w - 1.5, 0), w - 3))
                }
                if let c = frac(targets.current) {
                    Circle().fill(Color.primary)
                        .frame(width: 12, height: 12)
                        .offset(x: min(max(c * w - 6, 0), w - 12))
                }
            }
            .frame(height: 16)
        }
        .frame(height: 16)
        .accessibilityHidden(true)
    }
}

// MARK: - Recommendation trend

private struct QuoteAnalystsTrend: View {
    let history: [QuoteAnalysts.HistoryPoint]
    @ObservedObject private var text = QuoteText.shared

    private struct Bar: Identifiable {
        let id: String
        let date: Date
        let word: String
        let count: Int
    }

    private var bars: [Bar] {
        var out: [Bar] = []
        let buy: String = text.s("holders", "rate_buy")
        let hold: String = text.s("holders", "rate_hold")
        let sell: String = text.s("holders", "rate_sell")
        for h in history {
            guard let d = QuoteFormat.parseDay(h.date) else { continue }
            out.append(Bar(id: h.date + "b", date: d, word: buy, count: h.buy ?? 0))
            out.append(Bar(id: h.date + "h", date: d, word: hold, count: h.hold ?? 0))
            out.append(Bar(id: h.date + "s", date: d, word: sell, count: h.sell ?? 0))
        }
        return out
    }

    var body: some View {
        QuoteAnalystsSection(text.s("holders", "trendH"), how: text.s("holders", "trendHow")) {
            Chart(bars) { (b: Bar) in
                BarMark(x: .value("Month", b.date, unit: .month), y: .value("Analysts", b.count))
                    .foregroundStyle(by: .value("Rating", b.word))
            }
            .chartForegroundStyleScale(
                domain: [text.s("holders", "rate_buy"), text.s("holders", "rate_hold"), text.s("holders", "rate_sell")],
                range: [DS.goodFill, quoteAnalystsHoldColor, DS.badFill]
            )
            .chartLegend(position: .bottom, alignment: .leading)
            .chartXAxis {
                AxisMarks(values: .stride(by: .month, count: 3)) { _ in
                    AxisValueLabel(format: .dateTime.month(.abbreviated).year(.twoDigits).locale(Lang.locale))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading, values: .automatic(desiredCount: 4)) { _ in
                    AxisGridLine().foregroundStyle(DS.stroke)
                    AxisValueLabel().font(.caption2).foregroundStyle(.secondary)
                }
            }
            .frame(height: 200)
            .padding(.horizontal, 4)
            .accessibilityLabel(text.s("holders", "trendH"))
        }
    }
}

// MARK: - EPS forecasts

private struct QuoteAnalystsEps: View {
    let quarterly: [QuoteAnalysts.Forecast]
    let yearly: [QuoteAnalysts.Forecast]
    @ObservedObject private var text = QuoteText.shared

    var body: some View {
        QuoteAnalystsSection(text.s("holders", "epsH"), how: text.s("holders", "epsHow")) {
            VStack(alignment: .leading, spacing: 16) {
                if !quarterly.isEmpty { block(text.s("holders", "epsQ"), quarterly) }
                if !yearly.isEmpty { block(text.s("holders", "epsY"), yearly) }
            }
            .padding(.horizontal, 4)
        }
    }

    private func block(_ title: String, _ rows: [QuoteAnalysts.Forecast]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.footnote.weight(.semibold))
                .padding(.bottom, 4)
            ForEach(Array(rows.enumerated()), id: \.offset) { idx, r in
                row(r)
                if idx < rows.count - 1 { Rectangle().fill(DS.stroke).frame(height: 1) }
            }
        }
    }

    /// "2027-09" -> "Sep 2027" in the app's language
    private func period(_ s: String) -> String {
        guard let d = QuoteFormat.parseDay(String(s.prefix(7)) + "-01") else { return s }
        return d.formatted(.dateTime.month(.abbreviated).year().locale(Lang.locale))
    }

    private func row(_ r: QuoteAnalysts.Forecast) -> some View {
        let up: Int = r.up ?? 0
        let down: Int = r.down ?? 0
        let range: String = "\(QuoteFormat.ratio(r.low))–\(QuoteFormat.ratio(r.high))"
        let revLabel: String = "\(text.s("holders", "colUp")) \(up), \(text.s("holders", "colDown")) \(down)"
        return VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text(period(r.fiscalEnd)).font(.subheadline)
                Spacer(minLength: 12)
                Text(QuoteFormat.dollars(r.consensus)).font(.subheadline.weight(.medium)).monospacedDigit()
            }
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text("\(text.s("holders", "colLow")) – \(text.s("holders", "colHigh")): \(range)")
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                Spacer(minLength: 8)
                Text("\(text.s("holders", "colEstimates")) \(r.estimates.map { String($0) } ?? QuoteFormat.dash)")
                Text("↑\(up) ↓\(down)")
                    .accessibilityLabel(revLabel)
            }
            .font(.footnote)
            .foregroundStyle(.secondary)
            .monospacedDigit()
        }
        .padding(.vertical, 10)
        .accessibilityElement(children: .combine)
    }
}

// MARK: - PEG

private struct QuoteAnalystsPeg: View {
    let value: Double
    @ObservedObject private var text = QuoteText.shared

    var body: some View {
        QuoteAnalystsSection(text.s("holders", "pegH"), how: text.s("holders", "pegHow")) {
            QuoteAnalystsLine(label: text.s("holders", "pegLabel"), value: QuoteFormat.ratio(value))
                .padding(.horizontal, 4)
        }
    }
}
