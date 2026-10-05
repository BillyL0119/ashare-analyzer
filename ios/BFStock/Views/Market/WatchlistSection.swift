import SwiftUI

struct WatchlistSection: View {
    @ObservedObject var store = WatchlistStore.shared
    @State private var editing = false
    @State private var targeted: String?

    var body: some View {
        if store.items.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                SectionHeader("自选股")
                HStack(spacing: 14) {
                    Image(systemName: "star")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(DS.accent)
                        .frame(width: 44, height: 44)
                        .background(DS.accent.opacity(0.14), in: Circle())
                    VStack(alignment: .leading, spacing: 3) {
                        Text("还没有自选股")
                            .font(.subheadline.weight(.semibold))
                        Text("搜索股票，点详情页右上角的星标即可添加")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 0)
                }
                .card()
            }
        } else {
            VStack(alignment: .leading, spacing: 10) {
                SectionHeader("自选股") {
                    HStack(spacing: 12) {
                        Text("\(store.items.count)")
                            .font(.system(.caption, design: .rounded).weight(.semibold))
                            .foregroundStyle(.secondary)
                        Button(editing ? "完成" : "编辑") {
                            withAnimation(.snappy(duration: 0.25)) { editing.toggle() }
                        }
                        .font(.caption.weight(.semibold))
                    }
                }
                VStack(spacing: 0) {
                    ForEach(Array(store.items.enumerated()), id: \.element.id) { idx, item in
                        row(item)
                        if idx < store.items.count - 1 { RowDivider() }
                    }
                }
                .card(padding: 0)
                .onChange(of: store.items.isEmpty) { _, empty in if empty { editing = false } }
            }
        }
    }

    @ViewBuilder
    private func row(_ item: WatchlistItem) -> some View {
        if editing {
            HStack(spacing: 12) {
                Button {
                    withAnimation(.snappy) { store.remove(id: item.id) }
                } label: {
                    Image(systemName: "minus.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.red)
                }
                .buttonStyle(.plain)

                WatchlistRow(item: item, compact: true)

                Image(systemName: "line.3.horizontal")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(targeted == item.id ? DS.accent.opacity(0.12) : Color.clear)
            .contentShape(Rectangle())
            .draggable(item.id) {
                Text(item.name)
                    .font(.subheadline.weight(.semibold))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(DS.surface, in: Capsule())
            }
            .dropDestination(for: String.self) { ids, _ in
                guard let dragged = ids.first else { return false }
                withAnimation(.snappy) { store.move(id: dragged, before: item.id) }
                return true
            } isTargeted: { over in
                targeted = over ? item.id : (targeted == item.id ? nil : targeted)
            }
            .transition(.opacity)
        } else {
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
        }
    }
}

private struct WatchlistRow: View {
    let item: WatchlistItem
    var compact = false
    @StateObject private var vm: WatchlistQuoteViewModel

    init(item: WatchlistItem, compact: Bool = false) {
        self.item = item
        self.compact = compact
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
            if vm.closes.count > 1 && !compact {
                Sparkline(values: vm.closes, color: trendColor)
                    .frame(width: 64, height: 32)
                    .transition(.opacity)
            }
            if let price = vm.price {
                Text(Formatters.price(price))
                    .font(.system(.body, design: .rounded).weight(.semibold))
                    .monospacedDigit()
                    .contentTransition(.numericText(value: price))
                    .animation(.snappy(duration: 0.45), value: price)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .frame(width: compact ? nil : 78, alignment: .trailing)
            }
            PctPill(pct: vm.changePct, market: item.resolvedMarket, fixedWidth: compact ? 72 : 80)
        }
        .animation(.easeOut(duration: 0.3), value: vm.closes.count)
        .task { await vm.load() }
    }

    private var trendColor: Color {
        Theme.changeColor(vm.trendPct ?? 0, market: item.resolvedMarket)
    }
}
