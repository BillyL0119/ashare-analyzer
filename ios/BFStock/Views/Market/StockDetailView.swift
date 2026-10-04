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

                // K-line chart
                chartSection
                    .padding(.top, 8)

                // Volume chart
                volumeSection

                Divider().padding(.top, 8)

                // MA legend
                maLegend
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
                KLineChart(
                    candles:    vm.candles,
                    ma5:        vm.ma5,
                    ma10:       vm.ma10,
                    ma20:       vm.ma20,
                    market:     market,
                    priceRange: vm.priceRange
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

    // MARK: - MA Legend

    private var maLegend: some View {
        HStack(spacing: 16) {
            maItem("MA5", color: .yellow, values: vm.ma5)
            maItem("MA10", color: .purple, values: vm.ma10)
            maItem("MA20", color: .orange, values: vm.ma20)
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
