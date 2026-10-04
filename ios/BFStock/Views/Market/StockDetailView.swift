import SwiftUI
import Charts

struct StockDetailView: View {
    let code: String
    let name: String
    let market: Market

    @StateObject private var vm: StockDetailViewModel
    @ObservedObject private var watchlist = WatchlistStore.shared

    init(code: String, name: String, market: Market) {
        self.code = code
        self.name = name
        self.market = market
        _vm = StateObject(wrappedValue: StockDetailViewModel(code: code, market: market))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Quote header
                quoteHeader
                    .padding(.horizontal)
                    .padding(.top, 8)

                Divider().padding(.vertical, 8)

                // Period picker
                periodPicker
                    .padding(.horizontal)

                // Indicator picker
                indicatorPicker
                    .padding(.horizontal)
                    .padding(.top, 6)

                // K-line chart
                chartSection
                    .padding(.top, 8)

                // Volume chart
                volumeSection

                // Sub-indicator chart (MACD or RSI)
                subIndicatorSection

                Divider().padding(.top, 8)

                // Legend (MA or indicator)
                indicatorLegend
                    .padding(.horizontal)
                    .padding(.vertical, 8)

                // Quote details grid
                if let q = vm.quote {
                    quoteGrid(q)
                        .padding(.horizontal)
                        .padding(.bottom, 16)
                }
            }
        }
        .navigationTitle(name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                let watched = watchlist.isWatched(code: code, market: market)
                Button {
                    let impact = UIImpactFeedbackGenerator(style: .light)
                    impact.impactOccurred()
                    watchlist.toggle(code: code, name: name, market: market)
                } label: {
                    Image(systemName: watched ? "star.fill" : "star")
                        .foregroundStyle(watched ? .yellow : .secondary)
                }
            }
        }
        .task { await vm.loadAll() }
        .refreshable { await vm.loadAll() }
        .safeAreaInset(edge: .bottom) {
            Text("disclaimer")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 4)
                .background(.bar)
        }
    }

    // MARK: - Quote Header

    private var quoteHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
            if vm.isLoadingQuote && vm.quote == nil {
                ProgressView().padding(.vertical, 8)
            } else if let err = vm.quoteError, vm.quote == nil {
                ErrorRetryView(message: err) { Task { await vm.loadQuote() } }
            } else if let q = vm.quote {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(Formatters.price(q.price))
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)
                        .foregroundStyle(Theme.changeColor(q.pctChange, market: market))

                    VStack(alignment: .leading, spacing: 2) {
                        Text(Formatters.changePct(q.pctChange))
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Theme.changeColor(q.pctChange, market: market))
                        Text(Formatters.changeAbs(q.change))
                            .font(.caption)
                            .foregroundStyle(Theme.changeColor(q.pctChange, market: market))
                    }
                }
                Text("\(q.name)  \(q.code)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Period Picker

    private var periodPicker: some View {
        Picker("", selection: Binding(
            get: { vm.period },
            set: { vm.changePeriod($0) }
        )) {
            ForEach(ChartPeriod.allCases) { p in
                Text(p.rawValue).tag(p)
            }
        }
        .pickerStyle(.segmented)
    }

    // MARK: - Indicator Picker

    private var indicatorPicker: some View {
        Picker("", selection: $vm.indicator) {
            ForEach(Indicator.allCases) { ind in
                Text(ind.label).tag(ind)
            }
        }
        .pickerStyle(.segmented)
    }

    // MARK: - Chart

    private var chartSection: some View {
        Group {
            if vm.isLoadingChart && vm.candles.isEmpty {
                ProgressView(String(localized: "loading"))
                    .frame(maxWidth: .infinity, minHeight: 220)
            } else if let err = vm.chartError, vm.candles.isEmpty {
                ErrorRetryView(message: err) { Task { await vm.loadCandles() } }
                    .frame(minHeight: 220)
            } else if !vm.candles.isEmpty {
                let boll = vm.indicator == .boll ? vm.bollTuple : (upper: [Double?](), middle: [Double?](), lower: [Double?]())
                KLineChart(
                    candles:    vm.candles,
                    ma5:        vm.indicator == .boll ? [] : vm.ma5,
                    ma10:       vm.indicator == .boll ? [] : vm.ma10,
                    ma20:       vm.indicator == .boll ? [] : vm.ma20,
                    market:     market,
                    priceRange: vm.chartPriceRange,
                    bollUpper:  boll.upper,
                    bollMiddle: boll.middle,
                    bollLower:  boll.lower
                )
                .frame(height: 240)
                .padding(.horizontal, 4)
            }
        }
    }

    private var volumeSection: some View {
        Group {
            if !vm.candles.isEmpty {
                VolumeChart(candles: vm.candles, market: market)
                    .frame(height: 70)
                    .padding(.horizontal, 4)
                    .padding(.top, 4)
            }
        }
    }

    // MARK: - Sub-indicator (MACD / RSI)

    @ViewBuilder
    private var subIndicatorSection: some View {
        if !vm.candles.isEmpty {
            switch vm.indicator {
            case .macd:
                let m = vm.macdTuple
                VStack(alignment: .leading, spacing: 2) {
                    macdLegendRow(m)
                        .padding(.horizontal, 8)
                        .padding(.top, 4)
                    MACDChart(
                        candles:    vm.candles,
                        macdLine:   m.macdLine,
                        signalLine: m.signalLine,
                        histogram:  m.histogram,
                        market:     market
                    )
                    .frame(height: 90)
                    .padding(.horizontal, 4)
                }
            case .rsi:
                VStack(alignment: .leading, spacing: 2) {
                    rsiLegendRow
                        .padding(.horizontal, 8)
                        .padding(.top, 4)
                    RSIChart(candles: vm.candles, values: vm.rsi14)
                        .frame(height: 90)
                        .padding(.horizontal, 4)
                }
            default:
                EmptyView()
            }
        }
    }

    // MARK: - Legends

    @ViewBuilder
    private var indicatorLegend: some View {
        switch vm.indicator {
        case .none, .macd, .rsi:
            maLegend
        case .boll:
            bollLegend
        }
    }

    private var maLegend: some View {
        HStack(spacing: 16) {
            maItem("MA5",  color: .yellow, values: vm.ma5)
            maItem("MA10", color: .purple, values: vm.ma10)
            maItem("MA20", color: .orange, values: vm.ma20)
        }
        .font(.caption)
    }

    private var bollLegend: some View {
        let b = vm.bollTuple
        return HStack(spacing: 16) {
            bollItem("UP",  color: Color.cyan.opacity(0.8), values: b.upper)
            bollItem("MID", color: Color.cyan.opacity(0.4), values: b.middle)
            bollItem("DN",  color: Color.cyan.opacity(0.8), values: b.lower)
        }
        .font(.caption)
    }

    private func maItem(_ label: String, color: Color, values: [Double?]) -> some View {
        HStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 1)
                .fill(color)
                .frame(width: 16, height: 2)
            Text(label)
                .foregroundStyle(.secondary)
            if let v = values.last(where: { $0 != nil }), let val = v {
                Text(Formatters.price(val))
                    .foregroundStyle(color)
                    .monospacedDigit()
            }
        }
    }

    private func bollItem(_ label: String, color: Color, values: [Double?]) -> some View {
        HStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 1)
                .fill(color)
                .frame(width: 16, height: 2)
            Text(label)
                .foregroundStyle(.secondary)
            if let v = values.last(where: { $0 != nil }), let val = v {
                Text(Formatters.price(val))
                    .foregroundStyle(color)
                    .monospacedDigit()
            }
        }
    }

    private func macdLegendRow(_ m: (macdLine: [Double?], signalLine: [Double?], histogram: [Double?])) -> some View {
        HStack(spacing: 12) {
            legendLabel("MACD", color: .primary, values: m.macdLine)
            legendLabel("DEA",  color: .yellow,  values: m.signalLine)
            legendLabel("DIFF", color: .secondary, values: m.histogram)
        }
        .font(.caption)
    }

    private var rsiLegendRow: some View {
        HStack(spacing: 12) {
            legendLabel("RSI(14)", color: .purple, values: vm.rsi14)
            Text("超买:70").font(.caption).foregroundStyle(.secondary)
            Text("超卖:30").font(.caption).foregroundStyle(.secondary)
        }
    }

    private func legendLabel(_ label: String, color: Color, values: [Double?]) -> some View {
        HStack(spacing: 4) {
            Text(label).foregroundStyle(.secondary)
            if let v = values.last(where: { $0 != nil }), let val = v {
                Text(String(format: "%.4f", val))
                    .foregroundStyle(color)
                    .monospacedDigit()
            }
        }
    }

    // MARK: - Quote Grid

    private func quoteGrid(_ q: RealtimeQuote) -> some View {
        let items: [(String, String)] = [
            ("今开", Formatters.price(q.open)),
            ("昨收", Formatters.price(q.prevClose)),
            ("最高", Formatters.price(q.high)),
            ("最低", Formatters.price(q.low)),
            ("成交量", Formatters.volume(q.volume)),
            ("成交额", Formatters.cnyAmount(q.amount)),
        ]
        return LazyVGrid(columns: Array(repeating: .init(.flexible()), count: 3), spacing: 12) {
            ForEach(items, id: \.0) { label, value in
                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text(value)
                        .font(.subheadline.weight(.medium))
                        .monospacedDigit()
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding()
        .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 12))
    }
}
