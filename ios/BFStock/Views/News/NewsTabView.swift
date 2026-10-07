import SwiftUI

/// Daily finance headlines and Wall Street bank views (same feeds as the website).
struct NewsTabView: View {
    @StateObject private var vm = NewsFeedViewModel()
    @State private var feed: NewsFeedViewModel.Feed = .daily

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("", selection: $feed) {
                    Text("每日新闻").tag(NewsFeedViewModel.Feed.daily)
                    Text("大行观点").tag(NewsFeedViewModel.Feed.banks)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)

                content
            }
            .background(DS.bg.ignoresSafeArea())
            .navigationTitle(L("资讯"))
            .task(id: feed) { await vm.load(feed) }
            .refreshable { await vm.load(feed, force: true) }
        }
    }

    /// Chinese UI shows everything; other languages prefer English-language items.
    private var rows: [NewsFeedItem] {
        let all = vm.items[feed] ?? []
        guard Lang.code != "zh" else { return Array(all.prefix(80)) }
        let en = all.filter { $0.lang == "en" }
        return Array((en.isEmpty ? all : en).prefix(80))
    }

    @ViewBuilder private var content: some View {
        if vm.items[feed] == nil {
            if let err = vm.error {
                ErrorRetryView(message: err) { Task { await vm.load(feed, force: true) } }.padding()
                Spacer()
            } else {
                ScrollView { SkeletonRows(rows: 6, trailingPill: false).card(padding: 0).padding(.horizontal, 16) }
            }
        } else if rows.isEmpty {
            Text("暂无资讯").foregroundStyle(.secondary).frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(Array(rows.enumerated()), id: \.element.id) { idx, item in
                        NewsFeedRow(item: item, isBank: feed == .banks)
                        if idx < rows.count - 1 { RowDivider() }
                    }
                }
                .card(padding: 0)
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
        }
    }
}

private struct NewsFeedRow: View {
    let item: NewsFeedItem
    let isBank: Bool

    private var actionLabel: String? {
        switch item.actionType {
        case "rating": return L("评级")
        case "target": return L("目标价")
        case "outlook": return L("展望")
        case "macro": return L("宏观")
        case "strategy": return L("策略")
        default: return nil
        }
    }

    private var bankNames: String? {
        let names = (Lang.code == "zh" ? item.banksZh : item.banks) ?? item.banks
        guard let names, !names.isEmpty else { return nil }
        return names.prefix(2).joined(separator: " · ")
    }

    private var time: String {
        let t = item.publishedAt
        guard t.count >= 16 else { return t }
        let s = t.index(t.startIndex, offsetBy: 5), e = t.index(t.startIndex, offsetBy: 16)
        return String(t[s..<e]).replacingOccurrences(of: "T", with: " ")
    }

    var body: some View {
        Button { SafeURL.open(item.url) } label: {
            VStack(alignment: .leading, spacing: 6) {
                if isBank, bankNames != nil || actionLabel != nil {
                    HStack(spacing: 6) {
                        if let b = bankNames { Text(b).font(.caption.weight(.semibold)).foregroundStyle(DS.accent) }
                        if let a = actionLabel {
                            Text(a).font(.caption2.weight(.medium))
                                .padding(.horizontal, 7).padding(.vertical, 2)
                                .background(DS.surfaceHi, in: Capsule()).foregroundStyle(.secondary)
                        }
                    }
                }
                Text(item.title).font(.subheadline.weight(.semibold)).foregroundStyle(.primary)
                    .multilineTextAlignment(.leading).lineLimit(3)
                if isBank, Lang.code == "zh", let ai = item.aiSummary, !ai.isEmpty {
                    Text(ai).font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.leading).lineLimit(2)
                }
                HStack(spacing: 6) {
                    Text(item.source).font(.caption2).foregroundStyle(.secondary)
                    Text(time).font(.caption2).foregroundStyle(.tertiary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 16).padding(.vertical, 11)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
