import SwiftUI
import Charts

// MARK: - Model (/us/fundamentals/{symbol}; keys arrive snake_case, decoded with convertFromSnakeCase)

struct Fundamentals: Decodable {
    struct Profile: Decodable {
        let name: String?
        let sector: String?
        let industry: String?
        let exchange: String?
        let website: String?
        let description: String?
    }
    struct Stats: Decodable {
        let marketCap: Double?
        let week52High: Double?
        let week52Low: Double?
        let avgVolume: Double?
        let oneYearTarget: Double?
        let annualDividend: Double?
        let dividendYield: Double?
    }
    struct Statements: Decodable {
        let periods: [String]
        let revenue: [Double?]
        let netIncome: [Double?]
        let grossMargin: [Double?]
        let operatingMargin: [Double?]
        let netMargin: [Double?]
        let freeCashFlow: [Double?]
    }
    struct Earning: Decodable, Identifiable {
        let quarter: String?
        let eps: Double?
        let estimate: Double?
        let surprisePct: Double?
        var id: String { quarter ?? UUID().uuidString }
    }
    struct NextEarnings: Decodable {
        let date: String?
        let epsEstimate: Double?
        let timing: String?
    }
    struct Analysts: Decodable {
        let buy: Int
        let hold: Int
        let sell: Int
        let target: Double?
        let targetLow: Double?
        let targetHigh: Double?
    }
    struct Holder: Decodable, Identifiable {
        let name: String?
        let shares: Double?
        let value: Double?
        let changePct: Double?
        var id: String { name ?? UUID().uuidString }
    }
    struct Holders: Decodable {
        let institutionalPct: Double?
        let top: [Holder]
    }

    let symbol: String
    let profile: Profile
    let stats: Stats
    let annual: Statements?
    let quarterly: Statements?
    let earnings: [Earning]
    let nextEarnings: NextEarnings?
    let analysts: Analysts?
    let holders: Holders?
}

@MainActor
final class FundamentalsViewModel: ObservableObject {
    @Published var data: Fundamentals?
    @Published var failed = false
    @Published var isLoading = false
    let symbol: String

    init(symbol: String) { self.symbol = symbol }

    func load() async {
        guard data == nil, !isLoading else { return }
        let path = "/us/fundamentals/\(symbol)"
        if let c: Fundamentals = APIClient.shared.cached(path) { data = c }
        isLoading = true
        failed = false
        do {
            data = try await APIClient.shared.get(path, persist: true)
        } catch {
            if data == nil { failed = true }
        }
        isLoading = false
    }
}

// MARK: - View

/// Company financials for US stocks: revenue, profit, margins and cash flow by year or quarter, and EPS against
/// estimates. Same data as the website's Financials tab.
struct FundamentalsSection: View {
    let price: Double?
    var pe: Double? = nil          // trailing P/E from the quote: EPS when the earnings table is empty
    @StateObject private var vm: FundamentalsViewModel
    @State private var quarterly = false

    init(symbol: String, price: Double?, pe: Double? = nil) {
        self.price = price
        self.pe = pe
        _vm = StateObject(wrappedValue: FundamentalsViewModel(symbol: symbol))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("财务报表")) { if vm.isLoading && vm.data == nil { ProgressView().scaleEffect(0.7) } }
            if let d = vm.data {
                content(d)
            } else if vm.failed {
                ErrorRetryView(message: L("加载失败")) { Task { await vm.load() } }.card(padding: 16)
            } else {
                SkeletonRows(rows: 4, trailingPill: false).card(padding: 16)
            }
        }
        .task { await vm.load() }
    }

    @ViewBuilder
    private func content(_ d: Fundamentals) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // The profile, key stats, analysts and holders now have their own sections (QuoteSummarySections and
            // the Statistics / Holders / Analysts screens), as on the website: here only the statements.
            if let s = (quarterly ? d.quarterly : d.annual) ?? d.annual { financialsCard(s, hasQuarterly: d.quarterly != nil) }
            if !d.earnings.isEmpty { earningsCard(d.earnings) }
            if d.annual == nil { Text(L("ETF 和基金没有公司财报")).font(.footnote).foregroundStyle(.secondary).card(padding: 16) }
            Text(L("数据来源：Nasdaq · 单位美元 · 财年按公司口径"))
                .font(.caption2).foregroundStyle(.secondary).padding(.horizontal, 4)
        }
    }

    // Profile

    // Key stats

    // Financials

    private struct Bar: Identifiable {
        let id = UUID()
        let period: String
        let series: String
        let value: Double
    }

    private func financialsCard(_ s: Fundamentals.Statements, hasQuarterly: Bool) -> some View {
        let revName = L("营收"), niName = L("净利润")
        let bars: [Bar] = s.periods.indices.flatMap { i -> [Bar] in
            let p = Self.shortPeriod(s.periods[i])
            return [
                s.revenue[safe: i].flatMap { $0 }.map { Bar(period: p, series: revName, value: $0 / 1e9) },
                s.netIncome[safe: i].flatMap { $0 }.map { Bar(period: p, series: niName, value: $0 / 1e9) },
            ].compactMap { $0 }
        }
        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(L("财务表现")).font(.subheadline.weight(.semibold))
                Spacer()
                if hasQuarterly {
                    Picker("", selection: $quarterly) {
                        Text(L("年度")).tag(false)
                        Text(L("季度")).tag(true)
                    }
                    .pickerStyle(.segmented).frame(width: 150)
                }
            }
            Chart(bars) { b in
                BarMark(x: .value("Period", b.period), y: .value("USD bn", b.value))
                    .foregroundStyle(by: .value("Series", b.series))
                    .position(by: .value("Series", b.series))
                    .cornerRadius(3)
            }
            .chartForegroundStyleScale([revName: Color(r: 0x5B, g: 0x9C, b: 0xF6), niName: Color(r: 0x26, g: 0xA6, b: 0x9A)])
            .chartYAxis {
                AxisMarks(position: .leading) { v in
                    AxisGridLine().foregroundStyle(DS.stroke)
                    AxisValueLabel { if let x = v.as(Double.self) { Text("$\(Int(x))B").font(.caption2) } }
                }
            }
            .chartLegend(position: .top, alignment: .leading)
            .frame(height: 180)

            Grid(alignment: .trailing, horizontalSpacing: 8, verticalSpacing: 8) {
                GridRow {
                    Text("").gridColumnAlignment(.leading)
                    ForEach(s.periods, id: \.self) { Text(Self.shortPeriod($0)) }
                }
                .font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
                Divider().gridCellUnsizedAxes(.horizontal)
                row(L("营收"), s.revenue.map { $0.map(Self.money) })
                row(L("净利润"), s.netIncome.map { $0.map(Self.money) })
                row(L("毛利率"), s.grossMargin.map { $0.map { String(format: "%.1f%%", $0) } })
                row(L("净利率"), s.netMargin.map { $0.map { String(format: "%.1f%%", $0) } })
                row(L("自由现金流"), s.freeCashFlow.map { $0.map(Self.money) })
            }
        }
        .card(padding: 14)
    }

    private func row(_ label: String, _ values: [String?]) -> some View {
        GridRow {
            Text(label).font(.caption.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.8).gridColumnAlignment(.leading)
            ForEach(Array(values.enumerated()), id: \.offset) { _, v in
                Text(v ?? "—").font(.caption).monospacedDigit()
                    .foregroundStyle((v ?? "").hasPrefix("-") ? DS.bad : Color.primary)
                    .lineLimit(1).minimumScaleFactor(0.7)
            }
        }
    }

    // Earnings

    private func earningsCard(_ rows: [Fundamentals.Earning]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(L("盈利 vs 预期")).font(.subheadline.weight(.semibold))
            HStack(spacing: 8) {
                ForEach(rows) { r in
                    let beat = (r.surprisePct ?? 0) >= 0
                    VStack(spacing: 4) {
                        Text(r.quarter ?? "").font(.caption2).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.8)
                        Text(r.eps.map { String(format: "$%.2f", $0) } ?? "—").font(.footnote.weight(.semibold)).monospacedDigit()
                        Text(L("预期") + " " + (r.estimate.map { String(format: "$%.2f", $0) } ?? "—"))
                            .font(.caption2).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.7)
                        if let sp = r.surprisePct {
                            Text(String(format: "%+.1f%%", sp)).font(.caption2.weight(.semibold))
                                .foregroundStyle(beat ? DS.good : DS.bad)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(DS.surfaceHi, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
            }
        }
        .card(padding: 14)
    }

    // Analysts

    // Holders

    // Formatting

    static func money(_ v: Double) -> String {
        let a = abs(v), s = v < 0 ? "-" : ""
        if a >= 1e12 { return s + String(format: "$%.2fT", a / 1e12) }
        if a >= 1e9 { return s + String(format: "$%.1fB", a / 1e9) }
        if a >= 1e6 { return s + String(format: "$%.0fM", a / 1e6) }
        return s + String(format: "$%.0f", a)
    }

    /// "FY2025" -> "FY25", "Jun 2026" -> "Jun 26"
    static func shortPeriod(_ p: String) -> String {
        if p.hasPrefix("FY"), p.count == 6 { return "FY" + p.suffix(2) }
        let parts = p.split(separator: " ")
        if parts.count == 2, parts[1].count == 4 { return "\(parts[0]) \(parts[1].suffix(2))" }
        return p
    }

    static func shortDate(_ iso: String) -> String {
        let inF = DateFormatter(); inF.locale = Locale(identifier: "en_US_POSIX"); inF.dateFormat = "yyyy-MM-dd"
        guard let d = inF.date(from: iso) else { return iso }
        let out = DateFormatter(); out.locale = Lang.locale
        out.setLocalizedDateFormatFromTemplate("MMMd")
        return out.string(from: d)
    }
}

private extension Array {
    subscript(safe i: Int) -> Element? { indices.contains(i) ? self[i] : nil }
}
