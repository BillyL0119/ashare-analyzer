import SwiftUI

enum OrderSide: String, CaseIterable, Identifiable {
    case buy, sell, short, cover
    var id: String { rawValue }
    var opening: Bool { self == .buy || self == .short }
    var label: String { L(["buy": "买入", "sell": "卖出", "short": "卖空", "cover": "买入平仓"][rawValue] ?? "") }
    var badge: String { L(["buy": "买", "sell": "卖", "short": "空", "cover": "平"][rawValue] ?? "") }
    var tint: Color {
        switch self {
        case .buy: return DS.accent
        case .sell: return Color(r: 0xF2, g: 0x8B, b: 0x3C)
        case .short: return Color(r: 0x8B, g: 0x5C, b: 0xF6)
        case .cover: return Color(r: 0x63, g: 0x66, b: 0xF1)
        }
    }
}

enum OrderKind: String, CaseIterable, Identifiable {
    case market, limit, stop
    case stopLimit = "stop_limit"
    case trailing = "trailing_stop"
    var id: String { rawValue }
    var label: String { L(["market": "市价单", "limit": "限价单", "stop": "止损单", "stop_limit": "止损限价单", "trailing_stop": "追踪止损"][rawValue] ?? "") }
    var help: String {
        L([
            "market": "市价单按当前价格立即成交（休市时排队到开盘）。",
            "limit": "限价单只在达到你设定的价格或更好时成交。",
            "stop": "止损单在价格到达触发价后按市价成交，常用来止损。",
            "stop_limit": "止损限价单在价格到达触发价后变成限价单，急跌时可能成交不了。",
            "trailing_stop": "追踪止损的触发价跟着最高价按百分比上移，价格回落这么多就卖出，用来锁住利润。",
        ][rawValue] ?? "")
    }
    var needsLimit: Bool { self == .limit || self == .stopLimit }
    var needsStop: Bool { self == .stop || self == .stopLimit }
}

/// What the order form produces; the view model adds the device id.
struct OrderDraft {
    let symbol: String
    let shares: Int
    let side: OrderSide
    let kind: OrderKind
    let limit: Double?
    let stop: Double?
    let trail: Double?
    let tif: String

    func body(deviceId: String, market: Market, gameId: String?) -> OrderBody {
        OrderBody(deviceId: deviceId, market: market.rawValue, symbol: symbol, shares: shares, side: side.rawValue, type: kind.rawValue,
                  limitPrice: kind.needsLimit ? limit : nil, stopPrice: kind.needsStop ? stop : nil,
                  trailPct: kind == .trailing ? trail : nil, tif: kind == .market ? "day" : tif, gameId: gameId)
    }
}

/// Fees as the server charges them (A-share commission + stamp duty, US SEC fee, HK stamp duty + levies).
func paperFee(_ market: Market, side: OrderSide, amount: Double, shares: Int) -> Double {
    guard amount > 0 else { return 0 }
    let selling = side == .sell || side == .short
    switch market {
    case .cn: return max(5, amount * (selling ? 0.0013 : 0.0003))
    case .us: return selling ? Double(shares) * 0.000008 : 0
    case .hk: return (amount * 0.001).rounded(.up) + amount * 0.000085
    case .jp: return 0
    }
}

private let shortMargin = 0.5   // extra margin the server holds on a short, as a share of its value

struct TradeSheet: View {
    let market: Market
    var initialSide: OrderSide = .buy
    /// The portfolio the order goes into (cash, holdings, shorts); nil while it loads
    var view: PaperMarketAccount? = nil
    var initialSymbol: String? = nil          // opened from a stock page or a holding: the order starts filled in
    var initialKind: OrderKind = .market       // a learning mission can open the ticket on a limit or stop order
    let onConfirm: (OrderDraft) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var side: OrderSide = .buy
    @State private var kind: OrderKind = .market
    @State private var tif = "day"
    @State private var symbol = ""
    @State private var quote: TradeQuote?
    @State private var quoteMissing = false
    @State private var suggestions: [TradeSuggestion] = []
    @State private var sharesText = ""
    @State private var shares = 1
    @State private var limitText = ""
    @State private var stopText = ""
    @State private var trailText = "5"
    @FocusState private var focus: Field?

    private enum Field { case symbol, shares, price }

    private var currency: String { market.currencySymbol }
    private var sym: String { symbol.trimmingCharacters(in: .whitespacesAndNewlines).uppercased() }
    private var shortOk: Bool { view?.shortOk ?? false }
    private var sides: [OrderSide] { shortOk ? OrderSide.allCases : [.buy, .sell] }
    private var kinds: [OrderKind] { side.opening ? [.market, .limit, .stop, .stopLimit] : OrderKind.allCases }
    private var long: PaperPosition? { side == .sell ? view?.portfolio[sym] : nil }
    private var short: PaperShort? { side == .cover ? view?.shorts?[sym] : nil }
    private var holdings: [String] {
        (side == .sell ? view.map { Array($0.portfolio.keys) } : side == .cover ? view?.shorts.map { Array($0.keys) } : nil)?.sorted() ?? []
    }
    private var price: Double? { long?.currentPrice ?? short?.currentPrice ?? quote?.price }

    /// Size step: 1 share for US and for closing; the board lot when buying elsewhere (100, or HK's per-stock lot)
    private var minStep: Int {
        guard side == .buy, market != .us else { return 1 }
        return market == .hk ? (quote?.lotSize ?? 100) : 100
    }
    private var buyingPower: Double { view?.buyingPower ?? view?.cash ?? 0 }
    private var maxShares: Int {
        switch side {
        case .sell: return long?.availableSharesInt ?? 0
        case .cover: return short?.sharesInt ?? 0
        case .short: return price.map { Int(buyingPower / ($0 * shortMargin)) } ?? 0
        case .buy: return price.map { Int(buyingPower / ($0 * 1.002)) / minStep * minStep } ?? 0
        }
    }

    private var limit: Double? { Double(limitText) }
    private var stop: Double? { Double(stopText) }
    private var trail: Double? { Double(trailText) }
    private var pricesOk: Bool {
        (!kind.needsLimit || (limit ?? 0) > 0) && (!kind.needsStop || (stop ?? 0) > 0)
            && (kind != .trailing || (0.5...50).contains(trail ?? 0))
    }
    /// The price the estimate assumes for this order type
    private var execPrice: Double? {
        guard let p = price else { return nil }
        switch kind {
        case .market: return p
        case .limit, .stopLimit: return limit
        case .stop: return stop
        case .trailing: return p * (1 - (trail ?? 0) / 100)
        }
    }
    private var amount: Double? { execPrice.flatMap { $0 > 0 ? $0 * Double(shares) : nil } }
    private var fee: Double { amount.map { paperFee(market, side: side, amount: $0, shares: shares) } ?? 0 }
    private var need: Double? {
        guard let a = amount else { return nil }
        return side == .buy ? a + fee : side == .short ? a * shortMargin : nil
    }
    private var overBuyingPower: Bool { (need ?? 0) > buyingPower && view != nil }

    private var isValid: Bool {
        guard !sym.isEmpty, price != nil, shares > 0, pricesOk, !overBuyingPower else { return false }
        if side == .buy && market != .us && shares % minStep != 0 { return false }
        return side.opening || shares <= maxShares
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if sides.count > 1 {
                        Picker("", selection: $side) {
                            ForEach(sides) { Text($0.label).tag($0) }
                        }
                        .pickerStyle(.segmented)
                    }
                    if side.opening { symbolHeader } else { holdingHeader }
                    orderTypeCard
                    sharesCard
                    estimateCard
                    Text("仅供学习，不构成投资建议。实际成交价以服务器返回为准。")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 8)
                }
                .padding(16)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(DS.bg.ignoresSafeArea())
            .navigationTitle(side.label)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("取消") { dismiss() }
                }
            }
            .safeAreaInset(edge: .bottom) { confirmBar }
            .task(id: side.opening ? symbol : "") { await lookUpQuote() }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .presentationBackground(DS.bg)
        .onAppear {
            side = initialSide
            kind = initialKind
            if let s = initialSymbol, symbol.isEmpty { symbol = s }
            if side == .sell, let p = view?.portfolio[sym] { setShares(max(1, p.availableSharesInt)) }
            else if side == .cover, let p = view?.shorts?[sym] { setShares(p.sharesInt) }
            else { setShares(minStep) }
        }
        .onChange(of: side) { _, s in
            if s.opening && kind == .trailing { kind = .market }   // trailing stops only protect an open position
            setShares(s == .sell ? (view?.portfolio[sym]?.availableSharesInt ?? 1) : s == .cover ? (view?.shorts?[sym]?.sharesInt ?? 1) : minStep)
        }
        .onChange(of: price) { _, p in
            // Untouched price boxes start at the live price
            guard let p else { return }
            let v = String(format: "%.2f", p)
            if limitText.isEmpty { limitText = v }
            if stopText.isEmpty { stopText = v }
        }
    }

    // MARK: - Symbol (buy / short)

    private var symbolHeader: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(L([.us: "美股 · 股票代码", .cn: "A股 · 股票代码", .hk: "港股 · 股票代码", .jp: "日股 · 股票代码"][market] ?? ""))
            // Names work too ("google", "苹果", "腾讯"): people type the company, not the ticker
            TextField(L([.us: "代码或公司名，如 AAPL、苹果", .cn: "代码或名称，如 600519、茅台",
                         .hk: "代码或名称，如 00700、腾讯", .jp: "代码或名称，如 7203、丰田"][market] ?? ""), text: $symbol)
                .font(symbol.isEmpty ? .body : .system(size: 28, weight: .bold, design: .monospaced))
                .autocorrectionDisabled()
                .textInputAutocapitalization(market == .cn ? .never : .characters)
                .submitLabel(.search)
                .focused($focus, equals: .symbol)
                .padding(16)
                .background(DS.surface, in: RoundedRectangle(cornerRadius: DS.radius, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: DS.radius, style: .continuous)
                        .strokeBorder(focus == .symbol ? DS.accent : DS.stroke, lineWidth: focus == .symbol ? 1.5 : 1)
                )

            if let q = quote, let p = q.price {
                HStack(spacing: 6) {
                    Text(q.name ?? sym).font(.subheadline.weight(.semibold)).lineLimit(1)
                    Text("· \(currency)\(String(format: "%.2f", p))").font(.subheadline).foregroundStyle(.secondary).monospacedDigit()
                }
            } else if quoteMissing && visibleSuggestions.isEmpty {
                Text(L("没有找到这只股票")).font(.subheadline).foregroundStyle(.red)
            }

            if !visibleSuggestions.isEmpty {
                VStack(spacing: 0) {
                    ForEach(visibleSuggestions) { s in
                        Button { symbol = s.symbol } label: {
                            HStack(spacing: 10) {
                                Text(s.symbol)
                                    .font(.system(.subheadline, design: .monospaced).weight(.bold))
                                    .frame(minWidth: 64, alignment: .leading)
                                Text(s.displayName).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                                Spacer(minLength: 8)
                                if let p = s.price {
                                    Text("\(currency)\(String(format: "%.2f", p))").font(.subheadline).monospacedDigit()
                                }
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 11)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        if s.id != visibleSuggestions.last?.id { RowDivider() }
                    }
                }
                .background(DS.surface, in: RoundedRectangle(cornerRadius: DS.radius, style: .continuous))
            }

            // Quick picks give first-time traders somewhere to start.
            if symbol.isEmpty {
                chips(Self.quick[market] ?? Self.quickUS) { symbol = $0 }
            }
        }
    }

    private func chips(_ items: [String], action: @escaping (String) -> Void) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(items, id: \.self) { code in
                    Button { action(code) } label: {
                        Text(code)
                            .font(.system(.subheadline, design: .monospaced).weight(.semibold))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .background(DS.surface, in: Capsule())
                            .overlay(Capsule().strokeBorder(DS.stroke))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Live quote

    /// Search matches, hidden once the box holds a ticker that has a quote.
    private var visibleSuggestions: [TradeSuggestion] {
        if quote?.price != nil, suggestions.contains(where: { $0.symbol == sym }) { return [] }
        return suggestions
    }

    private func lookUpQuote() async {
        guard side.opening else { return }
        let raw = symbol.trimmingCharacters(in: .whitespacesAndNewlines)
        let sym = raw.uppercased()
        quote = nil; quoteMissing = false
        if sym.isEmpty { suggestions = []; return }
        try? await Task.sleep(nanoseconds: 300_000_000)          // wait for typing to settle
        guard !Task.isCancelled else { return }
        let isCode: Bool
        switch market {
        case .cn: isCode = sym.count == 6 && sym.allSatisfy(\.isNumber)
        case .hk: isCode = (1...5).contains(sym.count) && sym.allSatisfy(\.isNumber)
        case .jp: isCode = sym.count == 4 && sym.first?.isNumber == true && sym.allSatisfy { $0.isASCII && ($0.isNumber || $0.isUppercase) }
        case .us: isCode = sym.allSatisfy { $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "." || $0 == "-") }
        }
        // Search (names) and quote (tickers) in parallel; a complete A-share code needs no search
        async let found: [TradeSuggestion] = market == .cn && isCode ? [] : searchSuggestions(raw)
        if isCode {
            let path = "\(market.stockPath)/\(sym)/realtime"
            let q: TradeQuote? = try? await APIClient.shared.get(path)
            if !Task.isCancelled {
                if let q, q.price != nil {
                    quote = q
                    if market == .hk, side == .buy, let lot = q.lotSize, lot > 0 { setShares(max(lot, shares / lot * lot)) }
                } else { quoteMissing = true }
            }
        }
        let r = await found
        if !Task.isCancelled { suggestions = r }
    }

    private func searchSuggestions(_ q: String) async -> [TradeSuggestion] {
        if market != .cn {
            let rows: [TradeSearchUS] = (try? await APIClient.shared.get("/\(market.rawValue)/search", params: ["q": q])) ?? []
            return rows.prefix(6).map { TradeSuggestion(symbol: $0.symbol, name: $0.name, nameZh: $0.nameZh, price: $0.price) }
        }
        let rows: [StockSearchResult] = (try? await APIClient.shared.get("/stocks/search", params: ["q": q])) ?? []
        return rows.filter { $0.market == nil || $0.market == "cn" }.prefix(6)
            .map { TradeSuggestion(symbol: $0.code, name: $0.name, nameZh: nil, price: nil) }
    }

    private static let quickUS = ["AAPL", "NVDA", "MSFT", "TSLA", "SPY", "QQQ"]
    private static let quick: [Market: [String]] = [
        .us: quickUS,
        .cn: ["600519", "300750", "000858", "601318", "000001"],
        .hk: ["00700", "09988", "03690", "01810", "00005", "02800"],
        .jp: ["7203", "6758", "7974", "9984", "8306", "1321"],
    ]

    // MARK: - Holding (sell / cover)

    @ViewBuilder
    private var holdingHeader: some View {
        if let p = long {
            holdingCard(name: p.name, pct: p.profitLossPct, tiles: [
                (L("现价"), "\(currency)\(String(format: "%.2f", p.currentPrice))"),
                (L("成本"), "\(currency)\(String(format: "%.2f", p.avgCost))"),
                (L("可卖/持有"), "\(p.availableSharesInt)/\(p.sharesInt)"),
            ], note: p.availableSharesInt < p.sharesInt && (market == .cn || market == .us)
                ? (market == .cn ? L("T+1：今日买入部分明日可卖") : L("T+2：部分持仓尚未结算")) : nil)
        } else if let p = short {
            holdingCard(name: p.name, pct: p.profitLossPct, tiles: [
                (L("现价"), "\(currency)\(String(format: "%.2f", p.currentPrice))"),
                (L("成本"), "\(currency)\(String(format: "%.2f", p.avgPrice))"),
                (L("持仓"), "-\(p.sharesInt)"),
            ], note: nil)
        } else {
            VStack(alignment: .leading, spacing: 10) {
                SectionHeader(L("选择持仓"))
                if holdings.isEmpty {
                    Text("暂无持仓").font(.subheadline).foregroundStyle(.secondary)
                } else {
                    chips(holdings) { s in
                        symbol = s
                        setShares(side == .sell ? (view?.portfolio[s]?.availableSharesInt ?? 1) : (view?.shorts?[s]?.sharesInt ?? 1))
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .card()
        }
    }

    private func holdingCard(name: String?, pct: Double, tiles: [(String, String)], note: String?) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                Button { symbol = "" } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text((name?.isEmpty == false ? name : nil) ?? sym).font(.title3.weight(.bold)).lineLimit(1)
                        Text(sym).font(.system(.caption, design: .monospaced)).foregroundStyle(.secondary)
                    }
                }
                .buttonStyle(.plain)
                Spacer()
                PctPill(pct: pct, market: market)
            }
            HStack(spacing: 10) {
                ForEach(tiles, id: \.0) { infoTile($0.0, $0.1) }
            }
            if let note {
                Label(note, systemImage: "clock.badge.exclamationmark")
                    .font(.caption)
                    .foregroundStyle(OrderSide.sell.tint)
            }
        }
        .card()
    }

    private func infoTile(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption2).foregroundStyle(.secondary)
            Text(value)
                .font(.system(.subheadline, design: .rounded).weight(.semibold))
                .monospacedDigit()
                .minimumScaleFactor(0.7)
                .lineLimit(1)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.surfaceHi, in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
    }

    // MARK: - Order type

    private var orderTypeCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(L("订单类型")).font(.footnote.weight(.semibold)).foregroundStyle(.secondary)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(kinds) { k in
                        Button { kind = k } label: {
                            Text(k.label)
                                .font(.footnote.weight(.semibold))
                                .padding(.horizontal, 12).padding(.vertical, 7)
                                .foregroundStyle(kind == k ? Color.white : Color.primary)
                                .background(kind == k ? side.tint : DS.surfaceHi, in: Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            if kind.needsStop || kind.needsLimit || kind == .trailing {
                HStack(spacing: 10) {
                    if kind.needsStop { priceField(L("触发价"), $stopText, prefix: currency) }
                    if kind.needsLimit { priceField(L("限价"), $limitText, prefix: currency) }
                    if kind == .trailing { priceField(L("回撤幅度 %"), $trailText, prefix: nil) }
                }
            }
            if kind != .market {
                Picker("", selection: $tif) {
                    Text(L("当日有效")).tag("day")
                    Text(L("撤单前有效")).tag("gtc")
                }
                .pickerStyle(.segmented)
            }
            Text(kind.help + (side == .short ? " " + L("卖空是先借股票卖出，以后再买回来还。股价下跌就赚钱，上涨就亏钱，亏损没有上限。需要占用一半金额的保证金。") : ""))
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            if view?.session?.open == false && kind == .market {
                Text(view?.session?.holiday == true ? L("今天是交易所假日，休市。市价单会在下一个交易日开盘后成交。")
                                                    : L("休市中：市价单会在开盘后按开盘附近的价格成交。"))
                    .font(.caption)
                    .foregroundStyle(OrderSide.sell.tint)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }

    private func priceField(_ label: String, _ text: Binding<String>, prefix: String?) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            HStack(spacing: 4) {
                if let prefix { Text(prefix).foregroundStyle(.secondary) }
                TextField("0", text: text)
                    .keyboardType(.decimalPad)
                    .font(.system(.body, design: .rounded).weight(.bold))
                    .monospacedDigit()
                    .focused($focus, equals: .price)
            }
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(DS.surfaceHi, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Shares

    private var sharesCard: some View {
        VStack(spacing: 16) {
            HStack {
                Text(side == .buy && market == .hk ? L("股数（每手 %lld 股）", minStep)
                     : side == .buy && market != .us ? L("股数（100 的整数倍）") : L("股数"))
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.secondary)
                Spacer()
            }

            HStack(spacing: 14) {
                stepButton("minus") { setShares(shares - minStep) }
                    .accessibilityLabel(L("减少"))
                    .disabled(shares <= minStep)
                TextField("0", text: $sharesText)
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .multilineTextAlignment(.center)
                    .keyboardType(.numberPad)
                    .focused($focus, equals: .shares)
                    .onChange(of: sharesText) { _, v in
                        guard let n = Int(v), n > 0 else { return }
                        shares = normalized(n)
                    }
                stepButton("plus") { setShares(shares + minStep) }
                    .accessibilityLabel(L("增加"))
            }

            if maxShares >= minStep {
                HStack(spacing: 8) {
                    ForEach(quickOptions, id: \.1) { label, value in
                        Button { setShares(value) } label: {
                            Text(label)
                                .font(.system(.footnote, design: .rounded).weight(.semibold))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .foregroundStyle(shares == value ? Color.white : Color.primary)
                                .background(shares == value ? side.tint : DS.surfaceHi, in: Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .card()
    }

    private func stepButton(_ icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .bold))
                .frame(width: 48, height: 48)
                .background(DS.surfaceHi, in: Circle())
        }
        .buttonStyle(.plain)
    }

    /// Quarter steps of the most this order can be (cash for buys, holdings for closes)
    private var quickOptions: [(String, Int)] {
        let m = maxShares
        func part(_ f: Double) -> Int { max(minStep, Int(Double(m) * f) / minStep * minStep) }
        var seen = Set<Int>()
        return [(0.25, "25%"), (0.5, "50%"), (0.75, "75%")].map { f, l in (l, part(f)) }
            .filter { $0.1 < m }
            .filter { seen.insert($0.1).inserted } + [(side.opening ? L("最多") : L("全部"), m)]
    }

    // MARK: - Estimate

    @ViewBuilder
    private var estimateCard: some View {
        if let amt = amount {
            VStack(spacing: 12) {
                switch side {
                case .buy: estimateRow(L("预计花费"), money(amt + fee), bold: true)
                case .sell: estimateRow(L("预计到账"), money(amt - fee), bold: true)
                case .short:
                    estimateRow(L("预计到账"), money(amt - fee))
                    estimateRow(L("需要保证金"), money(amt * shortMargin), bold: true)
                case .cover: estimateRow(L("预计花费"), money(amt + fee), bold: true)
                }
                if fee >= 0.005 {
                    estimateRow(market == .hk ? L("印花税及交易所费用") : L("手续费"), money(fee))
                }
                if let pl = profit(amt) {
                    estimateRow(L("预计盈亏"), (pl >= 0 ? "+" : "-") + money(abs(pl)), color: Theme.changeColor(pl, market: market), bold: true)
                }
                if side.opening && view != nil {
                    estimateRow(L("可用购买力"), money(buyingPower), color: overBuyingPower ? .red : .primary)
                }
            }
            .card()
        }
    }

    private func profit(_ amt: Double) -> Double? {
        if let p = long { return amt - fee - p.avgCost * Double(shares) }
        if let p = short { return p.avgPrice * Double(shares) - amt - fee }
        return nil
    }

    private func money(_ v: Double) -> String { "\(currency)\(Formatters.price(v))" }

    private func estimateRow(_ label: String, _ value: String, color: Color = .primary, bold: Bool = false) -> some View {
        HStack {
            Text(label).font(.subheadline).foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.system(.body, design: .rounded).weight(bold ? .bold : .regular))
                .monospacedDigit()
                .foregroundStyle(color)
        }
    }

    // MARK: - Confirm

    private var confirmBar: some View {
        Button {
            focus = nil
            onConfirm(OrderDraft(symbol: sym, shares: shares, side: side, kind: kind, limit: limit, stop: stop, trail: trail, tif: tif))
            dismiss()
        } label: {
            Text(kind == .market && side == .buy ? L("确认买入 %lld 股", shares)
                 : kind == .market && side == .sell ? L("确认卖出 %lld 股", shares)
                 : "\(L("提交委托")) · \(side.label) \(shares)")
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(side.tint.gradient, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .opacity(isValid ? 1 : 0.4)
        }
        .disabled(!isValid)
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.bar)
    }

    // MARK: - Helpers

    private func normalized(_ n: Int) -> Int {
        let c = max(n, minStep)
        if side == .buy && market != .us { return max(minStep, c / minStep * minStep) }
        return c
    }

    private func setShares(_ n: Int) {
        shares = normalized(n)
        sharesText = String(shares)
    }
}


/// Minimal quote used by the order form (both /us/stock/{sym}/realtime and /stocks/{code}/realtime).
struct TradeQuote: Decodable {
    let name: String?
    let price: Double?
    /// Hong Kong board lot (from /api/hk/stock/{code}/realtime)
    let lotSize: Int?
}

/// A ticker match for the order form's symbol box.
struct TradeSuggestion: Identifiable {
    var id: String { symbol }
    let symbol: String
    let name: String
    let nameZh: String?
    let price: Double?

    var displayName: String { Lang.code == "zh" ? (nameZh ?? name) : name }
}

private struct TradeSearchUS: Decodable {
    let symbol: String
    let name: String
    let nameZh: String?
    let price: Double?
}
