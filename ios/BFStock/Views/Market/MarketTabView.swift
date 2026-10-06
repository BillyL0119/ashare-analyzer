import SwiftUI

struct MarketTabView: View {
    @StateObject private var vm = MarketViewModel()
    @State private var selectedHotMarket: Market = .cn
    @State private var searchText = ""
    @State private var showAbout = false
    @State private var selectedResult: StockSearchResult?
    @ObservedObject private var history = SearchHistoryStore.shared

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 26) {
                    overviewSection
                    WatchlistSection()
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
            .refreshable { await vm.loadAll() }
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
                                        .font(.system(.footnote, design: .rounded).weight(.bold))
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
                                    Text(result.resolvedMarket == .us ? L("美股") : L("A股"))
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
