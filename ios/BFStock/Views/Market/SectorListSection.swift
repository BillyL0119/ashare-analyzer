import SwiftUI

struct SectorListSection: View {
    let sectors: [SectorItem]
    let isLoading: Bool
    let error: String?
    let onRetry: () -> Void

    var body: some View {
        Section {
            if isLoading && sectors.isEmpty {
                ProgressView(String(localized: "loading"))
                    .frame(maxWidth: .infinity)
            } else if let err = error, sectors.isEmpty {
                ErrorRetryView(message: err, onRetry: onRetry)
            } else {
                ForEach(sectors) { sector in
                    NavigationLink(destination: StockDetailView(
                        code: sector.leaderCode,
                        name: sector.leader,
                        market: .cn
                    )) {
                        SectorRow(sector: sector, maxAbs: maxAbsPct)
                    }
                }
            }
        } header: {
            Text("行业板块")
        }
    }

    private var maxAbsPct: Double {
        sectors.map { abs($0.changePct) }.max() ?? 1
    }
}

struct SectorRow: View {
    let sector: SectorItem
    let maxAbs: Double

    var body: some View {
        HStack(spacing: 8) {
            // Sector name
            Text(sector.name)
                .font(.subheadline)
                .frame(width: 80, alignment: .leading)
                .lineLimit(1)

            // Bar chart
            GeometryReader { geo in
                let total = geo.size.width
                let barW = CGFloat(abs(sector.changePct) / maxAbs) * (total * 0.5)
                let isUp = sector.changePct >= 0

                ZStack(alignment: isUp ? .leading : .trailing) {
                    // Center divider
                    Rectangle()
                        .fill(Color.secondary.opacity(0.15))
                        .frame(width: 1)
                        .frame(maxWidth: .infinity, alignment: .center)

                    // Bar (right half for up, left half for down)
                    HStack(spacing: 0) {
                        if isUp {
                            Spacer()
                            RoundedRectangle(cornerRadius: 2)
                                .fill(barColor)
                                .frame(width: max(barW, 2))
                        } else {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(barColor)
                                .frame(width: max(barW, 2))
                            Spacer()
                        }
                    }
                }
            }
            .frame(height: 14)

            // Leader stock name
            Text(sector.leader.isEmpty ? "—" : sector.leader)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .frame(width: 60, alignment: .leading)
                .lineLimit(1)

            // Change percent
            Text(pctText)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(barColor)
                .monospacedDigit()
                .frame(width: 58, alignment: .trailing)
        }
        .padding(.vertical, 2)
    }

    private var barColor: Color {
        sector.changePct >= 0 ? Color(red: 0.18, green: 0.72, blue: 0.39) : Color(red: 0.93, green: 0.26, blue: 0.26)
    }

    private var pctText: String {
        let sign = sector.changePct >= 0 ? "+" : ""
        return "\(sign)\(String(format: "%.2f", sector.changePct))%"
    }
}
