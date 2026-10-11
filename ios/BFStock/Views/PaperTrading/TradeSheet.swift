import SwiftUI

enum TradeMode {
    case buy
    case sell(String, String, PaperPosition)   // symbol, name, position
}

struct TradeSheet: View {
    let market: Market
    let mode: TradeMode
    var initialSymbol: String? = nil          // opened from a stock page: the order starts filled in
    var cash: Double? = nil                   // available cash, to show what is left after the order
    let onConfirm: (String, Int, Market) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var buySymbol = ""
    @State private var quote: TradeQuote?
    @State private var quoteMissing = false
    @State private var suggestions: [TradeSuggestion] = []
    @State private var sharesText = ""
    @State private var shares = 100
    @FocusState private var focus: Field?

    private enum Field { case symbol, shares }

    private var isBuy: Bool {
        if case .buy = mode { return true }
        return false
    }

    private var currency: String { market.currencySymbol }
    /// Order step: 1 share (US), 100 (A-shares, Japan), the stock's board lot (Hong Kong)
    private var minStep: Int {
        switch market {
        case .us: return 1
        case .hk: return (isBuy ? quote?.lotSize : sellTuple?.2.lot) ?? 100
        default: return 100
        }
    }
    private var sellColor: Color { Color(r: 0xF2, g: 0x8B, b: 0x3C) }
    private var tint: Color { isBuy ? DS.accent : sellColor }

    private var sellTuple: (String, String, PaperPosition)? {
        if case .sell(let s, let n, let p) = mode { return (s, n, p) }
        return nil
    }

    private var maxSell: Int { sellTuple?.2.availableSharesInt ?? 0 }
    private var upperBound: Int { isBuy ? 1_000_000 : max(minStep, maxSell) }

    private var estimatedAmount: Double? {
        guard let pos = sellTuple?.2 else { return nil }
        return pos.currentPrice * Double(shares)
    }

    /// Price x shares plus fees: A-share 0.03% commission, HK stamp duty and levies (same rule as the server).
    private var buyCost: Double? {
        guard isBuy, let p = quote?.price else { return nil }
        let gross = p * Double(shares)
        switch market {
        case .cn: return gross * 1.0003
        case .hk: return gross + Self.hkFee(gross)
        default: return gross
        }
    }

    /// HK stamp duty 0.1% (whole dollars, rounded up) + ~0.0085% exchange levies.
    static func hkFee(_ amount: Double) -> Double {
        amount > 0 ? (amount * 0.001).rounded(.up) + amount * 0.000085 : 0
    }
    private var shortOfCash: Bool {
        if let c = buyCost, let cash { return c > cash }
        return false
    }

    private var isValid: Bool {
        if isBuy {
            let trimmed = buySymbol.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty, shares > 0, quote?.price != nil, !shortOfCash else { return false }
            return market == .us || shares % minStep == 0
        } else {
            return shares > 0 && shares <= maxSell
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if isBuy { buyHeader } else { sellHeader }
                    sharesCard
                    if !isBuy { estimateCard }
                    if let cost = buyCost { buyCostCard(cost) }
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
            .navigationTitle(isBuy ? L("买入") : L("卖出"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("取消") { dismiss() }
                }
            }
            .safeAreaInset(edge: .bottom) { confirmBar }
            .task(id: buySymbol) { await lookUpQuote() }
        }
        .presentationDetents([.fraction(isBuy ? 0.8 : 0.62), .large])   // buy shows quote + cost
        .presentationDragIndicator(.visible)
        .presentationBackground(DS.bg)
        .onAppear {
            if let (_, _, pos) = sellTuple {
                setShares(min(minStep, max(minStep, pos.availableSharesInt)))
            } else {
                setShares(minStep)
                if let s = initialSymbol, buySymbol.isEmpty { buySymbol = s }
            }
        }
    }

    // MARK: - Headers

    private var buyHeader: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(L([.us: "美股 · 股票代码", .cn: "A股 · 股票代码", .hk: "港股 · 股票代码", .jp: "日股 · 股票代码"][market] ?? ""))
            // Names work too ("google", "苹果", "腾讯"): people type the company, not the ticker
            TextField(L([.us: "代码或公司名，如 AAPL、苹果", .cn: "代码或名称，如 600519、茅台",
                         .hk: "代码或名称，如 00700、腾讯", .jp: "代码或名称，如 7203、丰田"][market] ?? ""), text: $buySymbol)
                .font(buySymbol.isEmpty ? .body : .system(size: 28, weight: .bold, design: .monospaced))
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
                    Text(q.name ?? buySymbol.uppercased()).font(.subheadline.weight(.semibold)).lineLimit(1)
                    Text("· \(currency)\(String(format: "%.2f", p))").font(.subheadline).foregroundStyle(.secondary).monospacedDigit()
                }
            } else if quoteMissing && visibleSuggestions.isEmpty {
                Text(L("没有找到这只股票")).font(.subheadline).foregroundStyle(.red)
            }

            if !visibleSuggestions.isEmpty {
                VStack(spacing: 0) {
                    ForEach(visibleSuggestions) { s in
                        Button { buySymbol = s.symbol } label: {
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
            if buySymbol.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Self.quick[market] ?? Self.quickUS, id: \.self) { code in
                            Button { buySymbol = code } label: {
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
        }
    }

    // MARK: - Live quote

    /// Search matches, hidden once the box holds a ticker that has a quote.
    private var visibleSuggestions: [TradeSuggestion] {
        let sym = buySymbol.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if quote?.price != nil, suggestions.contains(where: { $0.symbol == sym }) { return [] }
        return suggestions
    }

    private func lookUpQuote() async {
        guard isBuy else { return }
        let raw = buySymbol.trimmingCharacters(in: .whitespacesAndNewlines)
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
                    if market == .hk, let lot = q.lotSize, lot > 0 { setShares(max(lot, shares / lot * lot)) }
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

    private func buyCostCard(_ cost: Double) -> some View {
        VStack(spacing: 10) {
            HStack {
                Text(L("预计花费")).foregroundStyle(.secondary)
                Spacer()
                Text("\(currency)\(Formatters.price(cost))").fontWeight(.bold).monospacedDigit()
            }
            if let cash {
                HStack {
                    Text(L("可用现金")).foregroundStyle(.secondary)
                    Spacer()
                    Text("\(currency)\(Formatters.price(cash))").fontWeight(.bold).monospacedDigit()
                        .foregroundStyle(shortOfCash ? Color.red : Color.primary)
                }
            }
        }
        .font(.subheadline)
        .card()
    }

    private static let quickUS = ["AAPL", "NVDA", "MSFT", "TSLA", "SPY", "QQQ"]
    private static let quick: [Market: [String]] = [
        .us: quickUS,
        .cn: ["600519", "300750", "000858", "601318", "000001"],
        .hk: ["00700", "09988", "03690", "01810", "00005", "02800"],
        .jp: ["7203", "6758", "7974", "9984", "8306", "1321"],
    ]

    @ViewBuilder
    private var sellHeader: some View {
        if let (sym, name, pos) = sellTuple {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(name.isEmpty ? sym : name)
                            .font(.title3.weight(.bold))
                        Text(sym)
                            .font(.system(.caption, design: .monospaced))
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    PctPill(pct: pos.profitLossPct, market: market)
                }

                HStack(spacing: 10) {
                    infoTile(L("现价"), "\(currency)\(String(format: "%.2f", pos.currentPrice))")
                    infoTile(L("成本"), "\(currency)\(String(format: "%.2f", pos.avgCost))")
                    infoTile(L("可卖/持有"), "\(pos.availableSharesInt)/\(pos.sharesInt)")
                }

                if pos.availableSharesInt < pos.sharesInt && (market == .cn || market == .us) {
                    Label(market == .cn ? L("T+1：今日买入部分明日可卖") : L("T+2：部分持仓尚未结算"),
                          systemImage: "clock.badge.exclamationmark")
                        .font(.caption)
                        .foregroundStyle(sellColor)
                }
            }
            .card()
        }
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

    // MARK: - Shares

    private var sharesCard: some View {
        VStack(spacing: 16) {
            HStack {
                Text(market == .hk ? L("股数（每手 %lld 股）", minStep) : market == .us ? L("股数") : L("股数（100 的整数倍）"))
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                if !isBuy {
                    Text("最多 \(maxSell)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
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
                    .disabled(shares >= upperBound)
            }

            HStack(spacing: 8) {
                ForEach(quickOptions, id: \.0) { label, value in
                    Button { setShares(value) } label: {
                        Text(label)
                            .font(.system(.footnote, design: .rounded).weight(.semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .foregroundStyle(shares == value ? Color.white : Color.primary)
                            .background(shares == value ? tint : DS.surfaceHi, in: Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }

            if market == .cn && isBuy, let n = Int(sharesText), n > 0, n % 100 != 0 {
                Text("已按 100 股整数倍调整为 \(shares) 股")
                    .font(.caption)
                    .foregroundStyle(sellColor)
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

    private var quickOptions: [(String, Int)] {
        if isBuy {
            if market == .us { return [("1", 1), ("10", 10), ("50", 50), ("100", 100)] }
            return [1, 5, 10, 50].map { ("\($0 * minStep)", $0 * minStep) }
        }
        let m = max(minStep, maxSell)
        func part(_ f: Double) -> Int { max(minStep, Int(Double(m) * f) / minStep * minStep) }
        var opts: [(String, Int)] = [("1/4", part(0.25)), ("1/2", part(0.5)), ("3/4", part(0.75)), (L("全部"), m)]
        var seen = Set<Int>()
        opts = opts.filter { seen.insert($0.1).inserted }
        return opts
    }

    // MARK: - Estimate (sell)

    @ViewBuilder
    private var estimateCard: some View {
        if let amt = estimatedAmount, let pos = sellTuple?.2 {
            let pl = amt - pos.avgCost * Double(shares)
            VStack(spacing: 12) {
                estimateRow(L("预计成交金额"), "\(currency)\(String(format: "%.2f", amt))", color: .primary, bold: true)
                if market == .cn {
                    estimateRow(L("手续费约"), "¥\(String(format: "%.2f", max(5, amt * 0.0013)))", color: .secondary)
                } else if market == .hk {
                    estimateRow(L("印花税及交易所费用"), "HK$\(String(format: "%.2f", Self.hkFee(amt)))", color: .secondary)
                }
                RowDivider().padding(.leading, 0)
                estimateRow(L("预计盈亏"), "\(pl >= 0 ? "+" : "")\(String(format: "%.2f", pl))",
                            color: Theme.changeColor(pl, market: market), bold: true)
            }
            .card()
        }
    }

    private func estimateRow(_ label: String, _ value: String, color: Color, bold: Bool = false) -> some View {
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
            let sym = isBuy
                ? buySymbol.trimmingCharacters(in: .whitespacesAndNewlines)
                : (sellTuple?.0 ?? "")
            onConfirm(sym, shares, market)
            dismiss()
        } label: {
            Text(isBuy ? L("确认买入 %lld 股", shares) : L("确认卖出 %lld 股", shares))
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(tint.gradient, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .opacity(isValid ? 1 : 0.4)
        }
        .disabled(!isValid)
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.bar)
    }

    // MARK: - Helpers

    private func normalized(_ n: Int) -> Int {
        let c = min(max(n, minStep), upperBound)
        if market != .us && isBuy { return max(minStep, c / minStep * minStep) }
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
