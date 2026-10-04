import SwiftUI

struct MarketTabView: View {
    @StateObject private var vm = MarketViewModel()
    @State private var selectedHotMarket: Market = .cn
    @State private var searchText = ""
    @State private var showAbout = false

    var body: some View {
        NavigationStack {
            List {
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

                // Hot Stocks
                Section {
                    Picker("", selection: $selectedHotMarket) {
                        Text("market.cn").tag(Market.cn)
                        Text("market.us").tag(Market.us)
                    }
                    .pickerStyle(.segmented)
                    .listRowBackground(Color.clear)
                    .listRowInsets(.init())
                    .padding(.vertical, 4)

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
            .searchable(text: $searchText, prompt: Text("search.placeholder"))
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
                        NavigationLink(destination: StockDetailView(code: result.code, name: result.name, market: result.resolvedMarket)) {
                            StockRow(
                                code: result.code,
                                name: result.name,
                                changePct: result.changePct,
                                market: result.resolvedMarket
                            )
                        }
                    }
                }
            }
            .background(.background)
        }
    }
}
