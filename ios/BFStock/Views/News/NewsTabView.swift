import SwiftUI

/// Daily finance headlines and Wall Street bank views (same feeds as the website).
struct NewsTabView: View {
    @StateObject private var vm = NewsFeedViewModel()
    @State private var feed: NewsFeedViewModel.Feed = .daily

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack {
                    FeedSwitcher(selection: $feed)
                    Spacer()
                }
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
                Text(L("AI 速读由 AI 根据标题和导语生成，可能有误，请以原文为准。"))
                    .font(.caption2).foregroundStyle(.tertiary).multilineTextAlignment(.center)
                    .padding(.horizontal, 24).padding(.top, 10).padding(.bottom, 24)
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

    /// Feed timestamps carry a +08:00 offset; older cached responses were naive Beijing time.
    private var date: Date? {
        if let d = ISO8601DateFormatter().date(from: item.publishedAt) { return d }
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "Asia/Shanghai")
        f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        return f.date(from: String(item.publishedAt.prefix(19)))
    }

    private var time: String {
        guard let d = date else { return item.publishedAt }
        if Date().timeIntervalSince(d) < 60 { return L("刚刚") }
        let f = RelativeDateTimeFormatter()
        f.locale = Lang.locale
        f.unitsStyle = .short
        return f.localizedString(for: d, relativeTo: Date())
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
                Text(item.title).font(.subheadline.weight(.medium)).foregroundStyle(.primary)
                    .multilineTextAlignment(.leading).lineLimit(3)
                if let ai = item.aiSummary, !ai.isEmpty {
                    (Text(L("AI 速读") + "  ").foregroundStyle(DS.accent).fontWeight(.medium) + Text(ai).foregroundStyle(.secondary))
                        .font(.caption).multilineTextAlignment(.leading).lineLimit(3)
                }
                HStack(spacing: 6) {
                    // Source and time as quiet text, not a colour-coded tag per outlet
                    Text(item.source).font(.caption2.weight(.medium)).foregroundStyle(.secondary)
                    Text(time).font(.caption2).foregroundStyle(.secondary)
                }
                .padding(.top, 2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 16).padding(.vertical, 11)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

/// Capsule switcher matching the Market tab's segment control.
private struct FeedSwitcher: View {
    @Binding var selection: NewsFeedViewModel.Feed
    @Namespace private var ns

    var body: some View {
        HStack(spacing: 0) {
            ForEach([(NewsFeedViewModel.Feed.daily, L("每日新闻")), (.banks, L("大行观点"))], id: \.0) { feed, label in
                Button {
                    withAnimation(.snappy(duration: 0.25)) { selection = feed }
                } label: {
                    Text(label)
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 14).padding(.vertical, 7)
                        .foregroundStyle(selection == feed ? Color.primary : Color.secondary)
                        .background {
                            if selection == feed {
                                Capsule().fill(DS.raised)
                                    .overlay(Capsule().strokeBorder(DS.stroke))
                                    .shadow(color: Color(light: Color.black.opacity(0.06), dark: .clear), radius: 2, y: 1)
                                    .matchedGeometryEffect(id: "feed", in: ns)
                            }
                        }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(2)
        .background(DS.surfaceHi, in: Capsule())
        .sensoryFeedback(.selection, trigger: selection)
    }
}
