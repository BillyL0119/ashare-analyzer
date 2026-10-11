import SwiftUI

// MARK: - Model (/us/screener)

struct ScreenerRow: Decodable, Identifiable {
    let symbol: String
    let name: String
    let price: Double?
    let changePct: Double?
    let marketCap: Double?
    let sector: String?
    let industry: String?
    let pe: Double?
    var id: String { symbol }
}

struct ScreenerCount: Decodable, Hashable {
    let name: String
    let count: Int
}

struct ScreenerResponse: Decodable {
    let total: Int
    let rows: [ScreenerRow]
    let sectors: [ScreenerCount]
    let universe: Int
}

// MARK: - View model

@MainActor
final class ScreenerViewModel: ObservableObject {
    struct Preset: Identifiable, Hashable {
        let id: String
        let title: String
        let caps: Set<String>
        let sort: String
        let ascending: Bool
        var extra: [String: String] = [:]
    }

    static let presets: [Preset] = [
        Preset(id: "biggest", title: "最大公司", caps: ["mega", "large"], sort: "market_cap", ascending: false),
        Preset(id: "gainers", title: "今日涨幅榜", caps: ["mega", "large", "mid"], sort: "change_pct", ascending: false),
        Preset(id: "losers", title: "今日跌幅榜", caps: ["mega", "large", "mid"], sort: "change_pct", ascending: true),
        Preset(id: "active", title: "成交最活跃", caps: [], sort: "volume", ascending: false),
        Preset(id: "nearHigh", title: "接近 52 周高点", caps: ["mega", "large", "mid"], sort: "market_cap", ascending: false, extra: ["near_high": "3"]),
        Preset(id: "value", title: "低估值大盘股", caps: ["mega", "large"], sort: "pe", ascending: true, extra: ["pe_min": "0", "pe_max": "15"]),
    ]

    @Published var presetID: String? = "biggest"
    @Published var query = ""
    @Published var sector: String?
    @Published var caps: Set<String> = ["mega", "large"]
    @Published var sort = "market_cap"
    @Published var ascending = false
    @Published private(set) var rows: [ScreenerRow] = []
    @Published private(set) var total = 0
    @Published private(set) var universe = 0
    @Published private(set) var sectors: [ScreenerCount] = []
    @Published private(set) var isLoading = false
    @Published private(set) var failed = false
    private var extra: [String: String] = [:]
    private var task: Task<Void, Never>?

    func apply(_ p: Preset) {
        presetID = p.id
        caps = p.caps
        sort = p.sort
        ascending = p.ascending
        extra = p.extra
        sector = nil
        reload()
    }

    /// Any manual change leaves the preset (but keeps its filters as a starting point).
    func edited() {
        presetID = nil
        reload()
    }

    func reload() {
        task?.cancel()
        task = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 250_000_000)   // debounce typing
            guard !Task.isCancelled else { return }
            await self?.fetch(offset: 0)
        }
    }

    func loadMore() {
        guard !isLoading, rows.count < total else { return }
        Task { await fetch(offset: rows.count) }
    }

    private func params(offset: Int) -> [String: String] {
        var p = extra
        p["sort"] = sort
        p["order"] = ascending ? "asc" : "desc"
        p["limit"] = "40"
        p["offset"] = "\(offset)"
        if !caps.isEmpty { p["cap"] = caps.sorted().joined(separator: ",") }
        if let sector { p["sector"] = sector }
        let q = query.trimmingCharacters(in: .whitespaces)
        if !q.isEmpty { p["q"] = q }
        return p
    }

    private func fetch(offset: Int) async {
        isLoading = true
        failed = false
        do {
            let r: ScreenerResponse = try await APIClient.shared.get("/us/screener", params: params(offset: offset))
            if offset == 0 { rows = r.rows } else { rows += r.rows }
            total = r.total
            universe = r.universe
            if sectors.isEmpty { sectors = r.sectors }
        } catch {
            if offset == 0 { failed = true }
        }
        isLoading = false
    }
}

// MARK: - View

/// US stock screener: presets, search, sector / market-cap / sort menus, tap a row for the stock page.
struct ScreenerView: View {
    @StateObject private var vm = ScreenerViewModel()

    private static let capOptions: [(String, String)] = [
        ("mega", "超大 >$200B"), ("large", "大盘 $10–200B"), ("mid", "中盘 $2–10B"), ("small", "小盘 $300M–2B"), ("micro", "微盘 <$300M"),
    ]
    private static let sortOptions: [(String, String)] = [
        ("market_cap", "市值"), ("change_pct", "涨跌幅"), ("volume", "成交量"), ("pe", "市盈率"), ("price", "股价"),
    ]
    private static let sectorZh: [String: String] = [
        "Technology": "科技", "Health Care": "医疗保健", "Finance": "金融", "Consumer Discretionary": "非必需消费",
        "Industrials": "工业", "Real Estate": "房地产", "Energy": "能源", "Utilities": "公用事业",
        "Basic Materials": "基础材料", "Consumer Staples": "必需消费", "Telecommunications": "电信", "Miscellaneous": "其他",
    ]

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 14) {
                if vm.universe > 0 {
                    Text(L("按行业、规模、估值和走势筛选 %lld 家美国上市公司", vm.universe))
                        .font(.footnote).foregroundStyle(.secondary)
                }
                presetChips
                searchField
                filterMenus
                results
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 24)
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle(L("选股器"))
        .navigationBarTitleDisplayMode(.inline)
        .task { if vm.rows.isEmpty { vm.reload() } }
    }

    private var presetChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(ScreenerViewModel.presets) { p in
                    let on = vm.presetID == p.id
                    Button { vm.apply(p) } label: {
                        Text(L(p.title)).font(.footnote.weight(on ? .semibold : .regular))
                            .padding(.horizontal, 12).padding(.vertical, 7)
                            .foregroundStyle(on ? DS.accent : .primary)
                            .background(on ? DS.accent.opacity(0.14) : DS.surface, in: Capsule())
                            .overlay(Capsule().strokeBorder(on ? DS.accent.opacity(0.5) : DS.stroke))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 1)
        }
    }

    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
            TextField(L("代码或公司名"), text: $vm.query)
                .textInputAutocapitalization(.never).autocorrectionDisabled()
                .onChange(of: vm.query) { _, _ in vm.edited() }
        }
        .font(.subheadline)
        .padding(.horizontal, 12).padding(.vertical, 10)
        .background(DS.surface, in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous).strokeBorder(DS.stroke))
    }

    private var filterMenus: some View {
        HStack(spacing: 8) {
            Menu {
                Button(L("全部板块")) { vm.sector = nil; vm.edited() }
                ForEach(vm.sectors, id: \.self) { s in
                    Button("\(sectorName(s.name)) (\(s.count))") { vm.sector = s.name; vm.edited() }
                }
            } label: { menuLabel(vm.sector.map(sectorName) ?? L("全部板块"), icon: "square.grid.2x2") }

            Menu {
                ForEach(Self.capOptions, id: \.0) { key, title in
                    Button {
                        if vm.caps.contains(key) { vm.caps.remove(key) } else { vm.caps.insert(key) }
                        vm.edited()
                    } label: {
                        if vm.caps.contains(key) { Label(L(title), systemImage: "checkmark") } else { Text(L(title)) }
                    }
                }
            } label: { menuLabel(vm.caps.isEmpty ? L("市值") : L("市值") + " · \(vm.caps.count)", icon: "chart.bar") }

            Menu {
                ForEach(Self.sortOptions, id: \.0) { key, title in
                    Button {
                        if vm.sort == key { vm.ascending.toggle() } else { vm.sort = key; vm.ascending = key == "pe" }
                        vm.edited()
                    } label: {
                        if vm.sort == key { Label(L(title), systemImage: vm.ascending ? "arrow.up" : "arrow.down") } else { Text(L(title)) }
                    }
                }
            } label: { menuLabel(L(Self.sortOptions.first { $0.0 == vm.sort }?.1 ?? "市值"), icon: vm.ascending ? "arrow.up" : "arrow.down") }
        }
    }

    private func menuLabel(_ title: String, icon: String) -> some View {
        HStack(spacing: 5) {
            Image(systemName: icon).font(.caption)
            Text(title).font(.footnote).lineLimit(1)
        }
        .padding(.horizontal, 10).padding(.vertical, 7)
        .background(DS.surface, in: Capsule())
        .overlay(Capsule().strokeBorder(DS.stroke))
        .foregroundStyle(.primary)
    }

    @ViewBuilder
    private var results: some View {
        if vm.failed {
            ErrorRetryView(message: L("加载失败")) { vm.reload() }.card(padding: 16)
        } else if vm.rows.isEmpty && vm.isLoading {
            SkeletonRows(rows: 8, trailingPill: true).card(padding: 0)
        } else if vm.rows.isEmpty {
            Text(L("没有符合条件的公司，试试放宽条件")).font(.footnote).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity).padding(.vertical, 28).card(padding: 0)
        } else {
            Text(L("共 %lld 家", vm.total)).font(.caption).foregroundStyle(.secondary).padding(.horizontal, 4)
            VStack(spacing: 0) {
                ForEach(Array(vm.rows.enumerated()), id: \.element.id) { idx, r in
                    NavigationLink(destination: StockDetailView(code: r.symbol, name: r.name, market: .us)) {
                        row(r)
                    }
                    .buttonStyle(.plain)
                    .onAppear { if idx == vm.rows.count - 8 { vm.loadMore() } }
                    if idx < vm.rows.count - 1 { RowDivider() }
                }
                if vm.isLoading { ProgressView().padding(14) }
            }
            .card(padding: 0)
        }
    }

    private func row(_ r: ScreenerRow) -> some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                Text(r.symbol).font(.subheadline.weight(.bold).monospaced())
                Text(r.name).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 3) {
                Text(r.price.map { Formatters.price($0) } ?? "--").font(.subheadline.weight(.semibold)).monospacedDigit()
                Text(r.marketCap.map(FundamentalsSection.money) ?? "").font(.caption2).foregroundStyle(.secondary).monospacedDigit()
            }
            PctPill(pct: r.changePct, market: .us)
        }
        .padding(.horizontal, 14).padding(.vertical, 11)
        .contentShape(Rectangle())
    }

    private func sectorName(_ s: String) -> String {
        Lang.code == "zh" ? (Self.sectorZh[s] ?? s) : s
    }
}

/// Market tab (US) entry into the screener.
struct ScreenerEntryCard: View {
    var body: some View {
        NavigationLink(destination: ScreenerView()) {
            HStack(spacing: 12) {
                Image(systemName: "line.3.horizontal.decrease.circle.fill")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(DS.accent)
                    .frame(width: 44, height: 44)
                    .background(DS.accent.opacity(0.12), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text(L("选股器")).font(.subheadline.weight(.semibold))
                    Text(L("按行业、市值、估值、涨跌筛选全部美股")).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                }
                Spacer(minLength: 4)
                Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary)
            }
            .contentShape(Rectangle())
            .card(padding: 14)
        }
        .buttonStyle(.plain)
    }
}
