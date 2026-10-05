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
            VStack(alignment: .leading, spacing: 16) {
                quoteHeader
                    .padding(.horizontal, 4)

                VStack(alignment: .leading, spacing: 0) {
                    periodPicker
                    indicatorPicker
                        .padding(.top, 8)

                    chartSection
                        .padding(.top, 12)
                    volumeSection
                    subIndicatorSection

                    indicatorLegend
                        .padding(.top, 10)
                }
                .card(padding: 12)

                if let q = vm.quote {
                    quoteGrid(q)
                }

                StockNewsSection(
                    items: vm.newsItems,
                    overall: vm.newsOverall,
                    isLoading: vm.isLoadingNews,
                    error: vm.newsError,
                    onRetry: { Task { await vm.loadNews() } }
                )
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 24)
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle(name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 1) {
                    Text(name)
                        .font(.subheadline.weight(.semibold))
                        .lineLimit(1)
                    if let q = vm.quote {
                        HStack(spacing: 5) {
                            Text(Formatters.price(q.price))
                            Text(Formatters.changePct(q.pctChange))
                        }
                        .font(.system(.caption2, design: .rounded).weight(.semibold))
                        .monospacedDigit()
                        .foregroundStyle(Theme.changeColor(q.pctChange, market: market))
                    }
                }
            }
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
                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    Text(Formatters.price(q.price))
                        .font(.system(size: 42, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .contentTransition(.numericText(value: q.price))
                        .animation(.snappy(duration: 0.5), value: q.price)
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)
                        .foregroundStyle(Theme.changeColor(q.pctChange, market: market))

                    VStack(alignment: .leading, spacing: 4) {
                        PctPill(pct: q.pctChange, market: market, minWidth: 0)
                            .fixedSize()
                        Text(Formatters.changeAbs(q.change))
                            .font(.system(.caption, design: .rounded).weight(.medium))
                            .monospacedDigit()
                            .foregroundStyle(Theme.changeColor(q.pctChange, market: market))
                            .padding(.leading, 4)
                    }
                }
                HStack(spacing: 8) {
                    Text(q.name)
                        .font(.subheadline.weight(.medium))
                    Text(q.code)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundStyle(.secondary)
                    Text(market == .us ? "美股" : "A股")
                        .font(.caption2.weight(.medium))
                        .padding(.horizontal, 7)
                        .padding(.vertical, 2)
                        .background(DS.surfaceHi, in: Capsule())
                        .foregroundStyle(.secondary)
                }
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
        .sensoryFeedback(.selection, trigger: vm.period)
    }

    // MARK: - Indicator Picker

    private var indicatorPicker: some View {
        Picker("", selection: $vm.indicator) {
            ForEach(Indicator.allCases) { ind in
                Text(ind.label).tag(ind)
            }
        }
        .pickerStyle(.segmented)
        .sensoryFeedback(.selection, trigger: vm.indicator)
    }

    // MARK: - Chart

    private var chartSection: some View {
        Group {
            if vm.isLoadingChart && vm.candles.isEmpty {
                SkeletonBar(height: 240, radius: DS.tileRadius)
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
            maItem("MA5",  color: DS.ma5, values: vm.ma5)
            maItem("MA10", color: .purple, values: vm.ma10)
            maItem("MA20", color: .orange, values: vm.ma20)
        }
        .font(.caption)
    }

    private var bollLegend: some View {
        let b = vm.bollTuple
        return HStack(spacing: 16) {
            bollItem("UP",  color: DS.boll.opacity(0.9), values: b.upper)
            bollItem("MID", color: DS.boll.opacity(0.55), values: b.middle)
            bollItem("DN",  color: DS.boll.opacity(0.9), values: b.lower)
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
            legendLabel("DEA",  color: DS.ma5,  values: m.signalLine)
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
        let last = vm.candles.last
        // The US realtime feed has no open/high/low/turnover: fall back to the latest candle.
        let open   = q.open  > 0 ? q.open  : (last?.open  ?? 0)
        let high   = q.high  > 0 ? q.high  : (last?.high  ?? 0)
        let low    = q.low   > 0 ? q.low   : (last?.low   ?? 0)
        let volume = q.volume > 0 ? q.volume : (last?.volume ?? 0)
        func px(_ v: Double) -> String { v > 0 ? Formatters.price(v) : "--" }
        let items: [(String, String)] = [
            ("今开", px(open)),
            ("昨收", px(q.prevClose)),
            ("最高", px(high)),
            ("最低", px(low)),
            ("成交量", volume > 0 ? (market == .us ? Formatters.shareVolume(volume) : Formatters.volume(volume)) : "--"),
            ("成交额", q.amount > 0 ? Formatters.cnyAmount(q.amount) : "--"),
        ]
        return VStack(alignment: .leading, spacing: 16) {
            LazyVGrid(columns: Array(repeating: .init(.flexible()), count: 3), spacing: 14) {
                ForEach(items, id: \.0) { label, value in
                    VStack(alignment: .leading, spacing: 3) {
                        Text(label)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Text(value)
                            .font(.system(.subheadline, design: .rounded).weight(.semibold))
                            .monospacedDigit()
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            rangeBar(price: q.price)
        }
        .card()
    }

    @ViewBuilder
    private func rangeBar(price: Double) -> some View {
        if let lo = vm.candles.map(\.low).min(), let hi = vm.candles.map(\.high).max(), hi > lo {
            let pos = min(max((price - lo) / (hi - lo), 0), 1)
            VStack(spacing: 8) {
                HStack {
                    Text("区间最低").foregroundStyle(.secondary)
                    Spacer()
                    Text("区间最高").foregroundStyle(.secondary)
                }
                .font(.caption2)
                GeometryReader { geo in
                    let w = geo.size.width
                    ZStack(alignment: .leading) {
                        Capsule().fill(DS.surfaceHi)
                        Capsule()
                            .fill(LinearGradient(colors: [Theme.downColor(market: market).opacity(0.7),
                                                          Theme.upColor(market: market).opacity(0.7)],
                                                 startPoint: .leading, endPoint: .trailing))
                            .frame(height: 6)
                        Circle()
                            .fill(.white)
                            .frame(width: 14, height: 14)
                            .overlay(Circle().strokeBorder(DS.stroke, lineWidth: 1))
                            .shadow(color: .black.opacity(0.25), radius: 2, y: 1)
                            .offset(x: (w - 14) * pos)
                    }
                    .frame(height: 14)
                }
                .frame(height: 14)
                HStack {
                    Text(Formatters.price(lo))
                    Spacer()
                    Text(Formatters.price(hi))
                }
                .font(.system(.caption, design: .rounded).weight(.semibold))
                .monospacedDigit()
            }
        }
    }
}
