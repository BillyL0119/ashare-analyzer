import SwiftUI

/// Global business school guide: searchable, filterable by region, with a detail page per school.
struct UniversitiesView: View {
    @StateObject private var vm = UniversitiesViewModel()
    @State private var search = ""
    @State private var region = "all"
    @State private var mode = "overall"   // "overall" (profiled schools by QS overall) | "business" (QS business top 150)

    private static let regions: [(String, String)] = [
        ("all", "全部"), ("north_america", "北美"), ("uk", "英国"), ("europe", "欧洲"),
        ("asia", "亚洲"), ("oceania", "大洋洲"),
    ]

    /// Region for business-ranking rows, which only carry a country.
    private static let countryRegion: [String: String] = [
        "United States": "north_america", "Canada": "north_america", "United Kingdom": "uk",
        "France": "europe", "Italy": "europe", "Spain": "europe", "Denmark": "europe", "Netherlands": "europe",
        "Switzerland": "europe", "Sweden": "europe", "Austria": "europe", "Germany": "europe", "Finland": "europe",
        "Portugal": "europe", "Belgium": "europe", "Norway": "europe", "Ireland": "europe",
        "Singapore": "asia", "Hong Kong SAR": "asia", "China (Mainland)": "asia", "India": "asia", "South Korea": "asia",
        "Japan": "asia", "Taiwan": "asia", "Malaysia": "asia", "Australia": "oceania", "New Zealand": "oceania",
    ]

    private var regionOptions: [(String, String)] {
        mode == "business" ? Self.regions + [("other", "拉美及其他")] : Self.regions
    }

    private var byId: [String: University] { Dictionary(vm.all.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a }) }

    private var businessRows: [BusinessRankEntry] {
        let q = search.trimmingCharacters(in: .whitespaces).lowercased()
        let ids = byId
        return (vm.ranking?.entries ?? []).filter { e in
            let r = Self.countryRegion[e.country] ?? "other"
            let names = ([e.name, e.city, e.country] + e.schoolIds.compactMap { ids[$0]?.name }).joined(separator: " ").lowercased()
            return (region == "all" || r == region) && (q.isEmpty || names.contains(q))
        }
    }

    private var filtered: [University] {
        let q = search.trimmingCharacters(in: .whitespaces).lowercased()
        return vm.all.filter { u in
            (region == "all" || u.region == region) &&
            (q.isEmpty || u.name.lowercased().contains(q) || u.university.lowercased().contains(q)
                || u.city.lowercased().contains(q) || u.country.lowercased().contains(q))
        }
        .sorted { ($0.qsRank ?? 999) < ($1.qsRank ?? 999) }
    }

    var body: some View {
        VStack(spacing: 0) {
            Picker("", selection: $mode) {
                Text(L("综合排名")).tag("overall")
                Text(L("商科排名")).tag("business")
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .onChange(of: mode) { _, new in
                if new == "overall", region == "other" { region = "all" }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(regionOptions, id: \.0) { key, label in
                        let on = region == key
                        Button { withAnimation(.easeInOut(duration: 0.15)) { region = key } } label: {
                            Text(L(label))
                                .font(.subheadline.weight(on ? .semibold : .regular))
                                .padding(.horizontal, 14).padding(.vertical, 7)
                                .background(on ? DS.accent : DS.surfaceHi, in: Capsule())
                                .foregroundStyle(on ? Color.white : Color.primary)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
            }
            .padding(.vertical, 10)
            .sensoryFeedback(.selection, trigger: region)

            if mode == "business" {
                businessList
            } else if vm.all.isEmpty {
                if let err = vm.error {
                    ErrorRetryView(message: err) { Task { await vm.load() } }.padding()
                    Spacer()
                } else {
                    ScrollView { SkeletonRows(rows: 6, trailingPill: true).card(padding: 0).padding(.horizontal, 16) }
                }
            } else if filtered.isEmpty {
                Text("暂无结果").foregroundStyle(.secondary).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(Array(filtered.enumerated()), id: \.element.id) { idx, u in
                            NavigationLink(destination: UniversityDetailView(uni: u)) { UniversityRow(uni: u) }
                                .buttonStyle(.plain)
                            if idx < filtered.count - 1 { RowDivider() }
                        }
                    }
                    .card(padding: 0)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 24)
                }
            }
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle(L("全球商学院指南"))
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $search, prompt: Text(L("搜索商学院")))
        .task { await vm.load() }
        .task { await vm.loadRanking() }
    }

    @ViewBuilder
    private var businessList: some View {
        if vm.ranking == nil {
            ScrollView { SkeletonRows(rows: 6, trailingPill: true).card(padding: 0).padding(.horizontal, 16) }
        } else if businessRows.isEmpty {
            Text("暂无结果").foregroundStyle(.secondary).frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            ScrollView {
                Text(L("商科排名只看商学与管理学科的声誉和研究；不少学校的商科远高于综合排名。"))
                    .font(.footnote).foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 20).padding(.bottom, 8)
                LazyVStack(spacing: 0) {
                    let rows = businessRows
                    let ids = byId
                    ForEach(Array(rows.enumerated()), id: \.element.id) { idx, e in
                        if let profile = e.schoolIds.compactMap({ ids[$0] }).first {
                            NavigationLink(destination: UniversityDetailView(uni: profile)) {
                                BusinessRankRow(entry: e, profile: profile)
                            }
                            .buttonStyle(.plain)
                        } else {
                            BusinessRankRow(entry: e, profile: nil)
                        }
                        if idx < rows.count - 1 { RowDivider() }
                    }
                }
                .card(padding: 0)
                .padding(.horizontal, 16)
                Text(L("来源：QS 商科排名 2026 · QS 综合排名 2027"))
                    .font(.caption2).foregroundStyle(.tertiary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 20).padding(.top, 8).padding(.bottom, 24)
            }
        }
    }
}

/// One row of the QS business ranking: rank, school, overall rank and how far apart they are.
private struct BusinessRankRow: View {
    let entry: BusinessRankEntry
    let profile: University?

    private var gap: Int? { entry.overallNum.map { $0 - entry.rankNum } }

    var body: some View {
        HStack(spacing: 12) {
            Text(entry.rank)
                .font(.system(.subheadline, design: .rounded).weight(.bold)).monospacedDigit()
                .foregroundStyle(entry.rankNum <= 10 ? Color.orange : DS.accent)
                .frame(width: 40)
            VStack(alignment: .leading, spacing: 3) {
                Text(profile?.name ?? entry.name)
                    .font(.subheadline.weight(.semibold)).lineLimit(2).multilineTextAlignment(.leading)
                Text(profile != nil ? "\(entry.name) · \(entry.city)" : "\(entry.city), \(entry.country)")
                    .font(.caption).foregroundStyle(.secondary).lineLimit(1)
                HStack(spacing: 6) {
                    if let o = entry.overall {
                        Text(L("综合 #%@", o.replacingOccurrences(of: "=", with: "")))
                            .font(.caption2).foregroundStyle(.secondary)
                    }
                    if entry.overallNum == nil {
                        tag(L("独立商学院"), color: .purple)
                    } else if let g = gap, g >= 10 {
                        tag(L("商科比综合高 %lld 位", g), color: .green)
                    }
                }
            }
            Spacer(minLength: 4)
            if profile != nil {
                Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(.tertiary)
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 10)
        .contentShape(Rectangle())
    }

    private func tag(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 6).padding(.vertical, 2)
            .background(color.opacity(0.14), in: Capsule())
            .foregroundStyle(color)
    }
}

private struct UniversityRow: View {
    let uni: University

    var body: some View {
        HStack(spacing: 12) {
            Text(uni.qsRank.map { "#\($0)" } ?? "–")
                .font(.system(.footnote, design: .rounded).weight(.bold)).monospacedDigit()
                .foregroundStyle(DS.accent)
                .frame(width: 40)
            VStack(alignment: .leading, spacing: 3) {
                Text(uni.name).font(.subheadline.weight(.semibold)).lineLimit(2).multilineTextAlignment(.leading)
                Text("\(uni.city) · \(uni.country)").font(.caption).foregroundStyle(.secondary).lineLimit(1)
                if let b = uni.qsBmRank {
                    Text(L("QS 商科 #%@", b.replacingOccurrences(of: "=", with: "")))
                        .font(.caption2.weight(.semibold)).foregroundStyle(DS.accent)
                }
            }
            Spacer(minLength: 4)
            Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 16).padding(.vertical, 11)
        .contentShape(Rectangle())
    }
}

struct UniversityDetailView: View {
    let uni: University

    private var about: String { Lang.code == "zh" ? uni.descriptionCn : uni.descriptionEn }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                header
                Text(about).font(.subheadline).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                facts
                if !uni.programs.isEmpty { chips(L("项目"), uni.programs) }
                if !uni.specialties.isEmpty { chips(L("专业方向"), uni.specialties) }
                if let r = uni.requirements { requirements(r) }
                if let jobs = uni.employment, !jobs.isEmpty { employment(jobs) }
                if let a = uni.notableAlumni, !a.isEmpty { chips(L("知名校友"), a) }
                if let u = uni.url, SafeURL.web(u) != nil {
                    Button { SafeURL.open(u) } label: {
                        Label(L("访问官网"), systemImage: "safari")
                            .font(.subheadline.weight(.semibold))
                            .frame(maxWidth: .infinity).padding(.vertical, 12)
                            .background(DS.accent, in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
                            .foregroundStyle(.white)
                    }
                }
            }
            .padding(16)
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(uni.name).font(.title2.weight(.bold))
            Text(uni.university).font(.subheadline).foregroundStyle(.secondary)
            HStack(spacing: 8) {
                Text("\(uni.city) · \(uni.country)").font(.caption).foregroundStyle(.secondary)
            }
            HStack(spacing: 8) {
                if let r = uni.qsRank {
                    Text(L("QS 综合 #%@", String(r))).font(.caption.weight(.bold)).foregroundStyle(Color.orange)
                        .padding(.horizontal, 8).padding(.vertical, 3).background(Color.orange.opacity(0.12), in: Capsule())
                }
                if let b = uni.qsBmRank {
                    Text(L("QS 商科 #%@", b.replacingOccurrences(of: "=", with: ""))).font(.caption.weight(.bold)).foregroundStyle(DS.accent)
                        .padding(.horizontal, 8).padding(.vertical, 3).background(DS.accent.opacity(0.12), in: Capsule())
                }
            }
        }
    }

    private var facts: some View {
        let items: [(String, String)] = [
            (L("创办"), uni.established.map(String.init) ?? "–"),
            (L("学费"), uni.tuitionUsd ?? "–"),
            (L("授课语言"), (uni.language ?? "–").capitalized),
        ]
        return HStack(alignment: .top, spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.offset) { i, item in
                VStack(spacing: 3) {
                    Text(item.0).font(.caption2).foregroundStyle(.secondary)
                    Text(item.1).font(.system(.footnote, design: .rounded).weight(.bold))
                        .multilineTextAlignment(.center).minimumScaleFactor(0.7)
                }
                .frame(maxWidth: .infinity)
                if i < items.count - 1 { Rectangle().fill(DS.stroke).frame(width: 1, height: 30) }
            }
        }
        .padding(.vertical, 12)
        .background(DS.surfaceHi.opacity(0.7), in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
    }

    private func chips(_ title: String, _ values: [String]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.footnote.weight(.semibold)).foregroundStyle(.secondary)
            ChipFlow(spacing: 8) {
                ForEach(values, id: \.self) { v in
                    Text(v).font(.caption.weight(.medium))
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .background(DS.surfaceHi, in: Capsule())
                }
            }
        }
    }

    private func requirements(_ r: UniRequirements) -> some View {
        var rows: [(String, String)] = []
        if let g = r.gpa, !g.isEmpty { rows.append(("GPA", g)) }
        if let g = r.gmatMedian { rows.append(("GMAT", String(Int(g)))) }
        if let g = r.greAccepted { rows.append(("GRE", g ? L("接受") : L("不接受"))) }
        if let t = r.toefl { rows.append(("TOEFL", String(Int(t)))) }
        if let i = r.ielts { rows.append(("IELTS", String(format: "%.1f", i))) }
        return Group {
            if !rows.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text(L("申请要求")).font(.footnote.weight(.semibold)).foregroundStyle(.secondary)
                    VStack(spacing: 0) {
                        ForEach(Array(rows.enumerated()), id: \.offset) { i, row in
                            HStack { Text(row.0).font(.subheadline); Spacer(); Text(row.1).font(.subheadline.weight(.semibold)).monospacedDigit() }
                                .padding(.horizontal, 14).padding(.vertical, 10)
                            if i < rows.count - 1 { RowDivider() }
                        }
                    }
                    .card(padding: 0)
                }
            }
        }
    }

    private func employment(_ jobs: [String]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(L("就业去向")).font(.footnote.weight(.semibold)).foregroundStyle(.secondary)
            VStack(spacing: 10) {
                ForEach(jobs, id: \.self) { j in
                    let pct = Double(j.split(separator: " ").last?.replacingOccurrences(of: "%", with: "") ?? "") ?? 0
                    VStack(alignment: .leading, spacing: 4) {
                        Text(j).font(.caption)
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule().fill(DS.surfaceHi)
                                Capsule().fill(DS.accent.opacity(0.8)).frame(width: max(geo.size.width * pct / 100, 3))
                            }
                        }
                        .frame(height: 5)
                    }
                }
            }
            .padding(14)
            .card(padding: 0)
        }
    }
}

/// Left-to-right wrapping layout for tag chips.
private struct ChipFlow: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = arrange(proposal.width ?? 0, subviews)
        return CGSize(width: proposal.width ?? rows.map(\.maxX).max() ?? 0, height: rows.last.map { $0.y + $0.height } ?? 0)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        for row in arrange(bounds.width, subviews) {
            for (i, x) in row.xs {
                subviews[i].place(at: CGPoint(x: bounds.minX + x, y: bounds.minY + row.y), proposal: .unspecified)
            }
        }
    }

    private struct Row { var y: CGFloat; var height: CGFloat; var maxX: CGFloat; var xs: [(Int, CGFloat)] }

    private func arrange(_ width: CGFloat, _ subviews: Subviews) -> [Row] {
        var rows: [Row] = []
        var x: CGFloat = 0, y: CGFloat = 0, rowH: CGFloat = 0
        var cur: [(Int, CGFloat)] = []
        for (i, v) in subviews.enumerated() {
            let size = v.sizeThatFits(.unspecified)
            if x > 0, x + size.width > width {
                rows.append(Row(y: y, height: rowH, maxX: x - spacing, xs: cur))
                y += rowH + spacing; x = 0; rowH = 0; cur = []
            }
            cur.append((i, x))
            x += size.width + spacing
            rowH = max(rowH, size.height)
        }
        if !cur.isEmpty { rows.append(Row(y: y, height: rowH, maxX: x - spacing, xs: cur)) }
        return rows
    }
}
