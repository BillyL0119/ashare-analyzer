import SwiftUI

struct MarketTabView: View {
    @StateObject private var vm = MarketViewModel()
    @State private var selectedHotMarket: Market = .cn
    @AppStorage("marketTabMode") private var modeRaw = Market.us.rawValue
    @State private var searchText = ""
    @State private var showAbout = false
    @State private var selectedResult: StockSearchResult?
    #if DEBUG
    @State private var debugCalendar = false
    #endif
    @ObservedObject private var history = SearchHistoryStore.shared
    @StateObject private var lessons = HomeLessonStore()

    private var mode: Binding<Market> {
        Binding(get: { Market(rawValue: modeRaw) ?? .us }, set: { modeRaw = $0.rawValue })
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 26) {
                    QuoteOfDayCard()
                    HStack {
                        MarketSegmentControl(selection: mode, order: [.us, .cn, .hk, .jp])
                        Spacer()
                    }
                    HomeLessonCard(store: lessons, market: mode.wrappedValue)
                    if mode.wrappedValue == .hk || mode.wrappedValue == .jp {
                        IntlHotSection(store: lessons, market: mode.wrappedValue)
                        WatchlistSection()
                        GlobalMarketSection(
                            sentiment: vm.sentiment,
                            isLoading: vm.isLoadingSentiment,
                            error: vm.sentimentError,
                            onRetry: { Task { await vm.loadSentiment() } }
                        )
                    } else if mode.wrappedValue == .us {
                        USMarketSection(
                            overview: vm.usOverview,
                            earnings: vm.earnings,
                            afterOverview: AnyView(VStack(spacing: 26) { ScreenerEntryCard(); WatchlistSection(); MarketHeatmapSection(market: .us); MacroEventsSection() }),
                            isLoading: vm.isLoadingUS,
                            error: vm.usError,
                            onRetry: { Task { await vm.loadUSOverview() } }
                        )
                        GlobalMarketSection(
                            sentiment: vm.sentiment,
                            isLoading: vm.isLoadingSentiment,
                            error: vm.sentimentError,
                            onRetry: { Task { await vm.loadSentiment() } }
                        )
                    } else {
                        overviewSection
                        WatchlistSection()
                        MarketHeatmapSection(market: .cn)
                        GlobalMarketSection(
                            sentiment: vm.sentiment,
                            isLoading: vm.isLoadingSentiment,
                            error: vm.sentimentError,
                            onRetry: { Task { await vm.loadSentiment() } }
                        )
                        SectorListSection(
                            sectors: vm.sectors,
                            isLoading: vm.isLoadingSectors,
                            error: vm.sectorsError,
                            onRetry: { Task { await vm.loadSectors() } }
                        )
                        hotSection
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 6)
                .padding(.bottom, 24)
            }
            .background(DS.bg.ignoresSafeArea())
            .navigationTitle("tab.market")
            .searchable(text: $searchText, prompt: Text("search.placeholder")) {
                if searchText.isEmpty && !history.items.isEmpty {
                    Section {
                        ForEach(history.items) { item in
                            Label(item.name, systemImage: "clock.arrow.circlepath")
                                .searchCompletion(item.name)
                        }
                    } header: {
                        HStack {
                            Text("最近搜索")
                            Spacer()
                            Button("清除") { history.clear() }
                                .font(.caption)
                        }
                    }
                }
            }
            .onChange(of: searchText) { _, new in vm.search(new) }
            .overlay(searchOverlay)
            .task { await vm.loadAll() }
            .task(id: modeRaw) { await lessons.load(mode.wrappedValue) }
            .refreshable {
                await vm.loadAll()
                await lessons.load(mode.wrappedValue)
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { showAbout = true } label: {
                        Image(systemName: "info.circle")
                    }
                    .accessibilityLabel(L("关于"))
                    .tint(.secondary)
                }
            }
            .sheet(isPresented: $showAbout) { AboutSheet() }
            .navigationDestination(item: $selectedResult) { r in
                StockDetailView(code: r.code, name: r.name, market: r.resolvedMarket)
            }
            #if DEBUG
            .task {
                // Screenshot job (.github/workflows/ios.yml): `-openStock AAPL` opens that stock's page at launch,
                // `-openCalendar 1` the events calendar
                if selectedResult == nil, let code = UserDefaults.standard.string(forKey: "openStock") {
                    selectedResult = StockSearchResult(code: code, name: code, changePct: nil, market: nil)
                } else if UserDefaults.standard.bool(forKey: "openCalendar") {
                    debugCalendar = true
                }
            }
            .navigationDestination(isPresented: $debugCalendar) { EventsCalendarView() }
            #endif
            .safeAreaInset(edge: .bottom) {
                Text("disclaimer")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 4)
                    .background(.bar)
            }
        }
    }

    // MARK: Overview

    @ViewBuilder
    private var overviewSection: some View {
        if vm.isLoadingOverview && vm.overview == nil {
            VStack(alignment: .leading, spacing: 16) {
                SkeletonBar(width: 90, height: 14)
                HStack(spacing: 10) {
                    ForEach(0..<3, id: \.self) { _ in
                        SkeletonBar(height: 78, radius: DS.tileRadius)
                    }
                }
                SkeletonBar(height: 8, radius: 4)
            }
            .card()
        } else if let err = vm.overviewError, vm.overview == nil {
            ErrorRetryView(message: err) { Task { await vm.loadOverview() } }
                .card()
        } else if let ov = vm.overview {
            MarketOverviewCard(overview: ov)
        }
    }

    // MARK: Hot stocks

    private var hotStocks: [HotStock] {
        selectedHotMarket == .cn ? vm.cnHotStocks : vm.usHotStocks
    }

    private var hotSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("热门股票")) { marketSegment }
            Group {
                if vm.isLoadingHot && hotStocks.isEmpty {
                    SkeletonRows(rows: 5)
                } else if let err = vm.hotError, hotStocks.isEmpty {
                    ErrorRetryView(message: err) { Task { await vm.loadHotStocks() } }
                } else if hotStocks.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "flame")
                            .font(.title2)
                            .foregroundStyle(.tertiary)
                        Text("暂无热门股数据，稍后下拉刷新")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 28)
                } else {
                    let rows = Array(hotStocks.prefix(20).enumerated())
                    VStack(spacing: 0) {
                        ForEach(rows, id: \.element.id) { idx, stock in
                            NavigationLink(destination: StockDetailView(
                                code: stock.code, name: stock.name, market: stock.resolvedMarket
                            )) {
                                HStack(spacing: 12) {
                                    Text("\(idx + 1)")
                                        .font(.system(.footnote).weight(.semibold))
                                        .monospacedDigit()
                                        .foregroundStyle(idx < 3 ? DS.accent : Color.secondary.opacity(0.6))
                                        .frame(width: 20)
                                    StockRow(
                                        code: stock.code, name: stock.name,
                                        changePct: stock.changePct, market: stock.resolvedMarket
                                    )
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            if idx < rows.count - 1 { RowDivider() }
                        }
                    }
                }
            }
            .card(padding: 0)
        }
    }

    private var marketSegment: some View {
        MarketSegmentControl(selection: $selectedHotMarket)
    }

    // MARK: Search

    @ViewBuilder
    private var searchOverlay: some View {
        if !searchText.isEmpty {
            ScrollView {
                VStack(spacing: 0) {
                    if vm.isSearching {
                        ProgressView(String(localized: "loading"))
                            .frame(maxWidth: .infinity, minHeight: 80)
                    } else if let err = vm.searchError {
                        Text(err).foregroundStyle(.secondary).font(.subheadline).padding()
                    } else if vm.searchResults.isEmpty {
                        Text("暂无结果").foregroundStyle(.secondary).font(.subheadline)
                            .frame(maxWidth: .infinity, minHeight: 80)
                    } else {
                        let rows = Array(vm.searchResults.enumerated())
                        ForEach(rows, id: \.element.id) { idx, result in
                            Button {
                                history.record(code: result.code, name: result.name, market: result.resolvedMarket)
                                selectedResult = result
                            } label: {
                                HStack(spacing: 8) {
                                    StockRow(
                                        code: result.code, name: result.name,
                                        changePct: result.changePct, market: result.resolvedMarket
                                    )
                                    Text(result.resolvedMarket.label)
                                        .font(.caption2.weight(.medium))
                                        .padding(.horizontal, 7)
                                        .padding(.vertical, 3)
                                        .background(DS.surfaceHi, in: Capsule())
                                        .foregroundStyle(.secondary)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            if idx < rows.count - 1 { RowDivider() }
                        }
                    }
                }
                .card(padding: 0)
                .padding(16)
            }
            .background(DS.bg)
        }
    }
}

// MARK: - Quote of the day

/// The day's quote from a business leader, first thing on the market tab, as on the website.
/// English is set in New York italic; Chinese in a brush script (see `BrushFont`), upright.
/// The quote marks carry the accent; everything around the quote stays in the interface font.
struct QuoteOfDayCard: View {
    @State private var quote: DailyQuote? = APIClient.shared.cached("/quotes/today")
    @ObservedObject private var brush = BrushFont.shared

    var body: some View {
        Group {
            if let q = quote, let text = quoteText(q) {
                card(q, text: text)
            } else {
                // Keeps the tab from jumping when the quote arrives on a first launch
                VStack(alignment: .leading, spacing: 12) {
                    SkeletonBar(width: 110, height: 11)
                    SkeletonBar(height: 16)
                    SkeletonBar(width: 220, height: 16)
                }
                .card()
                .accessibilityHidden(true)
            }
        }
        .task {
            if let fresh: DailyQuote = try? await APIClient.shared.get("/quotes/today", persist: true) {
                quote = fresh
            }
        }
    }

    private var isZh: Bool { Lang.code == "zh" }

    /// Chinese readers get the Chinese text; everyone else the English one (the only two the quotes come in)
    private func quoteText(_ q: DailyQuote) -> String? {
        let t = isZh ? (q.quoteCn ?? q.quoteEn) : (q.quoteEn ?? q.quoteCn)
        guard let t, !t.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
        return t
    }

    private func card(_ q: DailyQuote, text: String) -> some View {
        let chinese = text == q.quoteCn
        let author = isZh ? (q.authorCn ?? q.author) : (q.author ?? q.authorCn)
        let role = isZh ? (q.titleCn ?? q.title) : (q.title ?? q.titleCn)
        return VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline) {
                Text(L("今日语录")).font(.footnote.weight(.medium)).foregroundStyle(DS.accent)
                Spacer()
                Text(Date.now.formatted(.dateTime.month(.wide).day().locale(Lang.locale)))
                    .font(.footnote).foregroundStyle(.secondary)
            }
            // Chinese fonts set curly quotes full-width, which leaves a gap inside the quote; the marks
            // come from the serif instead so they sit against the text, as on the website
            Text(marked(text, markFont: chinese ? .system(size: 22, weight: .regular, design: .serif) : nil))
                .font(quoteFont(chinese: chinese, long: text.count > (chinese ? 60 : 140)))
                .lineSpacing(chinese ? 6 : 3)
                .foregroundStyle(.primary)
                .fixedSize(horizontal: false, vertical: true)
                .environment(\.locale, Locale(identifier: chinese ? "zh-Hans" : "en"))
            if let author {
                HStack(spacing: 10) {
                    Text(initials(q.author ?? author))
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                        .frame(width: 32, height: 32)
                        .background(DS.surfaceHi, in: Circle())
                        .overlay(Circle().strokeBorder(DS.stroke))
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(author).font(.subheadline.weight(.medium))
                        if let role { Text(role).font(.caption).foregroundStyle(.secondary) }
                    }
                }
            }
        }
        .card(padding: 18)
        .accessibilityElement(children: .combine)
        .onAppear { if chinese { brush.request() } }
    }

    private func quoteFont(chinese: Bool, long: Bool) -> Font {
        if chinese {
            // A brush hand sits small in its em box, so it is set a step larger than the serif
            let size: CGFloat = long ? 20 : 22
            if let name = brush.name { return .custom(name, size: size, relativeTo: .title3) }
            return .system(size: size - 2, weight: .regular, design: .serif)
        }
        return .system(size: long ? 17 : 19, weight: .regular, design: .serif).italic()
    }

    /// The quote between accent-coloured curly quotes
    private func marked(_ text: String, markFont: Font?) -> AttributedString {
        var open = AttributedString("\u{201C}"); open.foregroundColor = DS.accent
        var close = AttributedString("\u{201D}"); close.foregroundColor = DS.accent
        if let markFont { open.font = markFont; close.font = markFont }
        return open + AttributedString(text) + close
    }

    private func initials(_ name: String) -> String {
        let letters = name.split(separator: " ").compactMap(\.first).prefix(2)
        return letters.isEmpty ? String(name.prefix(1)) : String(letters).uppercased()
    }
}

