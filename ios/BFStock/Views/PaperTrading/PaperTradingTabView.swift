import SwiftUI

struct PaperTradingTabView: View {
    @StateObject private var vm = PaperTradingViewModel()
    @State private var selectedMarket: Market = .us
    @State private var selectedGame: String?          // a competition's id; nil shows the personal account
    @State private var order: OrderSheetItem?
    @State private var showLeaderboard = false
    @State private var showGames = false
    @State private var showResetConfirm = false
    @State private var showLeaveConfirm = false
    @State private var showTradeToast = false
    @State private var showNickname = false
    @State private var nickDraft = ""

    private let haptic = UINotificationFeedbackGenerator()

    private var game: PaperGame? {
        guard let id = selectedGame else { return nil }
        return vm.account?.games?.first { $0.id == id } ?? (vm.gameAccount?.game.id == id ? vm.gameAccount?.game : nil)
    }
    private var market: Market { game?.marketValue ?? selectedMarket }
    /// The portfolio on screen: a market account or the selected competition
    private var current: PaperMarketAccount? {
        if let id = selectedGame { return vm.gameAccount?.game.id == id ? vm.gameAccount?.view : nil }
        return vm.account?.view(selectedMarket)
    }
    private var perfKey: String { selectedGame.map { "g:\($0)" } ?? selectedMarket.rawValue }
    private var ended: Bool { game?.status == "ended" }

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
            .background(DS.bg.ignoresSafeArea())
            .navigationTitle("tab.paper_trading")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbarItems }
        }
        .task { await vm.loadAccount() }
        .task(id: selectedGame) {
            if let id = selectedGame { await vm.loadGame(id) } else { vm.gameAccount = nil }
        }
        .task(id: "\(perfKey)|\(current?.cash ?? 0)|\(current?.transactions.count ?? 0)") {
            await vm.loadPerformance(market: market, gameId: selectedGame)
        }
        .task {
            // Waiting orders fill in the background; keep the page current while it is open
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 30_000_000_000)
                if !Task.isCancelled, !(current?.openOrders.isEmpty ?? true) { await vm.refresh() }
            }
        }
        .sheet(item: $order) { item in
            let gid = selectedGame, m = market
            TradeSheet(market: m, initialSide: item.side, view: current, initialSymbol: item.symbol, initialKind: item.kind) { draft in
                Task { await vm.placeOrder { draft.body(deviceId: $0, market: m, gameId: gid) } }
            }
        }
        .sheet(isPresented: $showLeaderboard) {
            LeaderboardView(vm: vm, market: selectedMarket)
        }
        .sheet(isPresented: $showGames) {
            GameSheet(vm: vm, nickname: vm.account?.nickname) { g in selectedGame = g.id }
        }
        .alert(L("你的昵称"), isPresented: $showNickname) {
            TextField(L("你的昵称"), text: $nickDraft)
            Button(L("保存")) {
                let name = nickDraft.trimmingCharacters(in: .whitespaces)
                Task { if let err = await vm.setNickname(name) { vm.tradeError = err } }
            }
            Button("取消", role: .cancel) {}
        }
        .alert("确认重置账户", isPresented: $showResetConfirm) {
            Button("重置", role: .destructive) { Task { await vm.resetAccount() } }
            Button("取消", role: .cancel) {}
        } message: {
            Text("所有持仓和交易记录将清除，四个账户恢复初始资金：美股 $10万、A股 100万元、港股 HK$100万、日股 ¥1000万。")
        }
        .alert(game.map { "\(L(($0.isOwner ?? false) ? "删除比赛" : "退出比赛")) · \($0.name)" } ?? "", isPresented: $showLeaveConfirm) {
            Button(L((game?.isOwner ?? false) ? "删除比赛" : "退出比赛"), role: .destructive) {
                guard let g = game else { return }
                selectedGame = nil
                selectedMarket = g.marketValue
                Task { await vm.leaveGame(g) }
            }
            Button("取消", role: .cancel) {}
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
        .onChange(of: vm.gameError) { (_, err) in
            if err != nil { selectedGame = nil }
        }
        .overlay(alignment: .top) {
            if showTradeToast, let result = vm.tradeResult {
                TradeToast(message: result.message, isSuccess: result.success)
                    .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 3) { showTradeToast = false } }
                    .padding(.top, 8)
            }
        }
        .alert("交易失败", isPresented: Binding(
            get: { vm.tradeError != nil || vm.gameError != nil },
            set: { if !$0 { vm.tradeError = nil; vm.gameError = nil } }
        )) {
            Button("确定", role: .cancel) {}
        } message: {
            Text(vm.tradeError ?? vm.gameError ?? "")
        }
    }

    // MARK: - Main body

    @ViewBuilder
    private func accountBody(_ account: PaperAccount) -> some View {
        ScrollView {
            VStack(spacing: 22) {
                // The switch drives the whole page (account card, positions, trades), so it sits on top
                VStack(alignment: .leading, spacing: 10) {
                    MarketSegmentControl(selection: Binding(get: { selectedMarket },
                                                            set: { selectedMarket = $0; selectedGame = nil }),
                                         order: [.us, .cn, .hk, .jp])
                    gameChips(account.games ?? [])
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                if let game { GameHeaderCard(game: game) { showLeaveConfirm = true } }

                if let v = current {
                    AccountHeaderView(title: game?.name ?? L([.us: "美股账户", .cn: "A股账户", .hk: "港股账户", .jp: "日股账户"][market] ?? ""),
                                      view: v, market: market)
                } else if selectedGame == nil {
                    LegacyAccountHeader(account: account, market: market)
                } else {
                    ProgressView().frame(maxWidth: .infinity, minHeight: 180)
                }

                if game == nil, let missions = account.missions, !missions.isEmpty {
                    MissionsSection(missions: missions) { missionAction($0, account: account) }
                }

                if let perf = vm.performance[perfKey], perf.points.count > 1 {
                    PerformanceSection(perf: perf, market: market)
                }

                if let v = current, !v.openOrders.isEmpty { openOrdersList(v.openOrders) }

                positionsList(current?.portfolio ?? account.positions(market))

                if let shorts = current?.shorts, !shorts.isEmpty { shortsList(shorts) }

                if game != nil, let board = vm.gameAccount?.leaderboard, !board.isEmpty { standings(board) }

                transactionsList(current?.transactions ?? account.transactions(market))
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 96)
        }
        .refreshable { await vm.refresh() }
        .overlay(alignment: .bottomTrailing) {
            if !ended {
                buyFAB
                    .padding(.trailing, 20)
                    .padding(.bottom, 16)
            }
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

    // MARK: - Learning missions

    /// A mission's button: open the ticket (or dialog) set up for that step.
    private func missionAction(_ m: PaperMission, account: PaperAccount) {
        switch m.action {
        case "nickname":
            nickDraft = account.nickname.hasPrefix("用户#") ? "" : account.nickname
            showNickname = true
        case "game":
            showGames = true
        case "market":
            let traded = { (mk: Market) in !(account.view(mk)?.transactions.isEmpty ?? true) }
            selectedGame = nil
            selectedMarket = [Market.us, .cn, .hk, .jp].first { !traded($0) && $0 != selectedMarket } ?? .cn
        case "short":
            selectedGame = nil
            selectedMarket = .us
            order = OrderSheetItem(side: .short, symbol: nil)
        case "protect":
            if let held = current?.portfolio.first {
                order = OrderSheetItem(side: .sell, symbol: held.key, kind: .stop)
            } else {
                order = OrderSheetItem(side: .buy, symbol: nil)
            }
        case "limit":
            order = OrderSheetItem(side: .buy, symbol: nil, kind: .limit)
        default:
            order = OrderSheetItem(side: .buy, symbol: nil)
        }
    }

    // MARK: - Competitions

    private func gameChips(_ games: [PaperGame]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(games) { g in
                    let on = selectedGame == g.id
                    Button { selectedGame = g.id } label: {
                        Label(g.name, systemImage: "trophy.fill")
                            .font(.caption.weight(.semibold))
                            .lineLimit(1)
                            .padding(.horizontal, 12).padding(.vertical, 7)
                            .foregroundStyle(on ? Color.white : Color.primary)
                            .background(on ? DS.accent : DS.surfaceHi, in: Capsule())
                    }
                    .buttonStyle(.plain)
                }
                Button { showGames = true } label: {
                    Label(L("比赛"), systemImage: "plus")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 12).padding(.vertical, 7)
                        .foregroundStyle(DS.accent)
                        .overlay(Capsule().strokeBorder(DS.stroke, style: StrokeStyle(lineWidth: 1, dash: [4, 3])))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func standings(_ board: [GameStanding]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L(ended ? "最终排名" : "比赛排名"))
            VStack(spacing: 0) {
                ForEach(Array(board.enumerated()), id: \.offset) { i, r in
                    HStack(spacing: 12) {
                        Text("\(i + 1)")
                            .font(.system(.subheadline, design: .rounded).weight(.bold))
                            .foregroundStyle(i < 3 ? [Color.yellow, Color.gray, Color.orange][i] : .secondary)
                            .frame(width: 24)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(r.nickname + (r.isMe ? L("（我）") : "")).font(.subheadline.weight(r.isMe ? .bold : .regular))
                            Text("\(market.currencySymbol)\(Int(r.totalValue).formatted())").font(.caption).foregroundStyle(.secondary).monospacedDigit()
                        }
                        Spacer()
                        PctPill(pct: r.returnPct, market: market)
                    }
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    .background(r.isMe ? DS.accent.opacity(0.1) : .clear)
                    if i < board.count - 1 { RowDivider() }
                }
            }
            .card(padding: 0)
        }
    }

    // MARK: - Open orders

    private func openOrdersList(_ orders: [PaperOrder]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader("\(L("委托")) · \(L("未成交"))")
            VStack(spacing: 0) {
                ForEach(Array(orders.enumerated()), id: \.element.id) { idx, o in
                    let side = OrderSide(rawValue: o.side) ?? .buy
                    HStack(spacing: 12) {
                        Text(side.badge)
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(.white)
                            .frame(width: 28, height: 28)
                            .background(side.tint, in: Circle())
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(o.symbol) · \(o.shares)").font(.subheadline.weight(.semibold))
                            Text(orderTerms(o)).font(.caption).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                        }
                        Spacer()
                        Button(L("撤单")) { Task { await vm.cancel(o, gameId: selectedGame) } }
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(.red)
                            .padding(.horizontal, 12).padding(.vertical, 6)
                            .background(DS.surfaceHi, in: Capsule())
                            .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    if idx < orders.count - 1 { RowDivider() }
                }
            }
            .card(padding: 0)
        }
    }

    private func orderTerms(_ o: PaperOrder) -> String {
        let cur = market.currencySymbol
        var parts = [(OrderKind(rawValue: o.type) ?? .market).label]
        if o.type != "market" { parts.append(o.tif == "gtc" ? L("撤单前有效") : L("当日有效")) }
        if let p = o.limitPrice { parts.append("\(L("限价")) \(cur)\(Formatters.price(p))") }
        if let p = o.stopPrice {
            parts.append("\(L("触发价")) \(cur)\(Formatters.price(p))" + (o.trailPct.map { " (\(String(format: "%g", $0))%)" } ?? ""))
        }
        return parts.joined(separator: " · ")
    }

    // MARK: - Positions List

    @ViewBuilder
    private func positionsList(_ map: [String: PaperPosition]) -> some View {
        let positions = map.sorted { $0.value.marketValue > $1.value.marketValue }

        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("持仓"))

            Group {
                if positions.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "chart.line.uptrend.xyaxis")
                            .font(.system(size: 26, weight: .semibold))
                            .foregroundStyle(DS.accent)
                            .frame(width: 56, height: 56)
                            .background(DS.accent.opacity(0.12), in: Circle())
                        Text("暂无持仓")
                            .font(.headline)
                        Text("用虚拟资金练习买卖，不承担真实风险")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                        if !ended {
                            Button {
                                order = OrderSheetItem(side: .buy, symbol: nil)
                            } label: {
                                Text("买入第一只股票")
                                    .font(.subheadline.weight(.semibold))
                                    .padding(.horizontal, 22).padding(.vertical, 10)
                                    .background(DS.accent, in: Capsule())
                                    .foregroundStyle(.white)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 30)
                    .padding(.horizontal, 16)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(positions.enumerated()), id: \.element.key) { idx, item in
                            PositionRow(symbol: item.key, position: item.value, market: market)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    if !ended { order = OrderSheetItem(side: .sell, symbol: item.key) }
                                }
                            if idx < positions.count - 1 { RowDivider() }
                        }
                    }
                }
            }
            .card(padding: 0)
        }
    }

    private func shortsList(_ map: [String: PaperShort]) -> some View {
        let rows = map.sorted { $0.key < $1.key }
        let cur = market.currencySymbol
        return VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("空头仓位"))
            VStack(spacing: 0) {
                ForEach(Array(rows.enumerated()), id: \.element.key) { idx, item in
                    let p = item.value
                    HStack {
                        Text(OrderSide.short.badge)
                            .font(.caption2.weight(.bold)).foregroundStyle(.white)
                            .frame(width: 28, height: 28)
                            .background(OrderSide.short.tint, in: Circle())
                        VStack(alignment: .leading, spacing: 3) {
                            Text(item.key).font(.subheadline.weight(.semibold))
                            Text(L("%lld股 · 均价%@", -p.sharesInt, "\(cur)\(String(format: "%.2f", p.avgPrice))"))
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 3) {
                            Text("\(cur)\(String(format: "%.2f", p.marketValue))").font(.subheadline.weight(.medium))
                            Text("\(p.profitLoss >= 0 ? "+" : "")\(String(format: "%.2f", p.profitLoss)) (\(p.profitLossPct >= 0 ? "+" : "")\(String(format: "%.2f", p.profitLossPct))%)")
                                .font(.caption)
                                .foregroundStyle(plColor(p.profitLoss, market: market))
                        }
                    }
                    .padding(.horizontal, 16).padding(.vertical, 12)
                    .contentShape(Rectangle())
                    .onTapGesture { if !ended { order = OrderSheetItem(side: .cover, symbol: item.key) } }
                    if idx < rows.count - 1 { RowDivider() }
                }
            }
            .card(padding: 0)
        }
    }

    // MARK: - Recent Transactions

    @ViewBuilder
    private func transactionsList(_ all: [PaperTransaction]) -> some View {
        let txs: [PaperTransaction] = all.reversed()

        if !txs.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                SectionHeader(L("最近交易"))
                let rows = Array(txs.prefix(10).enumerated())
                VStack(spacing: 0) {
                    ForEach(rows, id: \.offset) { idx, tx in
                        TransactionRow(tx: tx)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                        if idx < rows.count - 1 { RowDivider() }
                    }
                }
                .card(padding: 0)
            }
        }
    }

    // MARK: - FAB

    private var buyFAB: some View {
        Button {
            order = OrderSheetItem(side: .buy, symbol: nil)
        } label: {
            Image(systemName: "plus")
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(
                    LinearGradient(colors: [DS.accent, Color(r: 0x7A, g: 0x6C, b: 0xFF)],
                                   startPoint: .topLeading, endPoint: .bottomTrailing),
                    in: Circle()
                )
                .shadow(color: DS.accent.opacity(0.45), radius: 12, y: 6)
        }
        .accessibilityLabel(L("买入"))
    }

    // MARK: - Toolbar

    @ToolbarContentBuilder
    private var toolbarItems: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            Button { showResetConfirm = true } label: {
                Image(systemName: "arrow.counterclockwise")
                    .font(.caption)
            }
            .accessibilityLabel(L("重置账户"))
            .tint(.secondary)
        }
        ToolbarItem(placement: .topBarTrailing) {
            Button {
                showLeaderboard = true   // the sheet loads its own market's board
            } label: {
                Image(systemName: "trophy")
            }
            .accessibilityLabel(L("收益排行榜"))
        }
    }
}

private struct OrderSheetItem: Identifiable {
    let id = UUID()
    let side: OrderSide
    let symbol: String?
    var kind: OrderKind = .market
}

// MARK: - Learning missions

private struct MissionsSection: View {
    let missions: [PaperMission]
    let onAction: (PaperMission) -> Void
    @AppStorage("bfs_pt_missions_open") private var open = true

    var body: some View {
        let done = missions.filter(\.done).count
        let next = missions.first { !$0.done }
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("学习任务")) {
                Button(open ? L("收起") : L("展开")) { withAnimation(.snappy) { open.toggle() } }
                    .font(.caption).buttonStyle(.plain).foregroundStyle(.secondary)
            }
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 10) {
                    Text(L("已完成 %lld/%lld", done, missions.count)).font(.caption).foregroundStyle(.secondary).monospacedDigit()
                    ProgressView(value: Double(done), total: Double(missions.count)).tint(DS.accent)
                }
                if open {
                    if let next {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(next.title).font(.subheadline.weight(.semibold))
                            Text(next.body).font(.caption).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                            if next.action != nil {
                                Button { onAction(next) } label: {
                                    Text(L("去完成")).font(.footnote.weight(.semibold))
                                        .padding(.horizontal, 14).padding(.vertical, 7)
                                        .foregroundStyle(.white).background(DS.accent, in: Capsule())
                                }
                                .buttonStyle(.plain).padding(.top, 2)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(DS.accent.opacity(0.1), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        ForEach(missions.filter { $0.id != next.id }) { m in
                            HStack(spacing: 8) {
                                Image(systemName: m.done ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(m.done ? DS.accent : Color.secondary)
                                Text(m.title).font(.footnote).strikethrough(m.done).foregroundStyle(m.done ? .secondary : .primary)
                            }
                        }
                    } else {
                        Text(L("全部完成！你已经掌握了模拟交易的基本功。")).font(.footnote).foregroundStyle(.secondary)
                    }
                }
            }
            .card()
        }
    }
}

// MARK: - Competition header

private struct GameHeaderCard: View {
    let game: PaperGame
    let onLeave: () -> Void
    @State private var copied = false

    private var daysLeft: Int {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "Asia/Shanghai")
        guard let end = f.date(from: game.endDate) else { return 0 }
        // The competition closes at 23:59 Beijing time on its end date (same count as the website)
        return max(0, Int((end.addingTimeInterval(86_340).timeIntervalSinceNow / 86_400).rounded(.up)))
    }

    var body: some View {
        let ended = game.status == "ended"
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(game.name).font(.headline).lineLimit(1)
                Spacer()
                Text(ended ? L("已结束") : game.status == "upcoming" ? L("未开始") : L("进行中"))
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .foregroundStyle(ended ? Color.secondary : Color.green)
                    .background((ended ? Color.secondary : Color.green).opacity(0.14), in: Capsule())
            }
            Text("\(game.marketValue.label) · \(L("%lld 人参加", game.members)) · \(ended ? game.endDate : L("%lld 天后结束", daysLeft))")
                .font(.caption)
                .foregroundStyle(.secondary)
            HStack(spacing: 8) {
                Text(game.code)
                    .font(.system(.title3, design: .monospaced).weight(.bold))
                    .tracking(3)
                    .textSelection(.enabled)
                Spacer()
                Button {
                    UIPasteboard.general.string = "\(game.name) · \(L("邀请码")) \(game.code) · https://bestfriendstock.com/paper"
                    copied = true
                } label: {
                    Text(copied ? L("已复制") : L("复制邀请"))
                        .font(.footnote.weight(.semibold))
                        .padding(.horizontal, 12).padding(.vertical, 6)
                        .foregroundStyle(DS.accent)
                        .background(DS.accent.opacity(0.14), in: Capsule())
                }
                .buttonStyle(.plain)
                Button(action: onLeave) {
                    Text(L((game.isOwner ?? false) ? "删除比赛" : "退出比赛"))
                        .font(.footnote.weight(.semibold))
                        .padding(.horizontal, 12).padding(.vertical, 6)
                        .foregroundStyle(.red)
                        .background(DS.surfaceHi, in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .card()
    }
}

// MARK: - Join / create a competition

private struct GameSheet: View {
    @ObservedObject var vm: PaperTradingViewModel
    let nickname: String?
    let onJoined: (PaperGame) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var mode = 0              // 0 join, 1 create
    @State private var code = ""
    @State private var name = ""
    @State private var market: Market = .us
    @State private var cash: Double = 100_000
    @State private var end = Calendar.current.date(byAdding: .day, value: 30, to: .now) ?? .now
    @State private var allowShort = false
    @State private var nick = ""
    @State private var busy = false
    @State private var error: String?

    private static let cashChoices: [Market: [Double]] = [
        .us: [10_000, 100_000, 1_000_000], .cn: [100_000, 1_000_000, 10_000_000],
        .hk: [100_000, 1_000_000, 10_000_000], .jp: [1_000_000, 10_000_000, 100_000_000],
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("创建一场比赛，把邀请码发给同学，大家用同样的本金在同一个市场比收益。")
                        .font(.footnote).foregroundStyle(.secondary)
                    Picker("", selection: $mode) {
                        Text(L("加入比赛")).tag(0)
                        Text(L("创建比赛")).tag(1)
                    }
                    .pickerStyle(.segmented)
                }
                if mode == 0 {
                    Section(L("邀请码")) {
                        TextField("ABC123", text: $code)
                            .font(.system(.title2, design: .monospaced).weight(.bold))
                            .textInputAutocapitalization(.characters)
                            .autocorrectionDisabled()
                            .onChange(of: code) { _, v in
                                let clean = String(v.uppercased().filter { $0.isASCII && ($0.isLetter || $0.isNumber) }.prefix(6))
                                if clean != v { code = clean }
                            }
                    }
                } else {
                    Section {
                        TextField(L("比赛名称"), text: $name)
                        Picker(L("市场"), selection: $market) {
                            ForEach([Market.us, .cn, .hk, .jp], id: \.self) { Text($0.label).tag($0) }
                        }
                        .onChange(of: market) { _, m in
                            cash = Self.cashChoices[m]?[1] ?? cash
                            if m != .us { allowShort = false }
                        }
                        Picker(L("每人本金"), selection: $cash) {
                            ForEach(Self.cashChoices[market] ?? [], id: \.self) { c in
                                Text("\(market.currencySymbol)\(Int(c).formatted())").tag(c)
                            }
                        }
                        DatePicker(L("结束日期"), selection: $end,
                                   in: (Calendar.current.date(byAdding: .day, value: 1, to: .now) ?? .now)...(Calendar.current.date(byAdding: .day, value: 365, to: .now) ?? .now),
                                   displayedComponents: .date)
                        if market == .us { Toggle(L("允许卖空（仅美股）"), isOn: $allowShort) }
                    }
                }
                Section(L("你的昵称")) {
                    TextField(L("你的昵称"), text: $nick)
                }
                if let error {
                    Section { Text(error).foregroundStyle(.red).font(.footnote) }
                }
            }
            .navigationTitle(L("比赛"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(mode == 0 ? L("加入比赛") : L("创建比赛")) { Task { await submit() } }
                        .disabled(busy || (mode == 0 ? code.count != 6 : name.trimmingCharacters(in: .whitespaces).count < 2))
                }
            }
            .onAppear { if let n = nickname, !n.hasPrefix("用户#"), nick.isEmpty { nick = n } }
        }
    }

    private func submit() async {
        busy = true
        error = nil
        defer { busy = false }
        let n = nick.trimmingCharacters(in: .whitespaces)
        do {
            let g: PaperGame
            if mode == 0 {
                g = try await vm.joinGame(code: code, nickname: n.isEmpty ? nil : n)
            } else {
                let f = DateFormatter()
                f.dateFormat = "yyyy-MM-dd"
                f.locale = Locale(identifier: "en_US_POSIX")
                let endStr = f.string(from: end)
                g = try await vm.createGame { id in
                    GameCreateBody(deviceId: id, name: name, market: market.rawValue, startCash: cash, endDate: endStr,
                                   allowShort: allowShort, nickname: n.isEmpty ? nil : n)
                }
            }
            onJoined(g)
            dismiss()
        } catch let e as APIError {
            error = e.errorDescription
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Account Header

private struct AccountHeaderView: View {
    let title: String
    let view: PaperMarketAccount
    let market: Market

    var body: some View {
        let profit = view.totalValue - (view.initial ?? (view.returnPct > -100 ? view.totalValue / (1 + view.returnPct / 100) : 0))
        let day = view.analytics?.dayChange ?? 0
        AccountCard(title: title, rank: view.rank ?? -1, totalValue: view.totalValue, returnPct: view.returnPct, market: market, cells: [
            (L("可用购买力"), money(view.buyingPower ?? view.cash), nil),
            (L("今日盈亏"), signed(day), abs(day) < 0.5 ? nil : Theme.changeColor(day, market: market)),
            (L("总盈亏"), signed(profit), abs(profit) < 0.5 ? nil : Theme.changeColor(profit, market: market)),
        ])
    }

    private func money(_ v: Double) -> String {
        market.currencySymbol + v.formatted(.number.precision(.fractionLength(0)).grouping(.automatic))
    }
    private func signed(_ v: Double) -> String { (abs(v) < 0.5 ? "" : (v > 0 ? "+" : "-")) + money(abs(v)) }
}

/// For a backend without the per-market `markets` block
private struct LegacyAccountHeader: View {
    let account: PaperAccount
    let market: Market

    var body: some View {
        let total = account.totalValue(market), ret = account.returnPct(market), cash = account.cash(market)
        let profit = total - (ret > -100 ? total / (1 + ret / 100) : 0)
        let money = { (v: Double) in market.currencySymbol + v.formatted(.number.precision(.fractionLength(0)).grouping(.automatic)) }
        AccountCard(title: L([.us: "美股账户", .cn: "A股账户", .hk: "港股账户", .jp: "日股账户"][market] ?? ""), rank: account.rank(market),
                    totalValue: total, returnPct: ret, market: market, cells: [
            (L("可用现金"), money(cash), nil),
            (L("持仓市值"), money(max(total - cash, 0)), nil),
            (L("总盈亏"), (abs(profit) < 0.5 ? "" : (profit > 0 ? "+" : "-")) + money(abs(profit)),
             abs(profit) < 0.5 ? nil : Theme.changeColor(profit, market: market)),
        ])
    }
}

private struct AccountCard: View {
    let title: String
    let rank: Int
    let totalValue: Double
    let returnPct: Double
    let market: Market
    let cells: [(String, String, Color?)]

    var body: some View {
        let color = returnPct == 0 ? DS.accent : plColor(returnPct, market: market)
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                Spacer()
                // Rank; hidden until the account has traded in this market
                if rank > 0 {
                    Label("#\(rank)", systemImage: "trophy.fill")
                        .font(.system(.caption, design: .rounded).weight(.semibold))
                        .foregroundStyle(DS.accent)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(DS.accent.opacity(0.14), in: Capsule())
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(market.currencySymbol)
                        .font(.system(.title2, design: .serif).weight(.medium))
                        .foregroundStyle(.secondary)
                    Text(totalValue, format: .number.precision(.fractionLength(2)))
                        .font(.system(size: 40, weight: .medium, design: .serif))
                        .monospacedDigit()
                        .contentTransition(.numericText(value: totalValue))
                        .animation(.snappy(duration: 0.5), value: totalValue)
                        .minimumScaleFactor(0.55)
                        .lineLimit(1)
                }
                HStack(spacing: 8) {
                    PctPill(pct: returnPct, market: market, minWidth: 0).fixedSize()
                    Text("总收益率")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            HStack(spacing: 0) {
                ForEach(Array(cells.enumerated()), id: \.offset) { i, c in
                    if i > 0 { Rectangle().fill(DS.stroke).frame(width: 1, height: 30) }
                    StatCell(label: c.0, value: c.1, tint: c.2)
                }
            }
            .padding(.vertical, 12)
            .background(DS.surfaceHi.opacity(0.8), in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            RoundedRectangle(cornerRadius: DS.radius + 4, style: .continuous)
                .fill(LinearGradient(colors: [color.opacity(0.20), DS.surface, DS.surface],
                                     startPoint: .topLeading, endPoint: .bottomTrailing))
        }
        .overlay(RoundedRectangle(cornerRadius: DS.radius + 4, style: .continuous).strokeBorder(DS.stroke))
    }
}

private struct StatCell: View {
    let label: String
    let value: String
    var tint: Color? = nil
    var body: some View {
        VStack(spacing: 2) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.system(.subheadline, design: .rounded).weight(.semibold)).monospacedDigit()
                .foregroundStyle(tint ?? .primary)
                .minimumScaleFactor(0.7).lineLimit(1)
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
                Text(L("%lld股 · 均价%@", position.sharesInt, "\(market.currencySymbol)\(String(format: "%.2f", position.avgCost))"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 3) {
                Text("\(market.currencySymbol)\(String(format: "%.2f", position.marketValue))")
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
    }
}

// MARK: - Transaction Row

private struct TransactionRow: View {
    let tx: PaperTransaction
    private var side: OrderSide { OrderSide(rawValue: tx.type) ?? .sell }
    private var currency: String { (Market(rawValue: tx.market) ?? .us).currencySymbol }

    private static let corpLabel = ["dividend": "分红", "split": "拆股", "bonus": "送转"]
    private static let corpBadge = ["dividend": "息", "split": "拆", "bonus": "送"]

    var body: some View {
        if tx.isCorporateAction { corporateRow } else { tradeRow }
    }

    private var corporateRow: some View {
        HStack {
            Text(L(Self.corpBadge[tx.type] ?? "息"))
                .font(.caption2.weight(.bold))
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(Color(r: 0x0E, g: 0xA5, b: 0xE9), in: Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text("\(L(Self.corpLabel[tx.type] ?? "分红")) · \(tx.name.isEmpty ? tx.symbol : tx.name)")
                    .font(.subheadline)
                    .lineLimit(1)
                Text(tx.type == "dividend" ? L("每股 %@", "\(currency)\(String(format: "%.2f", tx.price))")
                     : "\(tx.ratio ?? "") · \(tx.shares > 0 ? "+" : "")\(L("%lld股", tx.sharesInt))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                if tx.amount != 0 {
                    Text("\(tx.amount > 0 ? "+" : "-")\(currency)\(String(format: "%.2f", abs(tx.amount)))")
                        .font(.subheadline)
                        .foregroundStyle(Theme.changeColor(tx.amount, market: Market(rawValue: tx.market) ?? .us))
                }
                Text(tx.date).font(.caption2).foregroundStyle(.tertiary)
            }
        }
    }

    private var tradeRow: some View {
        HStack {
            Text(side.badge)
                .font(.caption2.weight(.bold))
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(side == .sell ? Color.secondary.opacity(0.6) : side.tint, in: Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(tx.name.isEmpty ? tx.symbol : tx.name)
                    .font(.subheadline)
                    .lineLimit(1)
                Text(L("%lld股 @ %@", tx.sharesInt, "\(currency)\(String(format: "%.2f", tx.price))"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(currency)\(String(format: "%.2f", tx.amount))")
                    .font(.subheadline)
                if let pl = tx.profitLoss {
                    Text("\(pl >= 0 ? "+" : "")\(String(format: "%.2f", pl))")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(Theme.changeColor(pl, market: Market(rawValue: tx.market) ?? .us))
                } else {
                    Text(tx.date)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
        }
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
