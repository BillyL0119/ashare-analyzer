import SwiftUI

struct PaperTradingTabView: View {
    @StateObject private var vm = PaperTradingViewModel()
    @State private var selectedMarket: Market = .cn
    @State private var showBuySheet = false
    @State private var showLeaderboard = false
    @State private var sellItem: SellSheetItem?
    @State private var showResetConfirm = false
    @State private var showTradeToast = false

    private let haptic = UINotificationFeedbackGenerator()

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading && vm.account == nil {
                    ProgressView(String(localized: "loading"))
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let err = vm.error, vm.account == nil {
                    ErrorRetryView(message: err) { Task { await vm.loadAccount() } }
                } else if let account = vm.account {
                    accountBody(account)
                }
            }
            .navigationTitle("tab.paper_trading")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbarItems }
        }
        .task { await vm.loadAccount() }
        .sheet(isPresented: $showBuySheet) {
            TradeSheet(market: selectedMarket, mode: .buy) { symbol, shares, market in
                Task { await vm.buy(symbol: symbol, shares: shares, market: market) }
            }
        }
        .sheet(item: $sellItem) { item in
            TradeSheet(market: item.market, mode: .sell(item.symbol, item.name, item.position)) { symbol, shares, market in
                Task { await vm.sell(symbol: symbol, shares: shares, market: market) }
            }
        }
        .sheet(isPresented: $showLeaderboard) {
            LeaderboardView(vm: vm)
        }
        .alert("确认重置账户", isPresented: $showResetConfirm) {
            Button("重置", role: .destructive) { Task { await vm.resetAccount() } }
            Button("取消", role: .cancel) {}
        } message: {
            Text("所有持仓和交易记录将清除，初始资金将恢复至 100万元（A股）/ $10万（美股）。")
        }
        .onChange(of: vm.tradeResult) { (_, result) in
            if result != nil {
                showTradeToast = true
                haptic.notificationOccurred(.success)
            }
        }
        .onChange(of: vm.tradeError) { (_, err) in
            if err != nil { haptic.notificationOccurred(.error) }
        }
        .overlay(alignment: .top) {
            if showTradeToast, let result = vm.tradeResult {
                TradeToast(message: result.message, isSuccess: result.success)
                    .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 3) { showTradeToast = false } }
                    .padding(.top, 8)
            }
        }
        .alert("交易失败", isPresented: Binding(
            get: { vm.tradeError != nil },
            set: { if !$0 { vm.tradeError = nil } }
        )) {
            Button("确定", role: .cancel) {}
        } message: {
            Text(vm.tradeError ?? "")
        }
    }

    // MARK: - Main body

    @ViewBuilder
    private func accountBody(_ account: PaperAccount) -> some View {
        ScrollView {
            VStack(spacing: 0) {
                AccountHeaderView(account: account, market: selectedMarket)
                    .padding(.horizontal)
                    .padding(.top, 12)

                marketPicker
                    .padding(.vertical, 10)

                positionsList(account)
                    .padding(.horizontal)

                transactionsList(account)
                    .padding(.horizontal)
                    .padding(.bottom, 24)
            }
        }
        .refreshable { await vm.loadAccount() }
        .overlay(alignment: .bottomTrailing) {
            buyFAB
                .padding(.trailing, 20)
                .padding(.bottom, 16)
        }
        .overlay {
            if vm.isTradingBusy {
                ZStack {
                    Color.black.opacity(0.35).ignoresSafeArea()
                    VStack(spacing: 12) {
                        ProgressView()
                            .scaleEffect(1.4)
                            .tint(.white)
                        Text("交易处理中…")
                            .font(.subheadline)
                            .foregroundStyle(.white)
                    }
                    .padding(28)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                }
                .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: vm.isTradingBusy)
    }

    // MARK: - Market Picker

    private var marketPicker: some View {
        Picker("市场", selection: $selectedMarket) {
            Text("A股").tag(Market.cn)
            Text("美股").tag(Market.us)
        }
        .pickerStyle(.segmented)
        .padding(.horizontal)
    }

    // MARK: - Positions List

    @ViewBuilder
    private func positionsList(_ account: PaperAccount) -> some View {
        let positions: [(String, PaperPosition)] = selectedMarket == .cn
            ? account.portfolio.sorted(by: { $0.key < $1.key })
            : account.usPortfolio.sorted(by: { $0.key < $1.key })

        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("持仓").font(.headline)
                Spacer()
                if !positions.isEmpty {
                    Text("\(positions.count) 只").font(.caption).foregroundStyle(.secondary)
                }
            }
            .padding(.bottom, 4)

            if positions.isEmpty {
                Text("暂无持仓，点击 + 买入第一只股票")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
            } else {
                ForEach(positions, id: \.0) { symbol, pos in
                    PositionRow(symbol: symbol, position: pos, market: selectedMarket)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            sellItem = SellSheetItem(symbol: symbol, name: symbol, position: pos, market: selectedMarket)
                        }
                }
            }
        }
    }

    // MARK: - Recent Transactions

    @ViewBuilder
    private func transactionsList(_ account: PaperAccount) -> some View {
        let txs: [PaperTransaction] = selectedMarket == .cn
            ? account.transactions.reversed()
            : account.usTransactions.reversed()

        if !txs.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("最近交易").font(.headline).padding(.top, 16)
                ForEach(txs.prefix(10)) { tx in
                    TransactionRow(tx: tx)
                }
            }
        }
    }

    // MARK: - FAB

    private var buyFAB: some View {
        Button {
            showBuySheet = true
        } label: {
            Image(systemName: "plus")
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(Color.accentColor)
                .clipShape(Circle())
                .shadow(color: .black.opacity(0.2), radius: 6, y: 3)
        }
    }

    // MARK: - Toolbar

    @ToolbarContentBuilder
    private var toolbarItems: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            Button { showResetConfirm = true } label: {
                Image(systemName: "arrow.counterclockwise")
                    .font(.caption)
            }
            .tint(.secondary)
        }
        ToolbarItem(placement: .topBarTrailing) {
            Button {
                showLeaderboard = true
                Task { await vm.loadLeaderboard() }
            } label: {
                Image(systemName: "trophy")
            }
        }
    }
}

// MARK: - SellSheetItem (Identifiable wrapper)

private struct SellSheetItem: Identifiable {
    let id = UUID()
    let symbol: String
    let name: String
    let position: PaperPosition
    let market: Market
}

// MARK: - Account Header

private struct AccountHeaderView: View {
    let account: PaperAccount
    let market: Market

    private var totalValue: Double { market == .cn ? account.totalValue : account.usTotalValue }
    private var returnPct: Double  { market == .cn ? account.returnPct  : account.usReturnPct  }
    private var cash: Double       { market == .cn ? account.cash       : account.usCash       }
    private var currency: String   { market == .cn ? "¥" : "$" }
    private var isUp: Bool         { returnPct >= 0 }

    var body: some View {
        VStack(spacing: 12) {
            VStack(spacing: 4) {
                Text(market == .cn ? "A股账户" : "美股账户")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(currency)
                        .font(.title3)
                        .foregroundStyle(.secondary)
                    Text(totalValue, format: .number.precision(.fractionLength(2)))
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .minimumScaleFactor(0.55)
                        .lineLimit(1)
                }
                HStack(spacing: 8) {
                    Text(returnPct >= 0 ? "+\(String(format: "%.2f", returnPct))%" : "\(String(format: "%.2f", returnPct))%")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(plColor(returnPct, market: market))
                    Text("排名 #\(account.rank)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            HStack {
                StatCell(label: "可用现金", value: "\(currency)\(String(format: "%.0f", cash))")
                Divider().frame(height: 32)
                StatCell(label: "仅供学习", value: "不构成投资建议")
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 10)
            .background(Color.secondary.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .padding(.vertical, 4)
    }
}

private struct StatCell: View {
    let label: String
    let value: String
    var body: some View {
        VStack(spacing: 2) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.subheadline.weight(.medium))
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Position Row

private struct PositionRow: View {
    let symbol: String
    let position: PaperPosition
    let market: Market

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text(symbol)
                    .font(.subheadline.weight(.semibold))
                Text("\(position.sharesInt)股 · 均价\(market == .cn ? "¥" : "$")\(String(format: "%.2f", position.avgCost))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 3) {
                Text("\(market == .cn ? "¥" : "$")\(String(format: "%.2f", position.marketValue))")
                    .font(.subheadline.weight(.medium))
                HStack(spacing: 2) {
                    Text(position.profitLoss >= 0 ? "+" : "")
                    Text(position.profitLoss, format: .number.precision(.fractionLength(2)))
                    Text("(\(position.profitLossPct >= 0 ? "+" : "")\(String(format: "%.2f", position.profitLossPct))%)")
                }
                .font(.caption)
                .foregroundStyle(plColor(position.profitLossPct, market: market))
            }
        }
        .padding(12)
        .background(Color.secondary.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

// MARK: - Transaction Row

private struct TransactionRow: View {
    let tx: PaperTransaction
    private var currency: String { tx.market == "cn" ? "¥" : "$" }

    var body: some View {
        HStack {
            Text(tx.isBuy ? "买" : "卖")
                .font(.caption.weight(.bold))
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(tx.isBuy ? Color.accentColor : Color.secondary)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(tx.name.isEmpty ? tx.symbol : tx.name)
                    .font(.subheadline)
                Text("\(tx.sharesInt)股 @ \(currency)\(String(format: "%.2f", tx.price))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(currency)\(String(format: "%.2f", tx.amount))")
                    .font(.subheadline)
                Text(tx.date)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 4)
    }
}

extension PaperTransaction {
    var sharesInt: Int { Int(shares) }
}

// MARK: - Trade Toast

private struct TradeToast: View {
    let message: String
    let isSuccess: Bool

    var body: some View {
        Text(message)
            .font(.subheadline)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(isSuccess ? Color.green.opacity(0.9) : Color.red.opacity(0.9))
            .foregroundStyle(.white)
            .clipShape(Capsule())
            .shadow(radius: 4)
            .transition(.move(edge: .top).combined(with: .opacity))
            .animation(.spring, value: message)
    }
}

// MARK: - P&L color helper

private func plColor(_ pct: Double, market: Market) -> Color {
    Theme.changeColor(pct, market: market)
}
