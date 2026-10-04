import SwiftUI

struct SectorListSection: View {
    let sectors: [SectorItem]
    let isLoading: Bool
    let error: String?
    let onRetry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader("行业板块")
            Group {
                if isLoading && sectors.isEmpty {
                    ProgressView().frame(maxWidth: .infinity, minHeight: 80)
                } else if let err = error, sectors.isEmpty {
                    ErrorRetryView(message: err, onRetry: onRetry)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(sectors.enumerated()), id: \.element.id) { idx, sector in
                            NavigationLink(destination: StockDetailView(
                                code: sector.leaderCode, name: sector.leader, market: .cn
                            )) {
                                SectorRow(sector: sector, maxAbs: maxAbsPct)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 11)
                                    .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            if idx < sectors.count - 1 { RowDivider() }
                        }
                    }
                }
            }
            .card(padding: 0)
        }
    }

    private var maxAbsPct: Double {
        max(sectors.map { abs($0.changePct) }.max() ?? 1, 0.01)
    }
}

struct SectorRow: View {
    let sector: SectorItem
    let maxAbs: Double

    var body: some View {
        let color = Theme.changeColor(sector.changePct, market: .cn)
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(sector.name)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                if !sector.leader.isEmpty {
                    Text("领涨 \(sector.leader)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            .frame(width: 92, alignment: .leading)

            GeometryReader { geo in
                let half = geo.size.width / 2
                let len = half * CGFloat(abs(sector.changePct) / maxAbs)
                ZStack {
                    Capsule().fill(DS.surfaceHi)
                    HStack(spacing: 0) {
                        if sector.changePct >= 0 {
                            Spacer().frame(width: half)
                            Capsule().fill(color.gradient).frame(width: max(len, 3))
                            Spacer(minLength: 0)
                        } else {
                            Spacer(minLength: 0)
                            Capsule().fill(color.gradient).frame(width: max(len, 3))
                            Spacer().frame(width: half)
                        }
                    }
                }
            }
            .frame(height: 8)

            PctPill(pct: sector.changePct, market: .cn, minWidth: 62)
        }
    }
}
