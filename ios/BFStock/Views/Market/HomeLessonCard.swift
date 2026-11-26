import SwiftUI
import Charts

/// The top of the Market tab for every market: the headline index with three months of it, and the popular names
/// that moved most. Hong Kong and Japan also list all their popular names below (IntlHotSection).
struct HomeLessonCard: View {
    @ObservedObject var store: HomeLessonStore
    let market: Market

    private var title: String {
        switch market {
        case .us: return L("美股")
        case .cn: return L("A股")
        case .hk: return L("港股")
        case .jp: return L("日股")
        }
    }

    var body: some View {
        if let lesson = store.lesson(for: market), let main = lesson.main {
            content(lesson, main)
        } else if store.failed.contains(market.rawValue) {
            EmptyView()                                   // the cards below still show the market
        } else {
            VStack(alignment: .leading, spacing: 12) {
                RoundedRectangle(cornerRadius: 6).fill(DS.surfaceHi).frame(width: 120, height: 18)
                RoundedRectangle(cornerRadius: 6).fill(DS.surfaceHi).frame(width: 190, height: 34)
                RoundedRectangle(cornerRadius: 10).fill(DS.surfaceHi).frame(height: 96)
            }
            .card()
        }
    }

    private func content(_ lesson: HomeLesson, _ main: LessonIndex) -> some View {
        let pct = main.changePct ?? 0
        let color = Theme.changeColor(pct, market: market)
        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(title).font(.headline)
                Spacer()
                if let day = lesson.asOf { Text(day).font(.caption).monospacedDigit().foregroundStyle(.secondary) }
            }
            if market == .jp {
                Text(L("日股行情约延迟 20 分钟（免费数据源的交易所规定）"))
                    .font(.caption.weight(.medium))
                    .foregroundStyle(DS.accent)
            }
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(main.displayName).font(.footnote).foregroundStyle(.secondary)
                    Text(main.price.map { Formatters.price($0) } ?? "--")
                        .font(.system(size: 30, weight: .medium)).monospacedDigit()
                }
                PctPill(pct: main.changePct, market: market, minWidth: 0).fixedSize()
            }
            if let points = lesson.history, points.count > 5 {
                chart(points, color: color)
                Text(L("近三个月")).font(.caption2).foregroundStyle(.secondary)
            }
            if let movers = lesson.movers, !movers.isEmpty {
                Text(L("热门股里涨跌最大的")).font(.caption).foregroundStyle(.secondary).padding(.top, 2)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(movers) { m in
                            NavigationLink(destination: StockDetailView(code: m.symbol, name: m.displayName, market: market)) {
                                HStack(spacing: 6) {
                                    Text(m.symbol).font(.system(.caption, design: .monospaced).weight(.semibold))
                                    Text(m.pct.map { Formatters.changePct($0) } ?? "--")
                                        .font(.caption.weight(.semibold)).monospacedDigit()
                                        .foregroundStyle(m.pct.map { Theme.changeColor($0, market: market) } ?? .secondary)
                                }
                                .padding(.horizontal, 10).padding(.vertical, 6)
                                .background(DS.surfaceHi, in: Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
        .card()
    }

    private func chart(_ points: [LessonPoint], color: Color) -> some View {
        let values = points.map(\.close)
        let lo = values.min() ?? 0, hi = values.max() ?? 1
        let pad = max((hi - lo) * 0.08, 0.0001)
        return Chart(Array(points.enumerated()), id: \.element.id) { i, p in
            AreaMark(x: .value("i", i), yStart: .value("lo", lo - pad), yEnd: .value("close", p.close))
                .foregroundStyle(LinearGradient(colors: [color.opacity(0.22), color.opacity(0)], startPoint: .top, endPoint: .bottom))
            LineMark(x: .value("i", i), y: .value("close", p.close))
                .foregroundStyle(color)
                .lineStyle(StrokeStyle(lineWidth: 1.8, lineJoin: .round))
        }
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartYScale(domain: (lo - pad)...(hi + pad))
        .frame(height: 96)
        .accessibilityLabel(Text(L("近三个月")))
    }
}

/// Hong Kong / Japan: every popular name of the market with its price and change (same data as the card above).
struct IntlHotSection: View {
    @ObservedObject var store: HomeLessonStore
    let market: Market

    var body: some View {
        if let hot = store.lesson(for: market)?.hot, !hot.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                SectionHeader(L("热门股票"))
                VStack(spacing: 0) {
                    ForEach(Array(hot.enumerated()), id: \.element.id) { i, s in
                        NavigationLink(destination: StockDetailView(code: s.symbol, name: s.displayName, market: market)) {
                            HStack(spacing: 12) {
                                StockRow(code: s.symbol, name: s.displayName, changePct: s.pct, market: market)
                                if let p = s.price {
                                    Text("\(market.currencySymbol)\(Formatters.price(p, decimals: market == .jp ? 0 : 2))")
                                        .font(.footnote).monospacedDigit().foregroundStyle(.secondary)
                                }
                            }
                            .padding(.horizontal, 16).padding(.vertical, 10)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        if i < hot.count - 1 { RowDivider() }
                    }
                }
                .card(padding: 0)
            }
        }
    }
}
