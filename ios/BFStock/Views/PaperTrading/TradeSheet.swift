import SwiftUI

enum TradeMode {
    case buy
    case sell(String, String, PaperPosition)   // symbol, name, position
}

struct TradeSheet: View {
    let market: Market
    let mode: TradeMode
    let onConfirm: (String, Int, Market) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var buySymbol = ""
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

    private var isValid: Bool {
        if isBuy {
            let trimmed = buySymbol.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty, shares > 0 else { return false }
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
            .navigationTitle(isBuy ? "买入" : "卖出")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("取消") { dismiss() }
                }
            }
            .safeAreaInset(edge: .bottom) { confirmBar }
        }
        .presentationDetents([.fraction(0.62), .large])
        .presentationDragIndicator(.visible)
        .presentationBackground(DS.bg)
        .onAppear {
            if let (_, _, pos) = sellTuple {
                setShares(min(minStep, max(minStep, pos.availableSharesInt)))
            } else {
                setShares(minStep)
            }
        }
    }

    // MARK: - Headers

    private var buyHeader: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(market == .cn ? "A股 · 股票代码" : "美股 · 股票代码")
            TextField(market == .cn ? "如 000001" : "如 AAPL", text: $buySymbol)
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
        }
    }

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
                    infoTile("现价", "\(currency)\(String(format: "%.2f", pos.currentPrice))")
                    infoTile("成本", "\(currency)\(String(format: "%.2f", pos.avgCost))")
                    infoTile("可卖/持有", "\(pos.availableSharesInt)/\(pos.sharesInt)")
                }

                if pos.availableSharesInt < pos.sharesInt {
                    Label(market == .cn ? "T+1：今日买入部分明日可卖" : "T+2：部分持仓尚未结算",
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
                Text(market == .cn ? "股数（100 的整数倍）" : "股数")
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
        var opts: [(String, Int)] = [("1/4", part(0.25)), ("1/2", part(0.5)), ("3/4", part(0.75)), ("全部", m)]
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
                estimateRow("预计成交金额", "\(currency)\(String(format: "%.2f", amt))", color: .primary, bold: true)
                if market == .cn {
                    estimateRow("手续费约", "¥\(String(format: "%.2f", max(5, amt * 0.0013)))", color: .secondary)
                }
                RowDivider().padding(.leading, 0)
                estimateRow("预计盈亏", "\(pl >= 0 ? "+" : "")\(String(format: "%.2f", pl))",
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
            Text(isBuy ? "确认买入 \(shares) 股" : "确认卖出 \(shares) 股")
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
