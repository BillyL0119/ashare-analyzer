import SwiftUI

/// Finance career center, same structure as the web Career Guide: a comparison of eight career tracks
/// (pay, hours, recruiting start) leading to full track profiles, and a directory of firms by tier.
struct CareerGuideView: View {
    @StateObject private var vm = CareerViewModel()
    @State private var section = 0

    var body: some View {
        Group {
            if vm.roles.isEmpty {
                if let err = vm.error {
                    VStack { ErrorRetryView(message: err) { Task { await vm.load() } }.padding(); Spacer() }
                } else {
                    ScrollView { SkeletonRows(rows: 5, trailingPill: false).card(padding: 0).padding(.horizontal, 16) }
                }
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        header
                        Picker("", selection: $section) {
                            Text(L("职业路径")).tag(0)
                            Text(L("机构库")).tag(1)
                        }
                        .pickerStyle(.segmented)

                        if section == 0 {
                            comparison
                        } else if let g = vm.guide {
                            FirmDirectory(guide: g, initialCategory: nil)
                        } else {
                            SkeletonRows(rows: 6, trailingPill: true).card(padding: 0)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 28)
                }
            }
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle(L("求职指南"))
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.load() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text(L("金融行业职业中心")).font(.system(.title2, design: .serif).weight(.semibold))
                Text(L("对比各条职业路径的薪酬、工时和招聘时间线，了解主要机构，练习面试。"))
                    .font(.subheadline).foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            HStack(spacing: 24) {
                stat("\(vm.roles.count)", L("职业路径"))
                if let g = vm.guide { stat("\(g.firms.count)", L("机构")) }
            }
        }
        .padding(.top, 8)
    }

    private func stat(_ n: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(n).font(.title3.weight(.bold)).monospacedDigit()
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
    }

    // Comparison: one row per track with entry-level pay and hours
    private var comparison: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("职业路径对比")) {
                Text(L("美国市场 · 薪资为估算区间")).font(.caption2).foregroundStyle(.secondary)
            }
            VStack(spacing: 0) {
                HStack {
                    Text(L("方向")).frame(maxWidth: .infinity, alignment: .leading)
                    Text(L("入门总薪酬")).frame(width: 104, alignment: .trailing)
                    Text(L("每周工时")).frame(width: 64, alignment: .trailing)
                }
                .font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
                .padding(.horizontal, 14).padding(.vertical, 10)
                RowDivider()
                ForEach(Array(vm.roles.enumerated()), id: \.element.id) { idx, role in
                    let meta = vm.guide?.meta[role.id]
                    NavigationLink(destination: CareerRoleDetailView(role: role, meta: meta, guide: vm.guide)) {
                        HStack(spacing: 10) {
                            RoundedRectangle(cornerRadius: 2).fill(role.tint).frame(width: 8, height: 8)
                            Text(role.displayTitle).font(.subheadline.weight(.semibold))
                                .multilineTextAlignment(.leading)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            Text(meta?.entryAllIn ?? "—").font(.subheadline.weight(.semibold)).monospacedDigit()
                                .lineLimit(1).minimumScaleFactor(0.8)
                                .frame(width: 104, alignment: .trailing)
                            Text(meta.map { "\($0.hours)h" } ?? "—").font(.footnote).monospacedDigit()
                                .foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.8)
                                .frame(width: 64, alignment: .trailing)
                        }
                        .padding(.horizontal, 14).padding(.vertical, 13)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    if idx < vm.roles.count - 1 { RowDivider() }
                }
            }
            .card(padding: 0)
        }
    }
}

// MARK: - Track profile

struct CareerRoleDetailView: View {
    let role: CareerRole
    let meta: TrackMeta?
    let guide: CareerGuideData?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 6) {
                    if let m = meta {
                        Text(L("职业方向") + " · " + m.short.text)
                            .font(.caption.weight(.bold)).tracking(0.8).textCase(.uppercase)
                            .foregroundStyle(role.tint)
                    }
                    Text(role.displayTitle).font(.system(.title2, design: .serif).weight(.semibold))
                    Text(role.displayTagline).font(.subheadline).foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                if let m = meta {
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                        tile(L("入门总薪酬"), m.entryAllIn)
                        tile(L("每周工时"), "\(m.hours)h")
                        tile(L("招聘起点"), m.recruitStart.text)
                        tile(L("最常见去向"), m.exits.items.first ?? "—")
                    }
                }

                NavigationLink(destination: MockInterviewView(role: role)) {
                    Label(L("模拟面试"), systemImage: "person.wave.2.fill")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                        .background(role.tint, in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
                        .foregroundStyle(.white)
                }

                section(L("这份工作做什么")) {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(role.displayDescription).font(.footnote).fixedSize(horizontal: false, vertical: true)
                        if !role.displayScenario.isEmpty {
                            Text(Self.stripLead(role.displayScenario)).font(.footnote).foregroundStyle(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }

                if let m = meta {
                    section(L("各级别薪酬（美国，估算）")) { payTable(m) }
                    section(L("招聘时间线")) { recruiting(m) }
                }
                if !role.displayTypicalDay.isEmpty { section(L("典型的一天")) { timeline(role.displayTypicalDay) } }
                if let m = meta {
                    section(L("常见去向")) {
                        Flow(spacing: 6) {
                            ForEach(m.exits.items, id: \.self) { x in
                                Text(x).font(.caption).padding(.horizontal, 10).padding(.vertical, 5)
                                    .background(DS.surfaceHi, in: Capsule())
                            }
                        }
                    }
                }
                if let g = guide, let cats = g.trackFirms[role.id], !cats.isEmpty {
                    section(L("招聘机构")) {
                        VStack(spacing: 0) {
                            ForEach(Array(cats.enumerated()), id: \.element) { idx, key in
                                if let cat = g.categories.first(where: { $0.key == key }) {
                                    NavigationLink(destination: FirmDirectoryScreen(guide: g, category: key)) {
                                        HStack {
                                            Text(cat.name).font(.subheadline)
                                            Spacer()
                                            Text(L("%lld 家", g.firms.filter { $0.cat == key }.count)).font(.caption).foregroundStyle(.secondary)
                                            Image(systemName: "chevron.right").font(.caption2.weight(.semibold)).foregroundStyle(.tertiary)
                                        }
                                        .padding(.vertical, 9).contentShape(Rectangle())
                                    }
                                    .buttonStyle(.plain)
                                    if idx < cats.count - 1 { RowDivider() }
                                }
                            }
                        }
                    }
                }
                section(L("核心技能")) { bullets(role.displaySkills) }
                section(L("入门门槛")) { Text(role.displayEntry).font(.footnote).fixedSize(horizontal: false, vertical: true) }
                section(L("证书建议")) { bullets(role.displayCerts) }
                section(L("与相近岗位的区别")) { bullets(role.displayDifferentiators) }
            }
            .padding(16)
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
    }

    private func tile(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.headline).monospacedDigit()
                .lineLimit(2).minimumScaleFactor(0.75)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, minHeight: 64, alignment: .topLeading)
        .padding(12)
        .card(padding: 0)
    }

    private func payTable(_ m: TrackMeta) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Grid(alignment: .leading, horizontalSpacing: 10, verticalSpacing: 10) {
                GridRow {
                    Text(L("级别")); Text(L("年限")); Text(L("底薪")); Text(L("总薪酬"))
                }
                .font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
                Divider().gridCellUnsizedAxes(.horizontal)
                ForEach(Array(m.ladder.enumerated()), id: \.offset) { _, row in
                    GridRow(alignment: .firstTextBaseline) {
                        Text(row.level.text).font(.footnote.weight(.semibold)).fixedSize(horizontal: false, vertical: true)
                        Text(row.years).font(.caption).monospacedDigit().foregroundStyle(.secondary)
                        Text(row.base).font(.caption).monospacedDigit().foregroundStyle(.secondary)
                        Text(row.allIn).font(.footnote.weight(.semibold)).monospacedDigit().fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            Text(L("根据银行公开的薪酬调整、行业薪酬调查和媒体报道整理的大致区间，因机构、部门、城市、年份和个人表现差异很大。"))
                .font(.caption2).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            if !role.displaySalary.isEmpty {
                Text(L("中国市场") + (Lang.code == "zh" ? "：" : ": ") + role.displaySalary)
                    .font(.caption2).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func recruiting(_ m: TrackMeta) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(m.timeline.enumerated()), id: \.offset) { i, step in
                HStack(alignment: .top, spacing: 12) {
                    VStack(spacing: 0) {
                        Text("\(i + 1)").font(.caption2.weight(.bold)).foregroundStyle(role.tint)
                            .frame(width: 22, height: 22)
                            .background(role.tint.opacity(0.14), in: Circle())
                        if i < m.timeline.count - 1 {
                            Rectangle().fill(DS.stroke).frame(width: 1).frame(maxHeight: .infinity)
                        }
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(step.when.text).font(.footnote.weight(.semibold))
                        Text(step.what.text).font(.footnote).foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.bottom, i < m.timeline.count - 1 ? 14 : 0)
                }
            }
        }
    }

    /// Scenario texts start with their own label ("典型场景：" / "Typical scenario:"), which the section title already shows.
    private static func stripLead(_ text: String) -> String {
        for lead in ["典型场景：", "典型场景:", "Typical scenario:", "Typical scenario："] where text.hasPrefix(lead) {
            let rest = String(text.dropFirst(lead.count)).trimmingCharacters(in: .whitespaces)
            return rest.prefix(1).uppercased() + rest.dropFirst()
        }
        return text
    }

    private func section<Content: View>(_ title: String, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.footnote.weight(.semibold)).foregroundStyle(.secondary)
            content().frame(maxWidth: .infinity, alignment: .leading)
                .padding(14).card(padding: 0)
        }
    }

    private func bullets(_ items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(items.enumerated()), id: \.offset) { _, t in
                HStack(alignment: .top, spacing: 8) {
                    Circle().fill(role.tint).frame(width: 5, height: 5).padding(.top, 6)
                    Text(t).font(.footnote).fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    /// "9:00 — Morning meeting …" lines: time on the left, text on the right.
    private func timeline(_ items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(Array(items.enumerated()), id: \.offset) { _, line in
                let parts = line.components(separatedBy: " — ")
                HStack(alignment: .top, spacing: 10) {
                    Text(parts.count > 1 ? parts[0] : "").font(.caption.weight(.bold)).monospacedDigit()
                        .lineLimit(1).minimumScaleFactor(0.8)
                        .foregroundStyle(role.tint).frame(width: 84, alignment: .leading)
                    Text(parts.count > 1 ? parts.dropFirst().joined(separator: " — ") : line)
                        .font(.footnote).fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
}

// MARK: - Firm directory

/// Pushed from a track profile with a category preselected.
struct FirmDirectoryScreen: View {
    let guide: CareerGuideData
    let category: String?

    var body: some View {
        ScrollView {
            FirmDirectory(guide: guide, initialCategory: category)
                .padding(16)
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle(L("机构库"))
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct FirmDirectory: View {
    let guide: CareerGuideData
    @State private var category: String?
    @State private var query = ""

    init(guide: CareerGuideData, initialCategory: String?) {
        self.guide = guide
        _category = State(initialValue: initialCategory)
    }

    private var rows: [Firm] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        return guide.firms.filter { f in
            (category == nil || f.cat == category) &&
            (q.isEmpty || "\(f.name) \(f.hq) \(f.known.zh) \(f.known.en)".lowercased().contains(q))
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    chip(L("全部"), count: guide.firms.count, on: category == nil) { category = nil }
                    ForEach(guide.categories) { c in
                        chip(c.name, count: guide.firms.filter { $0.cat == c.key }.count, on: category == c.key) { category = c.key }
                    }
                }
                .padding(.horizontal, 1)
            }

            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
                TextField(L("搜索机构、城市、业务"), text: $query)
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
            }
            .font(.subheadline)
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(DS.surface, in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous).strokeBorder(DS.stroke))

            VStack(spacing: 0) {
                if rows.isEmpty {
                    Text(L("没有匹配的机构")).font(.footnote).foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity).padding(.vertical, 28)
                }
                ForEach(Array(rows.enumerated()), id: \.element.id) { idx, firm in
                    FirmRow(firm: firm, category: guide.categories.first { $0.key == firm.cat }?.name ?? "")
                    if idx < rows.count - 1 { RowDivider() }
                }
            }
            .card(padding: 0)

            Text(L("点击股票代码可查看该机构的股票分析。“未上市”指机构本身未上市（私人合伙或子公司）。"))
                .font(.caption2).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
        }
    }

    private func chip(_ title: String, count: Int, on: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 5) {
                Text(title)
                Text("\(count)").monospacedDigit().opacity(0.6)
            }
            .font(.footnote.weight(on ? .semibold : .regular))
            .padding(.horizontal, 12).padding(.vertical, 7)
            .foregroundStyle(on ? DS.accent : .primary)
            .background(on ? DS.accent.opacity(0.14) : DS.surface, in: Capsule())
            .overlay(Capsule().strokeBorder(on ? DS.accent.opacity(0.5) : DS.stroke))
        }
        .buttonStyle(.plain)
    }
}

private struct FirmRow: View {
    let firm: Firm
    let category: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(firm.name).font(.subheadline.weight(.semibold))
                Text("\(category) · \(firm.hq)").font(.caption).foregroundStyle(.secondary)
                Text(firm.known.text).font(.caption).foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            trailing
        }
        .padding(.horizontal, 14).padding(.vertical, 12)
    }

    @ViewBuilder private var trailing: some View {
        if let s = firm.stock {
            NavigationLink(destination: StockDetailView(code: s.code, name: firm.name, market: s.market)) {
                HStack(spacing: 3) {
                    Text(s.code).font(.caption.weight(.semibold).monospaced())
                    Image(systemName: "chevron.right").font(.caption2.weight(.bold))
                }
                .foregroundStyle(DS.accent)
                .padding(.horizontal, 9).padding(.vertical, 5)
                .overlay(Capsule().strokeBorder(DS.accent.opacity(0.4)))
            }
            .buttonStyle(.plain)
        } else if let other = firm.otherListing {
            Text(other).font(.caption.monospaced()).foregroundStyle(.secondary)
        } else {
            Text(L("未上市")).font(.caption).foregroundStyle(.tertiary)
        }
    }
}

/// Wraps chips onto as many lines as needed.
private struct Flow: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, line: CGFloat = 0, maxX: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x > 0, x + s.width > width { x = 0; y += line + spacing; line = 0 }
            x += s.width + spacing
            line = max(line, s.height)
            maxX = max(maxX, x - spacing)
        }
        return CGSize(width: min(maxX, width), height: y + line)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, line: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x > bounds.minX, x + s.width > bounds.maxX { x = bounds.minX; y += line + spacing; line = 0 }
            v.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(s))
            x += s.width + spacing
            line = max(line, s.height)
        }
    }
}
