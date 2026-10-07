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

    @State private var selected: Candle?
    private let haptic = UISelectionFeedbackGenerator()

    var body: some View {
        Chart {
            if let s = selected {
                RuleMark(x: .value("Date", s.parsedDate))
                    .foregroundStyle(Color.secondary.opacity(0.8))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 3]))
            }

            // Candlestick wicks (high-low)
            ForEach(candles) { c in
                RuleMark(
                    x: .value("Date", c.parsedDate),
                    yStart: .value("Low",  c.low),
                    yEnd:   .value("High", c.high)
                )
                .foregroundStyle(candleColor(c))
                .lineStyle(StrokeStyle(lineWidth: 1))
            }

            // Candlestick bodies (open-close)
            ForEach(candles) { c in
                RectangleMark(
                    x:      .value("Date",  c.parsedDate),
                    yStart: .value("Open",  min(c.open, c.close)),
                    yEnd:   .value("Close", max(c.open, c.close)),
                    width:  .fixed(bodyWidth)
                )
                .foregroundStyle(candleColor(c))
            }

            // MA5
            ForEach(Array(zip(candles, ma5)), id: \.0.id) { c, v in
                if let v {
                    LineMark(x: .value("Date", c.parsedDate), y: .value("MA5", v), series: .value("Series", "MA5"))
                        .foregroundStyle(DS.ma5)
                        .lineStyle(StrokeStyle(lineWidth: 1))
                        .interpolationMethod(.monotone)
                }
            }

            // MA10
            ForEach(Array(zip(candles, ma10)), id: \.0.id) { c, v in
                if let v {
                    LineMark(x: .value("Date", c.parsedDate), y: .value("MA10", v), series: .value("Series", "MA10"))
                        .foregroundStyle(.purple)
                        .lineStyle(StrokeStyle(lineWidth: 1))
                        .interpolationMethod(.monotone)
                }
            }

            // MA20
            ForEach(Array(zip(candles, ma20)), id: \.0.id) { c, v in
                if let v {
                    LineMark(x: .value("Date", c.parsedDate), y: .value("MA20", v), series: .value("Series", "MA20"))
                        .foregroundStyle(.orange)
                        .lineStyle(StrokeStyle(lineWidth: 1))
                        .interpolationMethod(.monotone)
                }
            }

            // Bollinger Upper Band
            ForEach(Array(zip(candles, bollUpper)), id: \.0.id) { c, v in
                if let v {
                    LineMark(x: .value("Date", c.parsedDate), y: .value("BU", v), series: .value("Series", "BU"))
                        .foregroundStyle(DS.boll.opacity(0.9))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 2]))
                        .interpolationMethod(.monotone)
                }
            }

            // Bollinger Middle Band
            ForEach(Array(zip(candles, bollMiddle)), id: \.0.id) { c, v in
                if let v {
                    LineMark(x: .value("Date", c.parsedDate), y: .value("BM", v), series: .value("Series", "BM"))
                        .foregroundStyle(DS.boll.opacity(0.55))
                        .lineStyle(StrokeStyle(lineWidth: 1))
                        .interpolationMethod(.monotone)
                }
            }

            // Bollinger Lower Band
            ForEach(Array(zip(candles, bollLower)), id: \.0.id) { c, v in
                if let v {
                    LineMark(x: .value("Date", c.parsedDate), y: .value("BL", v), series: .value("Series", "BL"))
                        .foregroundStyle(DS.boll.opacity(0.9))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 2]))
                        .interpolationMethod(.monotone)
                }
            }
        }
        .chartYScale(domain: priceRange)
        .chartXAxis {
            AxisMarks(values: .stride(by: .month)) { _ in
                AxisGridLine()
                AxisValueLabel(format: .dateTime.month(.abbreviated))
            }
        }
        .chartYAxis {
            AxisMarks(position: .trailing) { _ in
                AxisGridLine()
                AxisValueLabel()
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
                                guard let date: Date = proxy.value(atX: x) else { return }
                                let nearest = candles.min {
                                    abs($0.parsedDate.timeIntervalSince(date)) < abs($1.parsedDate.timeIntervalSince(date))
                                }
                                if nearest?.id != selected?.id { haptic.selectionChanged() }
                                selected = nearest
                            }
                            .onEnded { _ in selected = nil }
                    )
            }
        }
        .overlay(alignment: .top) {
            if let s = selected { infoBar(s) }
        }
    }

    private func changePct(of c: Candle) -> Double {
        if c.pctChange != 0 { return c.pctChange }
        guard let i = candles.firstIndex(where: { $0.id == c.id }), i > 0, candles[i - 1].close != 0 else { return 0 }
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
        Chart(candles) { c in
            BarMark(
                x:     .value("Date",   c.parsedDate),
                y:     .value("Volume", c.volume),
                width: .fixed(bodyWidth)
            )
            .foregroundStyle(Theme.changeColor(c.isUp ? 1 : -1, market: market).opacity(0.8))
        }
        .chartXAxis(.hidden)
        .chartYAxis {
            AxisMarks(position: .trailing, values: .automatic(desiredCount: 2)) { v in
                AxisGridLine()
                AxisValueLabel {
                    if let d = v.as(Double.self) {
                        Text(market == .us ? Formatters.shareVolume(d) : Formatters.volume(d)).font(.caption2)
                    }
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
            ForEach(Array(zip(candles, histogram)), id: \.0.id) { c, h in
                if let h {
                    BarMark(
                        x: .value("Date", c.parsedDate),
                        y: .value("Hist", h),
                        width: .fixed(barWidth)
                    )
                    .foregroundStyle(Theme.changeColor(h >= 0 ? 1 : -1, market: market).opacity(0.7))
                }
            }

            // MACD line (white/primary adapts to dark mode)
            ForEach(Array(zip(candles, macdLine)), id: \.0.id) { c, v in
                if let v {
                    LineMark(x: .value("Date", c.parsedDate), y: .value("MACD", v), series: .value("Series", "MACD"))
                        .foregroundStyle(Color.primary)
                        .lineStyle(StrokeStyle(lineWidth: 1))
                        .interpolationMethod(.monotone)
                }
            }

            // Signal line
            ForEach(Array(zip(candles, signalLine)), id: \.0.id) { c, v in
                if let v {
                    LineMark(x: .value("Date", c.parsedDate), y: .value("Sig", v), series: .value("Series", "Sig"))
                        .foregroundStyle(DS.ma5)
                        .lineStyle(StrokeStyle(lineWidth: 1))
                        .interpolationMethod(.monotone)
                }
            }
        }
        .chartXAxis(.hidden)
        .chartYAxis {
            AxisMarks(position: .trailing, values: .automatic(desiredCount: 3)) { _ in
                AxisGridLine()
                AxisValueLabel().font(.system(size: 9))
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

            ForEach(Array(zip(candles, values)), id: \.0.id) { c, v in
                if let v {
                    LineMark(x: .value("Date", c.parsedDate), y: .value("RSI", v), series: .value("Series", "RSI"))
                        .foregroundStyle(Color.purple)
                        .lineStyle(StrokeStyle(lineWidth: 1.5))
                        .interpolationMethod(.monotone)
                }
            }
        }
        .chartXAxis(.hidden)
        .chartYScale(domain: 0...100)
        .chartYAxis {
            AxisMarks(position: .trailing, values: [30, 50, 70]) { _ in
                AxisGridLine()
                AxisValueLabel().font(.system(size: 9))
            }
        }
    }
}
