import SwiftUI

struct StockNewsSection: View {
    let items: [NewsItem]
    let overall: NewsOverall?
    let isLoading: Bool
    let error: String?
    let onRetry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("相关新闻")) {
                if isLoading { ProgressView().scaleEffect(0.7) }
            }

            VStack(alignment: .leading, spacing: 0) {
                if isLoading && items.isEmpty {
                    SkeletonRows(rows: 4, trailingPill: false)
                } else if let err = error, items.isEmpty {
                    ErrorRetryView(message: err, onRetry: onRetry)
                } else if !items.isEmpty {
                    if let ov = overall {
                        overallCard(ov)
                            .padding(12)
                        RowDivider().padding(.leading, 0)
                    }
                    let rows = Array(items.prefix(10).enumerated())
                    ForEach(rows, id: \.element.id) { idx, item in
                        NewsRow(item: item)
                        if idx < rows.count - 1 { RowDivider() }
                    }
                }
            }
            .card(padding: 0)
        }
    }

    private func overallCard(_ ov: NewsOverall) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 0) {
                sentBadge(L("利好"), count: ov.positiveCount, color: upGreen)
                Text("  ·  ").font(.caption2).foregroundStyle(.tertiary)
                sentBadge(L("中性"), count: ov.neutralCount, color: .secondary)
                Text("  ·  ").font(.caption2).foregroundStyle(.tertiary)
                sentBadge(L("利空"), count: ov.negativeCount, color: downRed)
                Spacer()
                scoreLabel(ov.sentimentScore)
            }
            if !ov.aiSummary.isEmpty {
                Text(ov.aiSummary)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(4)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(12)
        .background(DS.surfaceHi, in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
    }

    private func sentBadge(_ label: String, count: Int, color: Color) -> some View {
        HStack(spacing: 3) {
            Text(label).font(.caption2).foregroundStyle(color)
            Text("\(count)").font(.caption.monospacedDigit()).foregroundStyle(color)
        }
    }

    private func scoreLabel(_ score: Double) -> some View {
        let color: Color = score > 0.05 ? upGreen : (score < -0.05 ? downRed : .secondary)
        let sign = score > 0 ? "+" : ""
        return Text(L("情感 %@", "\(sign)\(String(format: "%.2f", score))"))
            .font(.caption.monospacedDigit())
            .foregroundStyle(color)
    }

    private var upGreen: Color { Color(red: 0.18, green: 0.72, blue: 0.39) }
    private var downRed: Color { Color(red: 0.93, green: 0.26, blue: 0.26) }
}

struct NewsRow: View {
    let item: NewsItem

    var body: some View {
        Button {
            SafeURL.open(item.url)
        } label: {
            HStack(alignment: .top, spacing: 10) {
                Circle()
                    .fill(sentColor)
                    .frame(width: 8, height: 8)
                    .padding(.top, 5)

                VStack(alignment: .leading, spacing: 4) {
                    Text(item.title)
                        .font(.subheadline)
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    HStack(spacing: 6) {
                        Text(item.source)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Text(displayTime)
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                        Spacer()
                        Text(sentLabel)
                            .font(.caption2.weight(.medium))
                            .foregroundStyle(sentColor)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .buttonStyle(.plain)
    }

    private var sentColor: Color {
        switch item.finalSentiment {
        case "positive": return Color(red: 0.18, green: 0.72, blue: 0.39)
        case "negative": return Color(red: 0.93, green: 0.26, blue: 0.26)
        default:         return .secondary
        }
    }

    private var sentLabel: String {
        switch item.finalSentiment {
        case "positive": return L("利好")
        case "negative": return L("利空")
        default:         return L("中性")
        }
    }

    private var displayTime: String {
        // Try to extract just HH:mm or date from various time string formats
        let t = item.time
        // "2024-01-15 10:30:00" or "2024-01-15T10:30:00"
        if t.count >= 16 {
            let start = t.index(t.startIndex, offsetBy: 5)
            let end = t.index(t.startIndex, offsetBy: 16)
            return String(t[start..<end]).replacingOccurrences(of: "T", with: " ")
        }
        return t
    }
}
