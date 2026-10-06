import SwiftUI

struct GlobalMarketSection: View {
    let sentiment: SentimentResponse?
    let isLoading: Bool
    let error: String?
    let onRetry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("全球市场"))
            Group {
                if let s = sentiment {
                    VStack(spacing: 18) {
                        HStack(spacing: 12) {
                            GaugeTile(title: L("美股情绪"), gauge: s.usSentiment)
                            GaugeTile(title: L("A股情绪"), gauge: s.cnSentiment)
                        }
                        indexStrip(s.indices)
                    }
                    .padding(16)
                } else if let err = error, !isLoading {
                    ErrorRetryView(message: err, onRetry: onRetry)
                } else {
                    VStack(spacing: 14) {
                        HStack(spacing: 12) {
                            SkeletonBar(height: 124, radius: DS.tileRadius)
                            SkeletonBar(height: 124, radius: DS.tileRadius)
                        }
                        SkeletonBar(height: 72, radius: DS.tileRadius)
                    }
                    .padding(16)
                }
            }
            .card(padding: 0)
        }
    }

    private func indexStrip(_ indices: [GlobalIndex]) -> some View {
        let shown = indices.filter { $0.close != nil && $0.changePct != nil && ($0.close ?? 0) > 0 }
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(shown) { IndexChip(index: $0) }
            }
            .padding(.horizontal, 16)
        }
        .padding(.horizontal, -16)
    }
}

private struct IndexChip: View {
    let index: GlobalIndex

    var body: some View {
        let pct = index.changePct ?? 0
        let color = Theme.changeColor(pct, market: index.market)
        VStack(alignment: .leading, spacing: 5) {
            Text(index.displayName)
                .font(.caption2.weight(.medium))
                .foregroundStyle(.secondary)
                .lineLimit(1)
            Text(Formatters.price(index.close ?? 0))
                .font(.system(.subheadline, design: .rounded).weight(.bold))
                .monospacedDigit()
            Text(Formatters.changePct(pct))
                .font(.system(.caption, design: .rounded).weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(color)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(minWidth: 104, alignment: .leading)
        .background(
            LinearGradient(colors: [color.opacity(0.14), DS.surfaceHi.opacity(0.6)],
                           startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous)
        )
        .accessibilityElement(children: .combine)
    }
}

/// Fear / greed half-dial: red (fear) -> amber -> green (greed).
private struct GaugeTile: View {
    let title: String
    let gauge: SentimentGauge
    @State private var shown = false

    private var score: Double { min(max(gauge.score, 0), 100) }
    private var tint: Color {
        switch score {
        case ..<30: return Color(r: 0xEF, g: 0x53, b: 0x50)
        case ..<45: return Color(r: 0xF2, g: 0x8B, b: 0x3C)
        case ..<55: return Color(r: 0xE8, g: 0xC5, b: 0x4A)
        case ..<70: return Color(r: 0x8F, g: 0xCB, b: 0x5A)
        default:    return Color(r: 0x2F, g: 0xB8, b: 0x6A)
        }
    }

    var body: some View {
        VStack(spacing: 6) {
            Text(title)
                .font(.caption.weight(.medium))
                .foregroundStyle(.secondary)

            ZStack {
                Arc(from: 0, to: 1)
                    .stroke(DS.surfaceHi, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                Arc(from: 0, to: 1)
                    .stroke(
                        LinearGradient(
                            colors: [Color(r: 0xEF, g: 0x53, b: 0x50), Color(r: 0xF2, g: 0x8B, b: 0x3C),
                                     Color(r: 0xE8, g: 0xC5, b: 0x4A), Color(r: 0x8F, g: 0xCB, b: 0x5A),
                                     Color(r: 0x2F, g: 0xB8, b: 0x6A)],
                            startPoint: .leading, endPoint: .trailing),
                        style: StrokeStyle(lineWidth: 10, lineCap: .round))
                    .mask(
                        Arc(from: 0, to: shown ? score / 100 : 0)
                            .stroke(Color.black, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                    )
                VStack(spacing: 0) {
                    Text(String(format: "%.0f", score))
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .contentTransition(.numericText(value: score))
                }
                .offset(y: 8)
            }
            .frame(height: 64)
            .padding(.horizontal, 6)

            Text(L(gauge.labelZh))
                .font(.system(.footnote, design: .rounded).weight(.bold))
                .foregroundStyle(tint)
        }
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity)
        .background(DS.surfaceHi.opacity(0.55), in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(title)
        .accessibilityValue("\(Int(score)), \(L(gauge.labelZh))")
        .onAppear { withAnimation(.easeOut(duration: 0.9)) { shown = true } }
    }
}

private struct Arc: Shape {
    var from: Double
    var to: Double

    var animatableData: Double {
        get { to }
        set { to = newValue }
    }

    func path(in rect: CGRect) -> Path {
        var p = Path()
        let radius = min(rect.width / 2, rect.height) - 5
        p.addArc(center: CGPoint(x: rect.midX, y: rect.maxY - 4), radius: radius,
                 startAngle: .degrees(180 + 180 * from), endAngle: .degrees(180 + 180 * to), clockwise: false)
        return p
    }
}
