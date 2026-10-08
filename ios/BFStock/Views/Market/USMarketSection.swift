import SwiftUI

/// US market block for the Market tab: session, indices, breadth, movers, sector heat map, mega caps.
struct USMarketSection: View {
    let overview: USOverview?
    var earnings: [EarningsEvent] = []
    var afterOverview: AnyView? = nil
    let isLoading: Bool
    let error: String?
    let onRetry: () -> Void

    @State private var moverTab = 0

    var body: some View {
        if let ov = overview {
            VStack(spacing: 26) {
                overviewCard(ov)
                if let extra = afterOverview { extra }
                megaCaps(ov.megaCaps)
                movers(ov)
                sectors(ov.sectors)
                earningsSection
            }
        } else if let err = error {
            ErrorRetryView(message: err, onRetry: onRetry).card()
        } else if isLoading {
            VStack(alignment: .leading, spacing: 16) {
                SkeletonBar(width: 90, height: 14)
                HStack(spacing: 10) {
                    ForEach(0..<2, id: \.self) { _ in SkeletonBar(height: 78, radius: DS.tileRadius) }
                }
                SkeletonBar(height: 8, radius: 4)
            }
            .card()
        }
    }

    // MARK: Overview

    private func overviewCard(_ ov: USOverview) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text("美股大盘").font(.headline)
                    Spacer()
                    HStack(spacing: 5) {
                        Circle().fill(sessionColor(ov.session.state)).frame(width: 6, height: 6)
                        Text(sessionState(ov.session)).font(.caption.weight(.semibold))
                    }
                    .padding(.horizontal, 9).padding(.vertical, 4)
                    .background(sessionColor(ov.session.state).opacity(0.14), in: Capsule())
                    .foregroundStyle(sessionColor(ov.session.state))
                }
                Text([ov.session.state == "regular" ? nil : countdown(ov.session.nextOpenUtc), String(ov.session.etTime.suffix(5)) + " ET"]
                        .compactMap { $0 }.joined(separator: " · "))
                    .font(.system(.caption, design: .rounded)).monospacedDigit().foregroundStyle(.secondary)
            }
            if let hero = ov.indices.first {
                IndexTileUS(quote: hero, style: .hero)
                HStack(spacing: 8) {
                    ForEach(ov.indices.dropFirst()) { q in IndexTileUS(quote: q, style: .compact) }
                }
            }
            breadth(ov.breadth)
        }
        .card()
    }

    private func breadth(_ b: USBreadth) -> some View {
        let total = Double(max(b.advancing + b.declining, 1))
        return VStack(spacing: 8) {
            GeometryReader { geo in
                let w = geo.size.width - 2
                HStack(spacing: 2) {
                    Capsule().fill(Theme.usUp).frame(width: max(w * Double(b.advancing) / total, b.advancing > 0 ? 3 : 0))
                    Capsule().fill(Theme.usDown)
                }
            }
            .frame(height: 6)
            HStack {
                Text(L("上涨 %lld · 下跌 %lld", b.advancing, b.declining))
                Spacer()
                Text("数据延迟，仅供参考")
            }
            .font(.caption2).foregroundStyle(.secondary)
        }
    }

    // MARK: Mega caps

    private func megaCaps(_ items: [USQuote]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("七巨头"))
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(items) { q in
                        NavigationLink(destination: StockDetailView(code: q.symbol, name: q.name, market: .us)) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(q.symbol).font(.system(.subheadline, design: .rounded).weight(.bold))
                                Text(Formatters.price(q.price)).font(.caption).monospacedDigit().foregroundStyle(.secondary)
                                Text(Formatters.changePct(q.pct))
                                    .font(.system(.caption, design: .rounded).weight(.semibold)).monospacedDigit()
                                    .foregroundStyle(Theme.changeColor(q.pct, market: .us))
                            }
                            .padding(12)
                            .frame(width: 96, alignment: .leading)
                            .background(DS.surfaceHi, in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    // MARK: Movers

    private func movers(_ ov: USOverview) -> some View {
        let rows: [USQuote] = moverTab == 0 ? ov.gainers : moverTab == 1 ? ov.losers : Array(ov.active20.prefix(10))
        return VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("美股热门")) {
                Picker("", selection: $moverTab) {
                    Text("涨幅榜").tag(0); Text("跌幅榜").tag(1); Text("活跃榜").tag(2)
                }
                .pickerStyle(.segmented).frame(maxWidth: 220)
            }
            VStack(spacing: 0) {
                ForEach(Array(rows.enumerated()), id: \.element.id) { idx, q in
                    NavigationLink(destination: StockDetailView(code: q.symbol, name: q.name, market: .us)) {
                        HStack(spacing: 10) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(q.symbol).font(.subheadline.weight(.bold))
                                Text(q.name).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                            }
                            Spacer(minLength: 8)
                            Text(Formatters.price(q.price))
                                .font(.system(.subheadline, design: .rounded).weight(.medium)).monospacedDigit()
                            PctPill(pct: q.pct, market: .us, fixedWidth: 74)
                        }
                        .padding(.horizontal, 16).padding(.vertical, 9)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    if idx < rows.count - 1 { RowDivider() }
                }
            }
            .card(padding: 0)
        }
    }

    // MARK: Sectors

    private func sectors(_ items: [USSectorTile]) -> some View {
        let maxAbs = max(items.map { abs($0.pct) }.max() ?? 1, 0.01)
        return VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("行业板块"))
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
                ForEach(items) { s in
                    let c = Theme.changeColor(s.pct, market: .us)
                    NavigationLink(destination: StockDetailView(code: s.symbol, name: s.name, market: .us)) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(L(Self.sectorKey[s.name] ?? s.name))
                                .font(.caption.weight(.semibold)).lineLimit(2).minimumScaleFactor(0.8)
                                .frame(maxWidth: .infinity, minHeight: 30, alignment: .topLeading)
                            Text(Formatters.changePct(s.pct))
                                .font(.system(.subheadline, design: .rounded).weight(.bold)).monospacedDigit()
                                .foregroundStyle(c)
                            Text(s.symbol).font(.caption2).foregroundStyle(.secondary)
                        }
                        .padding(10)
                        .background(c.opacity(0.08 + 0.2 * abs(s.pct) / maxAbs),
                                    in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private static let sectorKey: [String: String] = [
        "Technology": "科技", "Financials": "金融", "Energy": "能源板块", "Health Care": "医疗保健",
        "Consumer Discretionary": "非必需消费", "Consumer Staples": "必需消费", "Industrials": "工业",
        "Utilities": "公用事业", "Materials": "原材料", "Real Estate": "房地产板块", "Communication": "通信服务",
    ]

    // MARK: Earnings

    private var earningsByDay: [(String, [EarningsEvent])] {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.locale = Locale(identifier: "en_US_POSIX")
        let today = f.string(from: Date())
        let end = f.string(from: Date().addingTimeInterval(7 * 86400))
        let week = earnings.filter { $0.date >= today && $0.date <= end }
        return Dictionary(grouping: week, by: \.date).sorted { $0.key < $1.key }.map { ($0.key, Array($0.value.prefix(5))) }
    }

    private func dayLabel(_ iso: String) -> String {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.locale = Locale(identifier: "en_US_POSIX")
        guard let d = f.date(from: iso) else { return iso }
        return d.formatted(.dateTime.month(.abbreviated).day().weekday(.abbreviated))
    }

    private var earningsSection: some View {
        let days = earningsByDay
        return VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("财报日历"))
            if days.isEmpty {
                Text("未来一周暂无重要财报")
                    .font(.footnote).foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity).padding(.vertical, 20)
                    .card(padding: 0)
            } else {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(days.enumerated()), id: \.element.0) { i, day in
                        Text(dayLabel(day.0)).font(.caption.weight(.bold)).foregroundStyle(.secondary)
                            .padding(.horizontal, 16).padding(.top, i == 0 ? 12 : 10).padding(.bottom, 4)
                        ForEach(day.1) { e in
                            NavigationLink(destination: StockDetailView(code: e.symbol, name: e.name, market: .us)) {
                                HStack(spacing: 8) {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(e.symbol).font(.subheadline.weight(.bold))
                                        Text(e.name).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                                    }
                                    Spacer()
                                    if let eps = e.epsEstimate {
                                        Text(L("预期 EPS %@", eps)).font(.caption2).monospacedDigit().foregroundStyle(.secondary)
                                    }
                                    if let t = e.timing {
                                        Text(t == "BMO" ? L("盘前") : L("盘后"))
                                            .font(.caption2.weight(.medium))
                                            .padding(.horizontal, 7).padding(.vertical, 3)
                                            .background(DS.surfaceHi, in: Capsule())
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                .padding(.horizontal, 16).padding(.vertical, 7)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    Spacer().frame(height: 8)
                }
                .card(padding: 0)
            }
        }
    }

    // MARK: Session

    private func sessionColor(_ s: String) -> Color {
        switch s { case "regular": return Theme.usUp; case "pre", "post": return .orange; default: return .secondary }
    }

    private func sessionState(_ s: USSession) -> String {
        switch s.state {
        case "regular": return L("交易中")
        case "pre": return L("盘前交易")
        case "post": return L("盘后交易")
        default: return L("休市")
        }
    }

    private func countdown(_ iso: String?) -> String? {
        guard let iso, let d = ISO8601DateFormatter().date(from: iso) else { return nil }
        let mins = Int(d.timeIntervalSinceNow / 60)
        guard mins > 0 else { return nil }
        let text = mins >= 2880 ? L("%lld天", mins / 1440) : L("%lld小时 %lld分钟", mins / 60, mins % 60)
        return L("距开盘 %@", text)
    }
}


private struct IndexTileUS: View {
    enum Style { case hero, compact }
    let quote: USQuote
    let style: Style

    private var title: String {
        switch quote.name {
        case "S&P 500": return L("标普500")
        case "Nasdaq": return L("纳斯达克")
        case "Dow Jones": return L("道琼斯")
        case "Russell 2000": return L("罗素2000")
        default: return quote.name
        }
    }

    var body: some View {
        let color = Theme.changeColor(quote.pct, market: .us)
        Group {
            if style == .hero {
                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(title).font(.footnote.weight(.medium)).foregroundStyle(.secondary)
                        Text(Formatters.price(quote.price))
                            .font(.system(size: 34, weight: .bold, design: .rounded)).monospacedDigit()
                            .minimumScaleFactor(0.7).lineLimit(1)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 4) {
                        PctPill(pct: quote.pct, market: .us, fixedWidth: 84)
                        if let ch = quote.change {
                            Text(Formatters.changeAbs(ch))
                                .font(.system(.caption, design: .rounded).weight(.semibold)).monospacedDigit()
                                .foregroundStyle(color)
                        }
                    }
                }
                .padding(.horizontal, 16).padding(.vertical, 14)
            } else {
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.caption2).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.8)
                    Text(Formatters.price(quote.price))
                        .font(.system(.subheadline, design: .rounded).weight(.bold)).monospacedDigit()
                        .minimumScaleFactor(0.6).lineLimit(1)
                    Text(Formatters.changePct(quote.pct))
                        .font(.system(.caption, design: .rounded).weight(.semibold)).monospacedDigit()
                        .foregroundStyle(color)
                }
                .padding(.horizontal, 10).padding(.vertical, 9)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
        .background(
            LinearGradient(colors: [color.opacity(0.16), DS.surfaceHi.opacity(0.6)], startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
    }
}
