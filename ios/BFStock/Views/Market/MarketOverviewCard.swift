import SwiftUI

struct MarketOverviewCard: View {
    let overview: MarketOverview

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text("A股大盘").font(.headline)
                    Spacer()
                    HStack(spacing: 5) {
                        Circle().fill(session.color).frame(width: 6, height: 6)
                        Text(session.label).font(.caption.weight(.semibold))
                    }
                    .padding(.horizontal, 9).padding(.vertical, 4)
                    .background(session.color.opacity(0.14), in: Capsule())
                    .foregroundStyle(session.color)
                }
                Text("\(overview.date) \(overview.time) " + L("北京时间"))
                    .font(.system(.caption, design: .rounded)).monospacedDigit().foregroundStyle(.secondary)
            }

            if overview.shanghaiIndex == nil && overview.shenzhenIndex == nil && overview.chinextIndex == nil {
                HStack(spacing: 8) {
                    Image(systemName: "moon.zzz.fill").foregroundStyle(DS.accent)
                    Text("暂无指数数据，开盘后自动更新")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(DS.surfaceHi, in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
            } else {
                VStack(spacing: 8) {
                    if let sh = overview.shanghaiIndex { IndexTile(name: L("上证指数"), quote: sh, hero: true) }
                    HStack(spacing: 8) {
                        if let sz = overview.shenzhenIndex { IndexTile(name: L("深证成指"), quote: sz) }
                        if let cy = overview.chinextIndex { IndexTile(name: L("创业板指"), quote: cy) }
                    }
                }
            }

            breadth
        }
        .card()
    }

    /// A-share session from Beijing time; a stale data date means the market is closed today (weekend or holiday).
    private var session: (label: String, color: Color) {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "Asia/Shanghai")!
        let now = Date()
        let f = DateFormatter()
        f.calendar = cal; f.timeZone = cal.timeZone; f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"
        let closed = (L("休市"), Color.secondary)
        guard f.string(from: now) == overview.date, !cal.isDateInWeekend(now) else { return closed }
        let m = cal.component(.hour, from: now) * 60 + cal.component(.minute, from: now)
        switch m {
        case 555..<570: return (L("集合竞价"), Color.orange)
        case 570..<690, 780..<900: return (L("交易中"), Theme.cnUp)
        case 690..<780: return (L("午间休市"), Color.orange)
        default: return closed
        }
    }

    private var breadth: some View {
        let up = Double(overview.advanceCount)
        let flat = Double(overview.flatCount)
        let down = Double(overview.declineCount)
        let total = up + flat + down
        return VStack(spacing: 8) {
            GeometryReader { geo in
                let w = geo.size.width - 4
                HStack(spacing: 2) {
                    if total == 0 {
                        Capsule().fill(DS.surfaceHi)
                    } else {
                        Capsule().fill(Theme.cnUp).frame(width: max(w * up / total, up > 0 ? 3 : 0))
                        Capsule().fill(Color.secondary.opacity(0.35)).frame(width: max(w * flat / total, flat > 0 ? 3 : 0))
                        Capsule().fill(Theme.cnDown)
                    }
                }
            }
            .frame(height: 6)

            HStack {
                Text("\(overview.advanceCount) 上涨").foregroundStyle(Theme.cnUp)
                Spacer()
                Text("\(overview.flatCount) 平盘").foregroundStyle(.secondary)
                Spacer()
                Text("\(overview.declineCount) 下跌").foregroundStyle(Theme.cnDown)
            }
            .font(.system(.caption2, design: .rounded).weight(.medium))
            .monospacedDigit()
        }
    }
}

private struct IndexTile: View {
    let name: String
    let quote: IndexQuote
    var hero = false

    var body: some View {
        let color = Theme.changeColor(quote.pct, market: .cn)
        Group {
            if hero {
                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(name).font(.footnote.weight(.medium)).foregroundStyle(.secondary)
                        Text(Formatters.price(quote.value))
                            .font(.system(size: 34, weight: .bold, design: .rounded)).monospacedDigit()
                            .minimumScaleFactor(0.7).lineLimit(1)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 4) {
                        PctPill(pct: quote.pct, market: .cn, fixedWidth: 84)
                        Text(Formatters.changeAbs(quote.change))
                            .font(.system(.caption, design: .rounded).weight(.semibold)).monospacedDigit()
                            .foregroundStyle(color)
                    }
                }
                .padding(.horizontal, 16).padding(.vertical, 14)
            } else {
                VStack(alignment: .leading, spacing: 3) {
                    Text(name).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                    Text(Formatters.price(quote.value))
                        .font(.system(.subheadline, design: .rounded).weight(.bold)).monospacedDigit()
                        .minimumScaleFactor(0.6).lineLimit(1)
                    Text(Formatters.changePct(quote.pct))
                        .font(.system(.caption, design: .rounded).weight(.semibold)).monospacedDigit()
                        .foregroundStyle(color)
                }
                .padding(.horizontal, 12).padding(.vertical, 10)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
        .background(
            LinearGradient(colors: [color.opacity(0.16), DS.surfaceHi.opacity(0.6)], startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
    }
}
