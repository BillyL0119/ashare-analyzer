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

    var body: some View {
        Chart {
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
                    LineMark(x: .value("Date", c.parsedDate), y: .value("MA5", v))
                        .foregroundStyle(DS.ma5)
                        .lineStyle(StrokeStyle(lineWidth: 1))
                        .interpolationMethod(.monotone)
                }
            }

            // MA10
            ForEach(Array(zip(candles, ma10)), id: \.0.id) { c, v in
                if let v {
                    LineMark(x: .value("Date", c.parsedDate), y: .value("MA10", v))
                        .foregroundStyle(.purple)
                        .lineStyle(StrokeStyle(lineWidth: 1))
                        .interpolationMethod(.monotone)
                }
            }

            // MA20
            ForEach(Array(zip(candles, ma20)), id: \.0.id) { c, v in
                if let v {
                    LineMark(x: .value("Date", c.parsedDate), y: .value("MA20", v))
                        .foregroundStyle(.orange)
                        .lineStyle(StrokeStyle(lineWidth: 1))
                        .interpolationMethod(.monotone)
                }
            }

            // Bollinger Upper Band
            ForEach(Array(zip(candles, bollUpper)), id: \.0.id) { c, v in
                if let v {
                    LineMark(x: .value("Date", c.parsedDate), y: .value("BU", v))
                        .foregroundStyle(DS.boll.opacity(0.9))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 2]))
                        .interpolationMethod(.monotone)
                }
            }

            // Bollinger Middle Band
            ForEach(Array(zip(candles, bollMiddle)), id: \.0.id) { c, v in
                if let v {
                    LineMark(x: .value("Date", c.parsedDate), y: .value("BM", v))
                        .foregroundStyle(DS.boll.opacity(0.55))
                        .lineStyle(StrokeStyle(lineWidth: 1))
                        .interpolationMethod(.monotone)
                }
            }

            // Bollinger Lower Band
            ForEach(Array(zip(candles, bollLower)), id: \.0.id) { c, v in
                if let v {
                    LineMark(x: .value("Date", c.parsedDate), y: .value("BL", v))
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
                        Text(Formatters.volume(d)).font(.caption2)
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
                    LineMark(x: .value("Date", c.parsedDate), y: .value("MACD", v))
                        .foregroundStyle(Color.primary)
                        .lineStyle(StrokeStyle(lineWidth: 1))
                        .interpolationMethod(.monotone)
                }
            }

            // Signal line
            ForEach(Array(zip(candles, signalLine)), id: \.0.id) { c, v in
                if let v {
                    LineMark(x: .value("Date", c.parsedDate), y: .value("Sig", v))
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
                    LineMark(x: .value("Date", c.parsedDate), y: .value("RSI", v))
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
