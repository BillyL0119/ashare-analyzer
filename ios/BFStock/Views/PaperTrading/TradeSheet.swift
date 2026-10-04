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

    private var isBuy: Bool {
        if case .buy = mode { return true }
        return false
    }

    private var currency: String { market == .cn ? "¥" : "$" }
    private var minStep: Int { market == .cn ? 100 : 1 }

    private var sellTuple: (String, String, PaperPosition)? {
        if case .sell(let s, let n, let p) = mode { return (s, n, p) }
        return nil
    }

    private var maxSell: Int { sellTuple?.2.availableSharesInt ?? 0 }

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
            Form {
                if isBuy { buyForm } else { sellForm }

                Section {
                    Text("仅供学习，不构成投资建议。实际成交价以服务器返回为准。")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle(isBuy ? "买入" : "卖出")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("确认") {
                        let sym = isBuy
                            ? buySymbol.trimmingCharacters(in: .whitespacesAndNewlines)
                            : (sellTuple?.0 ?? "")
                        onConfirm(sym, shares, market)
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .disabled(!isValid)
                }
            }
        }
        .presentationDetents([.medium])
        .onAppear {
            if let (_, _, pos) = sellTuple {
                shares = min(minStep, max(minStep, pos.availableSharesInt))
            } else {
                shares = minStep
            }
        }
    }

    // MARK: - Buy Form

    @ViewBuilder
    private var buyForm: some View {
        Section("股票代码") {
            TextField(market == .cn ? "如：000001" : "如：AAPL", text: $buySymbol)
                .autocorrectionDisabled()
                .textInputAutocapitalization(market == .cn ? .never : .characters)
        }
        sharesSection
    }

    // MARK: - Sell Form

    @ViewBuilder
    private var sellForm: some View {
        if let (sym, name, pos) = sellTuple {
            Section("持仓信息") {
                LabeledContent("股票", value: "\(name.isEmpty ? sym : name) (\(sym))")
                LabeledContent("现价", value: "\(currency)\(String(format: "%.2f", pos.currentPrice))")
                LabeledContent("均价", value: "\(currency)\(String(format: "%.2f", pos.avgCost))")
                LabeledContent("持有 / 可卖", value: "\(pos.sharesInt) / \(pos.availableSharesInt)股")
                if pos.availableSharesInt < pos.sharesInt {
                    Text(market == .cn ? "T+1：今日买入部分明日可卖" : "T+2：部分持仓尚未结算")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }
            }
        }
        sharesSection
        if let amt = estimatedAmount, let pos = sellTuple?.2 {
            Section("预计") {
                LabeledContent("成交金额", value: "\(currency)\(String(format: "%.2f", amt))")
                if market == .cn {
                    LabeledContent("手续费约", value: "¥\(String(format: "%.2f", max(5, amt * 0.0013)))")
                }
                let pl = amt - pos.avgCost * Double(shares)
                LabeledContent("盈亏约", value: "\(pl >= 0 ? "+" : "")\(String(format: "%.2f", pl))")
                    .foregroundStyle(Theme.changeColor(pl, market: market))
            }
        }
    }

    // MARK: - Shares Stepper

    private var sharesSection: some View {
        Section(market == .cn ? "股数（100的整数倍）" : "股数") {
            let upperBound = isBuy ? 1_000_000 : max(minStep, maxSell)
            Stepper(value: $shares, in: minStep...upperBound, step: minStep) {
                Text("\(shares) 股")
            }
            HStack {
                Text("手动输入")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                TextField("股数", text: $sharesText)
                    .keyboardType(.numberPad)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 80)
                    .onChange(of: sharesText) { (_, v) in
                        guard let n = Int(v), n > 0 else { return }
                        if market == .cn && isBuy {
                            shares = max(minStep, (n / 100) * 100)
                        } else {
                            shares = n
                        }
                    }
            }
        }
    }
}
