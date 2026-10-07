import SwiftUI

/// Multi-dimension quant score (technical / fundamental / sentiment / risk) for one stock.
struct StockScoreSection: View {
    @StateObject private var vm: StockScoreViewModel
    @State private var expanded: String?

    init(symbol: String) { _vm = StateObject(wrappedValue: StockScoreViewModel(symbol: symbol)) }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("综合评分")) { if vm.isLoading { ProgressView().scaleEffect(0.7) } }
            Group {
                if let s = vm.score {
                    content(s)
                } else if vm.failed {
                    ErrorRetryView(message: L("加载失败")) { Task { await vm.load() } }
                } else {
                    SkeletonRows(rows: 3, trailingPill: false)
                }
            }
            .card(padding: 16)
        }
        .task { await vm.load() }
    }

    private func content(_ s: StockScore) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 16) {
                ScoreRing(value: s.total, max: 100, grade: s.grade)
                Text(Lang.code == "zh" ? s.summaryZh : s.summaryEn)
                    .font(.footnote).foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            VStack(spacing: 12) {
                dimension("technical", L("技术面"), s.dimensions.technical)
                dimension("fundamental", L("基本面"), s.dimensions.fundamental)
                dimension("sentiment", L("情绪面"), s.dimensions.sentiment)
                dimension("risk", L("风险"), s.dimensions.risk)
            }
        }
    }

    private func color(_ ratio: Double) -> Color {
        ratio >= 0.7 ? Color(red: 0.18, green: 0.72, blue: 0.39) : ratio >= 0.4 ? .orange : Color(red: 0.93, green: 0.26, blue: 0.26)
    }

    private func dimension(_ key: String, _ title: String, _ d: ScoreDimension) -> some View {
        let ratio = d.max > 0 ? d.score / d.max : 0
        return VStack(alignment: .leading, spacing: 6) {
            Button {
                withAnimation(.snappy(duration: 0.25)) { expanded = expanded == key ? nil : key }
            } label: {
                VStack(spacing: 6) {
                    HStack {
                        Text(title).font(.subheadline.weight(.medium))
                        Spacer()
                        Text("\(Int(d.score))/\(Int(d.max))")
                            .font(.system(.footnote, design: .rounded).weight(.semibold)).monospacedDigit()
                            .foregroundStyle(color(ratio))
                        Image(systemName: "chevron.down").font(.caption2).foregroundStyle(.tertiary)
                            .rotationEffect(.degrees(expanded == key ? 180 : 0))
                    }
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(DS.surfaceHi)
                            Capsule().fill(color(ratio)).frame(width: max(geo.size.width * ratio, 4))
                        }
                    }
                    .frame(height: 6)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if expanded == key {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(d.details) { item in
                        HStack(alignment: .top, spacing: 8) {
                            Text("\(Int(item.score))/\(Int(item.max))")
                                .font(.caption.weight(.semibold)).monospacedDigit()
                                .foregroundStyle(color(item.max > 0 ? item.score / item.max : 0))
                                .frame(width: 38, alignment: .leading)
                            Text(Lang.code == "zh" ? item.noteZh : item.noteEn)
                                .font(.caption).foregroundStyle(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(DS.surfaceHi.opacity(0.7), in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
                .transition(.opacity)
            }
        }
    }
}

private struct ScoreRing: View {
    let value: Double
    let max: Double
    let grade: String

    var body: some View {
        let ratio = Swift.min(Swift.max(value / max, 0), 1)
        let tint: Color = ratio >= 0.7 ? Color(red: 0.18, green: 0.72, blue: 0.39) : ratio >= 0.4 ? .orange : Color(red: 0.93, green: 0.26, blue: 0.26)
        ZStack {
            Circle().stroke(DS.surfaceHi, lineWidth: 9)
            Circle().trim(from: 0, to: ratio)
                .stroke(tint, style: StrokeStyle(lineWidth: 9, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 0) {
                Text("\(Int(value))").font(.system(size: 28, weight: .bold, design: .rounded)).monospacedDigit()
                Text(grade).font(.caption.weight(.bold)).foregroundStyle(tint)
            }
        }
        .frame(width: 86, height: 86)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(Int(value)) / 100, \(grade)")
    }
}
