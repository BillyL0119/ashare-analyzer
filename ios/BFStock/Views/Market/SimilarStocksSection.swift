import SwiftUI

/// Peers whose price moves most like this stock (same-industry Pearson correlation of daily returns).
struct SimilarStocksSection: View {
    let market: Market
    @StateObject private var vm: SimilarViewModel

    init(code: String, market: Market) {
        self.market = market
        _vm = StateObject(wrappedValue: SimilarViewModel(code: code, market: market))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("相似走势")) {
                if vm.isLoading { ProgressView().scaleEffect(0.7) }
                else if let ind = vm.industry, !ind.isEmpty { Text(ind).font(.caption).foregroundStyle(.secondary) }
            }
            Group {
                if !vm.peers.isEmpty {
                    VStack(spacing: 0) {
                        ForEach(Array(vm.peers.enumerated()), id: \.element.id) { idx, p in
                            NavigationLink(destination: StockDetailView(code: p.code, name: p.name, market: market)) { row(p) }
                                .buttonStyle(.plain)
                            if idx < vm.peers.count - 1 { RowDivider() }
                        }
                    }
                } else if vm.failed {
                    ErrorRetryView(message: L("暂无相似股票")) { Task { await vm.load() } }
                } else if vm.isLoading {
                    SkeletonRows(rows: 3)
                } else {
                    Text("暂无相似股票").font(.footnote).foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity).padding(.vertical, 20)
                }
            }
            .card(padding: 0)
        }
        .task { await vm.load() }
    }

    private func row(_ p: SimilarPeer) -> some View {
        let up = (p.sparkline.last ?? 0) >= (p.sparkline.first ?? 0)
        let color = Theme.changeColor(up ? 1 : -1, market: market)
        return HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(p.name).font(.subheadline.weight(.semibold)).lineLimit(1)
                Text(p.code).font(.system(.caption, design: .monospaced)).foregroundStyle(.secondary)
            }
            Spacer(minLength: 6)
            Sparkline(values: p.sparkline, color: color)
                .frame(width: 70, height: 28)
            VStack(alignment: .trailing, spacing: 1) {
                Text(String(format: "%.0f%%", p.correlation * 100))
                    .font(.system(.subheadline, design: .rounded).weight(.bold)).monospacedDigit()
                Text(L("相关度")).font(.caption2).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.7)
            }
            .frame(width: 66, alignment: .trailing)
        }
        .padding(.horizontal, 16).padding(.vertical, 10)
        .contentShape(Rectangle())
    }
}
