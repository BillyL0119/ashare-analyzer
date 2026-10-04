import SwiftUI

struct MarketOverviewCard: View {
    let overview: MarketOverview

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 6) {
                Circle().fill(DS.accent).frame(width: 6, height: 6)
                Text("A股大盘")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text(overview.date)
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(.secondary)
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
                HStack(spacing: 10) {
                    if let sh = overview.shanghaiIndex { IndexTile(name: "上证指数", quote: sh) }
                    if let sz = overview.shenzhenIndex { IndexTile(name: "深证成指", quote: sz) }
                    if let cy = overview.chinextIndex { IndexTile(name: "创业板指", quote: cy) }
                }
            }

            breadth

            if !overview.sectorPerformance.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(overview.sectorPerformance.prefix(10)) { SectorChip(sector: $0) }
                    }
                }
                .padding(.horizontal, -16)
                .contentMargins(.horizontal, 16, for: .scrollContent)
            }
        }
        .card()
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

    var body: some View {
        let color = Theme.changeColor(quote.pct, market: .cn)
        VStack(alignment: .leading, spacing: 6) {
            Text(name)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            Text(Formatters.price(quote.value))
                .font(.system(.callout, design: .rounded).weight(.bold))
                .monospacedDigit()
                .minimumScaleFactor(0.7)
                .lineLimit(1)
            Text(Formatters.changePct(quote.pct))
                .font(.system(.caption, design: .rounded).weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(color)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(colors: [color.opacity(0.16), DS.surfaceHi.opacity(0.6)],
                           startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous)
        )
    }
}

private struct SectorChip: View {
    let sector: SectorPerf

    var body: some View {
        let color = Theme.changeColor(sector.changePct, market: .cn)
        HStack(spacing: 6) {
            Text(sector.name).font(.caption.weight(.medium)).lineLimit(1)
            Text(Formatters.changePct(sector.changePct))
                .font(.system(.caption, design: .rounded).weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(color)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(color.opacity(0.12), in: Capsule())
    }
}
