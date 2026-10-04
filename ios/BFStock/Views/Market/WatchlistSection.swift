import SwiftUI

struct WatchlistSection: View {
    @ObservedObject var store = WatchlistStore.shared

    var body: some View {
        if !store.items.isEmpty {
            Section {
                ForEach(store.items) { item in
                    NavigationLink(destination: StockDetailView(
                        code: item.code,
                        name: item.name,
                        market: item.resolvedMarket
                    )) {
                        WatchlistRow(item: item)
                    }
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            store.toggle(code: item.code, name: item.name, market: item.resolvedMarket)
                        } label: {
                            Label("删除", systemImage: "trash")
                        }
                    }
                }
            } header: {
                Text("自选股")
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
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                Text(item.code)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                if let price = vm.price {
                    Text(Formatters.price(price))
                        .font(.subheadline.weight(.semibold))
                        .monospacedDigit()
                }
                if let pct = vm.changePct {
                    Text(Formatters.changePct(pct))
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Theme.changeColor(pct, market: item.resolvedMarket))
                        .monospacedDigit()
                } else {
                    Text("--")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .padding(.vertical, 2)
        .task { await vm.load() }
    }
}
