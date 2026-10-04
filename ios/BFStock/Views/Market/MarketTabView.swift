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
            List {
                // Watchlist
                WatchlistSection()

                // Market Overview
                Section {
                    if vm.isLoadingOverview && vm.overview == nil {
                        ProgressView(String(localized: "loading"))
                            .frame(maxWidth: .infinity)
                    } else if let err = vm.overviewError, vm.overview == nil {
                        ErrorRetryView(message: err) { Task { await vm.loadOverview() } }
                    } else if let ov = vm.overview {
                        MarketOverviewCard(overview: ov)
                    }
                }

                // Sector Performance
                SectorListSection(
                    sectors: vm.sectors,
                    isLoading: vm.isLoadingSectors,
                    error: vm.sectorsError,
                    onRetry: { Task { await vm.loadSectors() } }
                )

                // Hot Stocks
                Section {
                    Picker("", selection: $selectedHotMarket) {
                        Text("market.cn").tag(Market.cn)
                        Text("market.us").tag(Market.us)
                    }
                    .pickerStyle(.segmented)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))

                    if vm.isLoadingHot && hotStocks.isEmpty {
                        ProgressView(String(localized: "loading"))
                            .frame(maxWidth: .infinity)
                    } else if let err = vm.hotError, hotStocks.isEmpty {
                        ErrorRetryView(message: err) { Task { await vm.loadHotStocks() } }
                    } else {
                        ForEach(hotStocks.prefix(20)) { stock in
                            NavigationLink(destination: StockDetailView(code: stock.code, name: stock.name, market: stock.resolvedMarket)) {
                                StockRow(
                                    code: stock.code,
                                    name: stock.name,
                                    changePct: stock.changePct,
                                    market: stock.resolvedMarket
                                )
                            }
                        }
                    }
                } header: {
                    Text(selectedHotMarket == .cn ? "market.cn" : "market.us")
                }
            }
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

    private var hotStocks: [HotStock] {
        selectedHotMarket == .cn ? vm.cnHotStocks : vm.usHotStocks
    }

    @ViewBuilder
    private var searchOverlay: some View {
        if !searchText.isEmpty {
            List {
                if vm.isSearching {
                    ProgressView(String(localized: "loading"))
                        .frame(maxWidth: .infinity)
                } else if let err = vm.searchError {
                    Text(err).foregroundStyle(.secondary).font(.subheadline)
                } else if vm.searchResults.isEmpty {
                    Text("暂无结果").foregroundStyle(.secondary).font(.subheadline)
                        .frame(maxWidth: .infinity)
                } else {
                    ForEach(vm.searchResults) { result in
                        Button {
                            history.record(code: result.code, name: result.name, market: result.resolvedMarket)
                            selectedResult = result
                        } label: {
                            HStack(spacing: 8) {
                                StockRow(
                                    code: result.code,
                                    name: result.name,
                                    changePct: result.changePct,
                                    market: result.resolvedMarket
                                )
                                Text(result.resolvedMarket == .us ? "美股" : "A股")
                                    .font(.caption2)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(.quaternary, in: Capsule())
                                    .foregroundStyle(.secondary)
                                Image(systemName: "chevron.right")
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(.tertiary)
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .background(.background)
        }
    }
}
