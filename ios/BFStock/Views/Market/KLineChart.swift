import SwiftUI
import Charts

struct KLineChart: View {
    let candles: [Candle]
    let ma5:  [Double?]
    let ma10: [Double?]
    let ma20: [Double?]
    let market: Market
    let priceRange: ClosedRange<Double>
    var bollUpper:  [Double?] = []
    var bollMiddle: [Double?] = []
    var bollLower:  [Double?] = []

    @State private var selectedIndex: Int?
    private let haptic = UISelectionFeedbackGenerator()

    private var selected: Candle? { selectedIndex.flatMap { candles.indices.contains($0) ? candles[$0] : nil } }

    var body: some View {
        Chart {
            if let i = selectedIndex {
                RuleMark(x: .value("Idx", Double(i)))
                    .foregroundStyle(Color.secondary.opacity(0.8))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 3]))
            }

            // Candlestick wicks (high-low)
            ForEach(Array(candles.enumerated()), id: \.element.id) { i, c in
                RuleMark(
                    x: .value("Idx", Double(i)),
                    yStart: .value("Low",  c.low),
                    yEnd:   .value("High", c.high)
                )
                .foregroundStyle(candleColor(c))
                .lineStyle(StrokeStyle(lineWidth: 1))
            }

            // Candlestick bodies (open-close)
            ForEach(Array(candles.enumerated()), id: \.element.id) { i, c in
                RectangleMark(
                    x:      .value("Idx",  Double(i)),
                    yStart: .value("Open",  min(c.open, c.close)),
                    yEnd:   .value("Close", max(c.open, c.close)),
                    width:  .fixed(bodyWidth)
                )
                .foregroundStyle(candleColor(c))
            }

            // MA5
            ForEach(Array(ma5.enumerated()), id: \.offset) { i, v in
                if let v {
                    LineMark(x: .value("Idx", Double(i)), y: .value("MA5", v), series: .value("Series", "MA5"))
                        .foregroundStyle(DS.ma5)
                        .lineStyle(StrokeStyle(lineWidth: 1))
                        .interpolationMethod(.monotone)
                }
            }

            // MA10
            ForEach(Array(ma10.enumerated()), id: \.offset) { i, v in
                if let v {
                    LineMark(x: .value("Idx", Double(i)), y: .value("MA10", v), series: .value("Series", "MA10"))
                        .foregroundStyle(DS.ma10)
                        .lineStyle(StrokeStyle(lineWidth: 1))
                        .interpolationMethod(.monotone)
                }
            }

            // MA20
            ForEach(Array(ma20.enumerated()), id: \.offset) { i, v in
                if let v {
                    LineMark(x: .value("Idx", Double(i)), y: .value("MA20", v), series: .value("Series", "MA20"))
                        .foregroundStyle(DS.ma20)
                        .lineStyle(StrokeStyle(lineWidth: 1))
                        .interpolationMethod(.monotone)
                }
            }

            // Bollinger Upper Band
            ForEach(Array(bollUpper.enumerated()), id: \.offset) { i, v in
                if let v {
                    LineMark(x: .value("Idx", Double(i)), y: .value("BU", v), series: .value("Series", "BU"))
                        .foregroundStyle(DS.boll.opacity(0.9))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 2]))
                        .interpolationMethod(.monotone)
                }
            }

            // Bollinger Middle Band
            ForEach(Array(bollMiddle.enumerated()), id: \.offset) { i, v in
                if let v {
                    LineMark(x: .value("Idx", Double(i)), y: .value("BM", v), series: .value("Series", "BM"))
                        .foregroundStyle(DS.boll.opacity(0.55))
                        .lineStyle(StrokeStyle(lineWidth: 1))
                        .interpolationMethod(.monotone)
                }
            }

            // Bollinger Lower Band
            ForEach(Array(bollLower.enumerated()), id: \.offset) { i, v in
                if let v {
                    LineMark(x: .value("Idx", Double(i)), y: .value("BL", v), series: .value("Series", "BL"))
                        .foregroundStyle(DS.boll.opacity(0.9))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 2]))
                        .interpolationMethod(.monotone)
                }
            }
        }
        .chartYScale(domain: priceRange)
        .chartXScale(domain: candles.indexDomain)
        .chartXAxis {
            AxisMarks(values: candles.monthStarts.map(Double.init)) { v in
                AxisGridLine()
                AxisValueLabel {
                    if let x = v.as(Double.self), candles.indices.contains(Int(x)) {
                        Text(candles[Int(x)].parsedDate, format: .dateTime.month(.abbreviated))
                    }
                }
            }
        }
        .chartYAxis {
            AxisMarks(position: .trailing) { v in
                AxisGridLine()
                AxisValueLabel {
                    if let d = v.as(Double.self) { ChartAxisLabel(text: d.formatted(.number.precision(.fractionLength(0...2)))) }
                }
            }
        }
        .chartLegend(.hidden)
        .chartOverlay { proxy in
            GeometryReader { geo in
                Rectangle().fill(Color.clear).contentShape(Rectangle())
                    .gesture(
                        LongPressGesture(minimumDuration: 0.25)
                            .sequenced(before: DragGesture(minimumDistance: 0))
                            .onChanged { value in
                                guard case .second(true, let drag?) = value,
                                      let frame = proxy.plotFrame else { return }
                                let x = drag.location.x - geo[frame].origin.x
                                guard let pos: Double = proxy.value(atX: x), !candles.isEmpty else { return }
                                let i = min(max(Int(pos.rounded()), 0), candles.count - 1)
                                if i != selectedIndex { haptic.selectionChanged() }
                                selectedIndex = i
                            }
                            .onEnded { _ in selectedIndex = nil }
                    )
            }
        }
        .overlay(alignment: .top) {
            if let s = selected { infoBar(s) }
        }
    }

    private func changePct(of c: Candle) -> Double {
        if c.pctChange != 0 { return c.pctChange }
        guard let i = selectedIndex, i > 0, candles[i - 1].close != 0 else { return 0 }
        return (c.close - candles[i - 1].close) / candles[i - 1].close * 100
    }

    private func infoBar(_ c: Candle) -> some View {
        let pct = changePct(of: c)
        return VStack(spacing: 3) {
            HStack(spacing: 8) {
                Text(c.date).font(.system(.caption2, design: .rounded).weight(.semibold))
                Text(Formatters.changePct(pct))
                    .font(.system(.caption2, design: .rounded).weight(.bold))
                    .monospacedDigit()
                    .foregroundStyle(Theme.changeColor(pct, market: market))
            }
            HStack(spacing: 10) {
                ForEach([(L("开"), c.open), (L("高"), c.high), (L("低"), c.low), (L("收"), c.close)], id: \.0) { label, v in
                    HStack(spacing: 2) {
                        Text(label).foregroundStyle(.secondary)
                        Text(Formatters.price(v)).monospacedDigit()
                    }
                    .font(.system(.caption2, design: .rounded))
                }
            }
        }
        .lineLimit(1)
        .fixedSize()
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(DS.stroke))
        .padding(.top, 2)
        .transition(.opacity)
    }

    private func candleColor(_ c: Candle) -> Color {
        Theme.changeColor(c.isUp ? 1 : -1, market: market)
    }

    private var bodyWidth: CGFloat {
        switch candles.count {
        case ...30:  return 5
        case ...60:  return 3
        case ...120: return 2
        default:     return 1.5
        }
    }
}

// MARK: - Volume Chart

struct VolumeChart: View {
    let candles: [Candle]
    let market: Market

    var body: some View {
        Chart(Array(candles.enumerated()), id: \.element.id) { i, c in
            BarMark(
                x:     .value("Idx",    Double(i)),
                y:     .value("Volume", c.volume),
                width: .fixed(bodyWidth)
            )
            .foregroundStyle(Theme.changeColor(c.isUp ? 1 : -1, market: market).opacity(0.8))
        }
        .chartXAxis(.hidden)
        .chartXScale(domain: candles.indexDomain)
        .chartYAxis {
            AxisMarks(position: .trailing, values: .automatic(desiredCount: 2)) { v in
                AxisGridLine()
                AxisValueLabel {
                    if let d = v.as(Double.self), d > 0 { ChartAxisLabel(text: Formatters.volumeTick(d)) }
                }
            }
        }
    }

    private var bodyWidth: CGFloat {
        switch candles.count {
        case ...30:  return 5
        case ...60:  return 3
        case ...120: return 2
        default:     return 1.5
        }
    }
}

// MARK: - MACD Chart

struct MACDChart: View {
    let candles:    [Candle]
    let macdLine:   [Double?]
    let signalLine: [Double?]
    let histogram:  [Double?]
    let market:     Market

    var body: some View {
        Chart {
            // Zero rule
            RuleMark(y: .value("Zero", 0))
                .foregroundStyle(Color.secondary.opacity(0.3))
                .lineStyle(StrokeStyle(lineWidth: 0.5))

            // Histogram bars
            ForEach(Array(histogram.enumerated()), id: \.offset) { i, h in
                if let h {
                    BarMark(
                        x: .value("Idx", Double(i)),
                        y: .value("Hist", h),
                        width: .fixed(barWidth)
                    )
                    .foregroundStyle(Theme.changeColor(h >= 0 ? 1 : -1, market: market).opacity(0.7))
                }
            }

            // MACD line (white/primary adapts to dark mode)
            ForEach(Array(macdLine.enumerated()), id: \.offset) { i, v in
                if let v {
                    LineMark(x: .value("Idx", Double(i)), y: .value("MACD", v), series: .value("Series", "MACD"))
                        .foregroundStyle(Color.primary)
                        .lineStyle(StrokeStyle(lineWidth: 1))
                        .interpolationMethod(.monotone)
                }
            }

            // Signal line
            ForEach(Array(signalLine.enumerated()), id: \.offset) { i, v in
                if let v {
                    LineMark(x: .value("Idx", Double(i)), y: .value("Sig", v), series: .value("Series", "Sig"))
                        .foregroundStyle(DS.ma5)
                        .lineStyle(StrokeStyle(lineWidth: 1))
                        .interpolationMethod(.monotone)
                }
            }
        }
        .chartXAxis(.hidden)
        .chartXScale(domain: candles.indexDomain)
        .chartYAxis {
            AxisMarks(position: .trailing, values: .automatic(desiredCount: 3)) { v in
                AxisGridLine()
                AxisValueLabel {
                    if let d = v.as(Double.self) { ChartAxisLabel(text: d.formatted(.number.precision(.fractionLength(0...2)))) }
                }
            }
        }
    }

    private var barWidth: CGFloat {
        switch candles.count {
        case ...30:  return 5
        case ...60:  return 3
        case ...120: return 2
        default:     return 1.5
        }
    }
}

// MARK: - RSI Chart

struct RSIChart: View {
    let candles: [Candle]
    let values:  [Double?]

    var body: some View {
        Chart {
            RuleMark(y: .value("OB", 70))
                .foregroundStyle(Color.secondary.opacity(0.4))
                .lineStyle(StrokeStyle(lineWidth: 1, dash: [4]))
            RuleMark(y: .value("OS", 30))
                .foregroundStyle(Color.secondary.opacity(0.4))
                .lineStyle(StrokeStyle(lineWidth: 1, dash: [4]))

            ForEach(Array(values.enumerated()), id: \.offset) { i, v in
                if let v {
                    LineMark(x: .value("Idx", Double(i)), y: .value("RSI", v), series: .value("Series", "RSI"))
                        .foregroundStyle(Color.purple)
                        .lineStyle(StrokeStyle(lineWidth: 1.5))
                        .interpolationMethod(.monotone)
                }
            }
        }
        .chartXAxis(.hidden)
        .chartXScale(domain: candles.indexDomain)
        .chartYScale(domain: 0...100)
        .chartYAxis {
            AxisMarks(position: .trailing, values: [30, 50, 70]) { v in
                AxisGridLine()
                AxisValueLabel {
                    if let d = v.as(Double.self) { ChartAxisLabel(text: d.formatted(.number)) }
                }
            }
        }
    }
}

// MARK: - Axis helpers

/// Fixed-width trailing axis label so the price, volume, MACD and RSI plots share one width
/// and their bars line up with the candles above.
struct ChartAxisLabel: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.caption2)
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(width: 40, alignment: .leading)
    }
}


extension [Candle] {
    /// Candles are plotted by position so weekends and holidays leave no gaps.
    var indexDomain: ClosedRange<Double> { -0.6...(Double(Swift.max(count, 1)) - 0.4) }

    /// Positions of the first trading day of each month, thinned to at most six labels.
    var monthStarts: [Int] {
        let cal = Calendar.current
        var starts: [Int] = []
        for i in indices.dropFirst() where cal.component(.month, from: self[i].parsedDate) != cal.component(.month, from: self[i - 1].parsedDate) {
            starts.append(i)
        }
        let step = Swift.max(1, Int((Double(starts.count) / 6).rounded(.up)))
        return starts.enumerated().filter { $0.offset % step == 0 }.map(\.element)
    }
}
