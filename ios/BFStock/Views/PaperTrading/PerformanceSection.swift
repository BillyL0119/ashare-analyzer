import SwiftUI
import Charts

// MARK: - Model (/paper/performance)

struct PerformancePoint: Decodable, Identifiable {
    let date: String
    let value: Double
    let bench: Double
    var id: String { date }
    var day: Date { PerformancePoint.parser.date(from: date) ?? .distantPast }
    private static let parser: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()
}

struct PaperPerformance: Decodable {
    let points: [PerformancePoint]
    let benchmark: String
    let initial: Double
    let returnPct: Double?
    let benchReturnPct: Double?
    let excessPct: Double?
    let maxDrawdownPct: Double?
    let since: String?
}

struct PerformanceBody: Encodable {
    let deviceId: String
    let market: String
}

// MARK: - View

/// Account value day by day (rebuilt on the server from the trades) against the S&P 500 or CSI 300,
/// both starting from the same money. Hidden until the first trade.
struct PerformanceSection: View {
    let perf: PaperPerformance
    let market: Market

    private var benchName: String {
        [ "S&P 500": L("标普500"), "CSI 300": L("沪深300"), "Hang Seng": L("恒生指数"), "Nikkei 225": L("日经225") ][perf.benchmark] ?? perf.benchmark
    }
    private var currency: String { market.currencySymbol }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("收益曲线"))
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    let ahead = (perf.excessPct ?? 0) >= 0
                    Text(ahead ? L("跑赢大盘 %@", pct(perf.excessPct, signed: false))
                               : L("跑输大盘 %@", pct(perf.excessPct.map { abs($0) }, signed: false)))
                        .font(.caption.weight(.bold))
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .foregroundStyle(ahead ? DS.accent : Color.orange)
                        .background((ahead ? DS.accent : Color.orange).opacity(0.14), in: Capsule())
                    Spacer()
                    if let s = perf.since, let d = perf.points.first?.day {
                        Text(L("自 %@ 起", d.formatted(.dateTime.month(.abbreviated).day())))
                            .font(.caption).foregroundStyle(.secondary)
                            .accessibilityHint(s)
                    }
                }

                Chart {
                    ForEach(perf.points) { p in
                        LineMark(x: .value("Date", p.day), y: .value("Value", p.bench), series: .value("Series", benchName))
                            .foregroundStyle(Color.secondary)
                            .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
                            .interpolationMethod(.monotone)
                        LineMark(x: .value("Date", p.day), y: .value("Value", p.value), series: .value("Series", L("我的组合")))
                            .foregroundStyle(DS.accent)
                            .lineStyle(StrokeStyle(lineWidth: 2.4))
                            .interpolationMethod(.monotone)
                    }
                    RuleMark(y: .value("Start", perf.initial))
                        .foregroundStyle(DS.stroke)
                }
                .chartYScale(domain: .automatic(includesZero: false))
                .chartXAxis { AxisMarks(values: .automatic(desiredCount: 4)) { _ in AxisValueLabel(format: .dateTime.month(.abbreviated).day()) } }
                .chartYAxis { AxisMarks(position: .leading, values: .automatic(desiredCount: 4)) }
                .frame(height: 170)

                HStack(spacing: 0) {
                    tile(L("我的收益"), pct(perf.returnPct), color: perf.returnPct.map { Theme.changeColor($0, market: market) })
                    Divider().frame(height: 30)
                    tile(benchName, pct(perf.benchReturnPct), color: nil)
                    Divider().frame(height: 30)
                    tile(L("最大回撤"), pct(perf.maxDrawdownPct), color: nil)
                }
                .padding(.vertical, 10)
                .background(DS.surfaceHi, in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))

                HStack(spacing: 14) {
                    Label { Text(L("我的组合")) } icon: { Capsule().fill(DS.accent).frame(width: 14, height: 3) }
                    Label { Text(benchName) } icon: { Capsule().fill(Color.secondary).frame(width: 14, height: 3) }
                }
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
            .card()
        }
    }

    private func tile(_ label: String, _ value: String, color: Color?) -> some View {
        VStack(spacing: 3) {
            Text(label).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
            Text(value).font(.system(.subheadline, design: .rounded).weight(.bold)).monospacedDigit()
                .foregroundStyle(color ?? .primary)
        }
        .frame(maxWidth: .infinity)
    }

    private func pct(_ v: Double?, signed: Bool = true) -> String {
        guard let v else { return "—" }
        return String(format: "%@%.2f%%", signed && v > 0 ? "+" : "", v)
    }
}
