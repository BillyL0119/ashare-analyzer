import SwiftUI
import Charts

/// 1,000 random price paths from the stock's own historical drift and volatility, shown as a probability fan.
struct MonteCarloSection: View {
    let market: Market
    @StateObject private var vm: MonteCarloViewModel

    init(code: String, market: Market) {
        self.market = market
        _vm = StateObject(wrappedValue: MonteCarloViewModel(code: code))
    }

    private let horizons: [(Int, String)] = [(63, "3个月"), (126, "6个月"), (252, "1年")]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("蒙特卡洛模拟")) { if vm.isLoading { ProgressView().scaleEffect(0.7) } }
            VStack(alignment: .leading, spacing: 14) {
                Picker("", selection: $vm.horizon) {
                    ForEach(horizons, id: \.0) { Text(L($0.1)).tag($0.0) }
                }
                .pickerStyle(.segmented)

                if let r = vm.result {
                    chart(r)
                    stats(r.stats, price: r.currentPrice)
                    Text("基于历史收益率和波动率的随机模拟，只是一种可能性的范围，不构成预测或投资建议")
                        .font(.caption2).foregroundStyle(.secondary)
                } else if vm.failed {
                    ErrorRetryView(message: L("加载失败")) { Task { await vm.run() } }
                } else {
                    SkeletonBar(height: 180, radius: DS.tileRadius)
                }
            }
            .card(padding: 16)
        }
        .task(id: vm.horizon) { await vm.run() }
    }

    private struct Point: Identifiable { let id: Int; let lo90, hi90, lo75, hi75, mid: Double }

    private func points(_ r: MonteCarloResult) -> [Point] {
        guard let p10 = r.paths["p10"], let p25 = r.paths["p25"], let p50 = r.paths["p50"],
              let p75 = r.paths["p75"], let p90 = r.paths["p90"] else { return [] }
        let n = min(p10.count, p25.count, p50.count, p75.count, p90.count)
        let step = max(n / 90, 1)                       // keep the chart light
        var idx = Array(stride(from: 0, to: n, by: step))
        if idx.last != n - 1 { idx.append(n - 1) }       // always end on the final day
        return idx.map { i in
            Point(id: i, lo90: p10[i], hi90: p90[i], lo75: p25[i], hi75: p75[i], mid: p50[i])
        }
    }

    private func chart(_ r: MonteCarloResult) -> some View {
        let pts = points(r)
        let up = (pts.last?.mid ?? r.currentPrice) >= r.currentPrice
        let tint = Theme.changeColor(up ? 1 : -1, market: market)
        let lo = (pts.map(\.lo90).min() ?? r.currentPrice) * 0.98
        let hi = (pts.map(\.hi90).max() ?? r.currentPrice) * 1.02
        return Chart {
            ForEach(pts) { p in
                AreaMark(x: .value("Day", p.id), yStart: .value("P10", p.lo90), yEnd: .value("P90", p.hi90), series: .value("S", "90"))
                    .foregroundStyle(tint.opacity(0.14))
                AreaMark(x: .value("Day", p.id), yStart: .value("P25", p.lo75), yEnd: .value("P75", p.hi75), series: .value("S", "75"))
                    .foregroundStyle(tint.opacity(0.26))
                LineMark(x: .value("Day", p.id), y: .value("Median", p.mid), series: .value("S", "mid"))
                    .foregroundStyle(tint).lineStyle(StrokeStyle(lineWidth: 2))
            }
            RuleMark(y: .value("Now", r.currentPrice))
                .foregroundStyle(.secondary.opacity(0.6))
                .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 3]))
        }
        .chartYScale(domain: lo...hi)
        .chartXAxis {
            AxisMarks(values: .automatic(desiredCount: 4)) { v in
                AxisGridLine().foregroundStyle(DS.stroke)
                AxisValueLabel { if let d = v.as(Int.self) { Text(monthsLabel(d)).font(.caption2) } }
            }
        }
        .chartYAxis { AxisMarks(position: .trailing) { _ in AxisGridLine().foregroundStyle(DS.stroke); AxisValueLabel().font(.caption2) } }
        .frame(height: 190)
        .accessibilityLabel(L("蒙特卡洛模拟"))
    }

    /// Trading days -> "+3m" style axis labels.
    private func monthsLabel(_ days: Int) -> String {
        days == 0 ? L("现在") : "+\(max(Int((Double(days) / 21).rounded()), 1))" + L("月")
    }

    private func stats(_ s: MonteCarloStats, price: Double) -> some View {
        let items: [(String, String, Color?)] = [
            (L("上涨概率"), String(format: "%.0f%%", s.probGain * 100), nil),
            (L("预期收益"), Formatters.changePct(s.expectedReturn * 100), Theme.changeColor(s.expectedReturn, market: market)),
            (L("中位价格"), Formatters.price(s.medianPrice), nil),
            (L("95%最差价"), Formatters.price(s.var95Price), Theme.changeColor(-1, market: market)),
        ]
        return LazyVGrid(columns: Array(repeating: .init(.flexible()), count: 2), spacing: 12) {
            ForEach(items, id: \.0) { item in
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.0).font(.caption2).foregroundStyle(.secondary)
                    Text(item.1).font(.system(.subheadline, design: .rounded).weight(.bold)).monospacedDigit()
                        .foregroundStyle(item.2 ?? .primary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}
