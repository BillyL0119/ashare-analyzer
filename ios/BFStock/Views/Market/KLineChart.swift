import SwiftUI
import Charts

struct KLineChart: View {
    let candles: [Candle]
    let ma5:  [Double?]
    let ma10: [Double?]
    let ma20: [Double?]
    let market: Market
    let priceRange: ClosedRange<Double>

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
                        .foregroundStyle(.yellow)
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
