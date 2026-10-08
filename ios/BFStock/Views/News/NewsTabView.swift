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

    /// Feed timestamps are naive Beijing time ("2026-10-09T05:36:50").
    private var date: Date? {
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

    private var summary: String? {
        let t = (item.summary ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty, t != item.title, !t.hasPrefix(item.title) else { return nil }
        return t
    }

    private static let palette: [Color] = [
        Color(r: 0x3B, g: 0x82, b: 0xF6), Color(r: 0xF5, g: 0x9E, b: 0x0B), Color(r: 0x10, g: 0xB9, b: 0x81),
        Color(r: 0xEC, g: 0x48, b: 0x99), Color(r: 0x8B, g: 0x5C, b: 0xF6), Color(r: 0xEF, g: 0x44, b: 0x44),
    ]

    private var sourceTint: Color {
        let h = item.source.unicodeScalars.reduce(0) { ($0 &* 31 &+ Int($1.value)) & 0xFFFF }
        return Self.palette[h % Self.palette.count]
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
                } else if !isBank, let sum = summary {
                    Text(sum).font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.leading).lineLimit(2)
                }
                HStack(spacing: 6) {
                    Text(item.source).font(.caption2.weight(.semibold))
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(sourceTint.opacity(0.14), in: Capsule())
                        .foregroundStyle(sourceTint)
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
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 14).padding(.vertical, 7)
                        .foregroundStyle(selection == feed ? Color.white : Color.secondary)
                        .background {
                            if selection == feed { Capsule().fill(DS.accent).matchedGeometryEffect(id: "feed", in: ns) }
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
