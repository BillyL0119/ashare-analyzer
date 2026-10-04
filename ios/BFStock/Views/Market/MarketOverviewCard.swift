import SwiftUI

struct MarketOverviewCard: View {
    let overview: MarketOverview

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(overview.date)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                advanceDeclineBar
            }

            HStack(spacing: 0) {
                if let sh = overview.shanghaiIndex {
                    IndexCell(name: "上证", quote: sh)
                }
                if let sz = overview.shenzhenIndex {
                    IndexCell(name: "深证", quote: sz)
                }
                if let cy = overview.chinextIndex {
                    IndexCell(name: "创业板", quote: cy)
                }
            }

            if !overview.sectorPerformance.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(overview.sectorPerformance.prefix(10)) { sector in
                            SectorChip(sector: sector)
                        }
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var advanceDeclineBar: some View {
        HStack(spacing: 4) {
            Text("\(overview.advanceCount)涨")
                .font(.caption2.weight(.medium))
                .foregroundStyle(Theme.cnUp)
            Text("\(overview.flatCount)平")
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text("\(overview.declineCount)跌")
                .font(.caption2.weight(.medium))
                .foregroundStyle(Theme.cnDown)
        }
    }
}

private struct IndexCell: View {
    let name: String
    let quote: IndexQuote

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(name)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(Formatters.price(quote.value))
                .font(.subheadline.weight(.semibold))
                .monospacedDigit()
            Text(Formatters.changePct(quote.pct))
                .font(.caption.weight(.medium))
                .foregroundStyle(Theme.changeColor(quote.pct, market: .cn))
                .monospacedDigit()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct SectorChip: View {
    let sector: SectorPerf

    var body: some View {
        VStack(spacing: 2) {
            Text(sector.name)
                .font(.caption2)
                .lineLimit(1)
            Text(Formatters.changePct(sector.changePct))
                .font(.caption2.weight(.semibold))
                .foregroundStyle(Theme.changeColor(sector.changePct, market: .cn))
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Theme.changeColor(sector.changePct, market: .cn).opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}
