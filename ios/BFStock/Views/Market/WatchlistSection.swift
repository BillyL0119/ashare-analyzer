import SwiftUI

struct WatchlistSection: View {
    @ObservedObject var store = WatchlistStore.shared

    var body: some View {
        if !store.items.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                SectionHeader("自选股") {
                    Text("\(store.items.count)")
                        .font(.system(.caption, design: .rounded).weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                VStack(spacing: 0) {
                    ForEach(Array(store.items.enumerated()), id: \.element.id) { idx, item in
                        NavigationLink(destination: StockDetailView(
                            code: item.code, name: item.name, market: item.resolvedMarket
                        )) {
                            WatchlistRow(item: item)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .contextMenu {
                            Button(role: .destructive) {
                                store.toggle(code: item.code, name: item.name, market: item.resolvedMarket)
                            } label: { Label("移出自选", systemImage: "star.slash") }
                        }
                        if idx < store.items.count - 1 { RowDivider() }
                    }
                }
                .card(padding: 0)
            }
        }
    }
}

private struct WatchlistRow: View {
    let item: WatchlistItem
    @StateObject private var vm: WatchlistQuoteViewModel

    init(item: WatchlistItem) {
        self.item = item
        _vm = StateObject(wrappedValue: WatchlistQuoteViewModel(
            code: item.code, market: item.resolvedMarket
        ))
    }

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(item.name)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                Text(item.code)
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 4)
            if vm.closes.count > 1 {
                Sparkline(values: vm.closes, color: trendColor)
                    .frame(width: 64, height: 32)
                    .transition(.opacity)
            }
            if let price = vm.price {
                Text(Formatters.price(price))
                    .font(.system(.body, design: .rounded).weight(.semibold))
                    .monospacedDigit()
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .frame(width: 78, alignment: .trailing)
            }
            PctPill(pct: vm.changePct, market: item.resolvedMarket, fixedWidth: 80)
        }
        .animation(.easeOut(duration: 0.3), value: vm.closes.count)
        .task { await vm.load() }
    }

    private var trendColor: Color {
        Theme.changeColor(vm.trendPct ?? 0, market: item.resolvedMarket)
    }
}
