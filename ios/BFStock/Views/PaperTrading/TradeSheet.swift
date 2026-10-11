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
    @State private var sharesText = ""
    @State private var shares = 100
    @FocusState private var focus: Field?

    private enum Field { case symbol, shares }

    private var isBuy: Bool {
        if case .buy = mode { return true }
        return false
    }

    private var currency: String { market == .cn ? "¥" : "$" }
    private var minStep: Int { market == .cn ? 100 : 1 }
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

    /// Price x shares (+ the A-share 0.03% buy commission) for the quoted stock.
    private var buyCost: Double? {
        guard isBuy, let p = quote?.price else { return nil }
        return p * Double(shares) * (market == .cn ? 1.0003 : 1)
    }
    private var shortOfCash: Bool {
        if let c = buyCost, let cash { return c > cash }
        return false
    }

    private var isValid: Bool {
        if isBuy {
            let trimmed = buySymbol.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty, shares > 0, quote?.price != nil, !shortOfCash else { return false }
            if market == .cn { return shares % 100 == 0 }
            return true
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
            SectionHeader(market == .cn ? L("A股 · 股票代码") : L("美股 · 股票代码"))
            TextField(market == .cn ? L("如 000001") : L("如 AAPL"), text: $buySymbol)
                .font(.system(size: 28, weight: .bold, design: .monospaced))
                .autocorrectionDisabled()
                .textInputAutocapitalization(market == .cn ? .never : .characters)
                .keyboardType(market == .cn ? .numberPad : .asciiCapable)
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
            } else if quoteMissing {
                Text(L("没有找到这只股票")).font(.subheadline).foregroundStyle(.red)
            }

            // Quick picks give first-time traders somewhere to start.
            if buySymbol.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(market == .cn ? Self.quickCN : Self.quickUS, id: \.self) { code in
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

    private func lookUpQuote() async {
        guard isBuy else { return }
        let sym = buySymbol.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        quote = nil; quoteMissing = false
        guard !sym.isEmpty, market == .us || sym.count == 6 else { return }
        try? await Task.sleep(nanoseconds: 350_000_000)          // wait for typing to settle
        guard !Task.isCancelled else { return }
        let path = market == .us ? "/us/stock/\(sym)/realtime" : "/stocks/\(sym)/realtime"
        if let q: TradeQuote = try? await APIClient.shared.get(path), q.price != nil {
            if !Task.isCancelled { quote = q }
        } else if !Task.isCancelled {
            quoteMissing = true
        }
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
    private static let quickCN = ["600519", "300750", "000858", "601318", "000001"]

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

                if pos.availableSharesInt < pos.sharesInt {
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
                Text(market == .cn ? L("股数（100 的整数倍）") : L("股数"))
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
            return market == .cn
                ? [("100", 100), ("500", 500), ("1000", 1000), ("5000", 5000)]
                : [("1", 1), ("10", 10), ("50", 50), ("100", 100)]
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
        if market == .cn && isBuy { return max(100, c / 100 * 100) }
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
}
