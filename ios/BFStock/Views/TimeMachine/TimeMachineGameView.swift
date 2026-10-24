import SwiftUI
import Charts

/// One scenario: move forward a day or a week at a time, trade at the day's close, and see how it ended.
struct TimeMachineGameView: View {
    @ObservedObject var vm: TimeMachineViewModel
    let scenarioID: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Group {
            if let run = vm.run, run.scenario.id == scenarioID {
                TMGame(vm: vm, run: run) { dismiss() }
            } else if let err = vm.openError {
                ErrorRetryView(message: err) { Task { await vm.open(scenarioID, fresh: false) } }
                    .frame(maxHeight: .infinity)
            } else {
                ProgressView(String(localized: "loading"))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle(vm.run?.scenario.title ?? L("历史穿越交易"))
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Game

private struct TMGame: View {
    @ObservedObject var vm: TimeMachineViewModel
    let run: TMRun
    let onBack: () -> Void

    @State private var selected: String?
    @State private var qty = ""
    @State private var confirmEnd = false
    @State private var confirmRestart = false
    @FocusState private var qtyFocused: Bool

    private var m: Market { run.scenario.marketValue }
    private var lot: Int { max(1, run.scenario.lot) }
    private var dayNo: Int { run.day + 1 }
    private var inst: TMInstrument? {
        let sym = selected ?? run.scenario.benchmark
        return run.instruments.first { $0.symbol == sym } ?? run.instruments.first
    }
    private func name(_ symbol: String) -> String {
        run.instruments.first { $0.symbol == symbol }?.name ?? symbol
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 18) {
                    header.id("top")
                    if run.finished, let r = run.result {
                        TMResultCard(run: run, result: r, board: vm.board, busy: vm.busy,
                                     onReplay: { Task { await vm.restart() } }, onBack: onBack)
                    }
                    statTiles
                    chips
                    if let inst { instrumentCard(inst).id("chart") }
                    if run.portfolio.values.count > 1 { portfolioCard }
                    holdingsCard(proxy)
                    newsCard
                    Text(L("价格为当时真实的每日收盘价（美股：新浪财经；A股：腾讯财经），A股分红送转按除权日发放；美股未计入现金分红。新闻为有据可查的公开事件。仅供学习。"))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 4)
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: run.finished) { _, finished in
                if finished { withAnimation { proxy.scrollTo("top", anchor: .top) } }
            }
        }
        .safeAreaInset(edge: .bottom) {
            // Hidden while typing a share count: the keyboard's Done button would cover it
            if !run.finished && !qtyFocused { controlBar }
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button(L("完成")) { qtyFocused = false }
            }
        }
        .alert(L("跳到结束"), isPresented: $confirmEnd) {
            Button(L("跳到结束"), role: .destructive) { Task { await vm.advance(9999) } }
            Button("取消", role: .cancel) {}
        } message: {
            Text(L("直接跳到这段历史的最后一天并揭晓结果吗？之后不能再交易。"))
        }
        .alert(L("重新开始"), isPresented: $confirmRestart) {
            Button(L("重新开始"), role: .destructive) { Task { await vm.restart() } }
            Button("取消", role: .cancel) {}
        } message: {
            Text(L("重新开始会清空这一局的持仓和记录，确定吗？"))
        }
        .task(id: run.finished) {
            if run.finished { await vm.loadBoard() }
        }
        .sensoryFeedback(.impact(weight: .light), trigger: run.date)
        .sensoryFeedback(.success, trigger: vm.trades)
        .sensoryFeedback(.error, trigger: vm.error) { _, new in new != nil }
    }

    // MARK: Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(TMDate.long(run.date))
                .font(.title3.weight(.bold))
            HStack(spacing: 10) {
                Text(L("第 %lld / %lld 天", dayNo, run.scenario.nDays))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
                ProgressView(value: Double(min(dayNo, run.scenario.nDays)), total: Double(max(run.scenario.nDays, 1)))
                    .tint(DS.accent)
                if !run.finished {
                    Button(L("重新开始")) { confirmRestart = true }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .buttonStyle(.plain)
                }
            }
            let fresh = run.events.filter(\.new)
            if !fresh.isEmpty && !run.finished {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(fresh.prefix(3)) { e in
                        HStack(alignment: .firstTextBaseline, spacing: 8) {
                            Image(systemName: "newspaper.fill").foregroundStyle(TMFmt.news)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(TMDate.short(e.date)).font(.caption.weight(.bold))
                                Text(e.text).font(.footnote).fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(TMFmt.news.opacity(0.10), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(TMFmt.news.opacity(0.45)))
                .accessibilityElement(children: .combine)
            }
        }
        .card()
    }

    // MARK: Day controls (always in reach while scrolling)

    private var controlBar: some View {
        VStack(spacing: 8) {
            if let err = vm.error {
                Label(err, systemImage: "exclamationmark.circle.fill")
                    .font(.caption)
                    .foregroundStyle(.red)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            Text("\(L("第 %lld / %lld 天", dayNo, run.scenario.nDays)) · \(TMDate.short(run.date))")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .monospacedDigit()
            HStack(spacing: 8) {
                barButton(L("下一周"), icon: "forward.fill") { Task { await vm.advance(5) } }
                Button { Task { await vm.advance(1) } } label: {
                    HStack(spacing: 6) {
                        if vm.busy { ProgressView().tint(.white) } else { Image(systemName: "play.fill") }
                        Text(L("下一天")).lineLimit(1).minimumScaleFactor(0.8)
                    }
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, minHeight: 46)
                    .background(DS.accentGradient, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
                barButton(L("跳到结束"), icon: "forward.end.fill") { confirmEnd = true }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .background(.bar)
        .overlay(alignment: .top) { Rectangle().fill(DS.stroke).frame(height: 1) }
        .disabled(vm.busy)
    }

    private func barButton(_ title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 3) {
                Image(systemName: icon).font(.footnote.weight(.semibold))
                Text(title).font(.caption2.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.7)
            }
            .foregroundStyle(.primary)
            .frame(width: 78, height: 46)
            .background(DS.surfaceHi, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    // MARK: Stats

    private var statTiles: some View {
        let p = run.portfolio
        return Grid(horizontalSpacing: 12, verticalSpacing: 12) {
            GridRow {
                tile(L("总资产"), TMFmt.money(p.value, m, decimals: 0), nil)
                tile(L("你的收益"), TMFmt.pct(p.returnPct), TMFmt.color(p.returnPct, m))
            }
            GridRow {
                tile(L("指数基金"), TMFmt.pct(p.benchReturnPct), TMFmt.color(p.benchReturnPct, m))
                tile(L("现金"), TMFmt.money(p.cash, m, decimals: 0), nil)
            }
        }
    }

    private func tile(_ label: String, _ value: String, _ color: Color?) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.8)
            Text(value)
                .font(.system(.title3, design: .rounded).weight(.bold))
                .monospacedDigit()
                .foregroundStyle(color ?? .primary)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .card(padding: 14)
    }

    // MARK: Instruments

    private var chips: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(L("可交易品种"))
            ScrollViewReader { chipProxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(run.instruments) { i in chip(i).id(i.symbol) }
                    }
                    .padding(.horizontal, 16)
                }
                .padding(.horizontal, -16)
                .onChange(of: selected) { _, s in
                    withAnimation { chipProxy.scrollTo(s, anchor: .center) }
                }
            }
        }
    }

    private func chip(_ i: TMInstrument) -> some View {
        let on = i.symbol == inst?.symbol
        let shape = RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous)
        return Button { selected = i.symbol } label: {
            VStack(alignment: .leading, spacing: 4) {
                Text(i.name).font(.footnote.weight(.semibold)).lineLimit(1)
                HStack(spacing: 6) {
                    Text(i.price.map { TMFmt.price($0, m) } ?? "—").font(.caption).monospacedDigit()
                    Text(i.suspended ? L("停牌") : TMFmt.pct(i.changePct))
                        .font(.caption.weight(.semibold))
                        .monospacedDigit()
                        .foregroundStyle(i.suspended ? Color.secondary : TMFmt.color(i.changePct, m))
                }
                .lineLimit(1)
                .minimumScaleFactor(0.75)
            }
            .frame(width: 132, alignment: .leading)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(on ? DS.accent.opacity(0.12) : DS.surface, in: shape)
            .overlay(shape.strokeBorder(on ? DS.accent.opacity(0.6) : DS.stroke))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
    }

    private func instrumentCard(_ i: TMInstrument) -> some View {
        let first = i.closes.indices.contains(run.startIndex) ? i.closes[run.startIndex] : nil
        let since = (i.price ?? 0) - (first ?? i.price ?? 0)
        let lineColor = since == 0 ? DS.accent : Theme.changeColor(since, market: m)
        let markers = run.events.compactMap { e in run.dates.firstIndex(of: e.date) }
        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(i.name).font(.headline)
                    Text(i.symbol + (i.kind == "etf" ? " · ETF" : "")).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(i.price.map { m.currencySymbol + TMFmt.price($0, m) } ?? "—")
                        .font(.system(.title3, design: .rounded).weight(.bold))
                        .monospacedDigit()
                    Text(i.suspended ? L("停牌") : TMFmt.pct(i.changePct))
                        .font(.caption.weight(.semibold))
                        .monospacedDigit()
                        .foregroundStyle(i.suspended ? Color.secondary : TMFmt.color(i.changePct, m))
                }
            }
            TMPriceChart(dates: run.dates, closes: i.closes, startIndex: run.startIndex,
                         markers: markers, color: lineColor, market: m)
                .frame(height: 200)
            if !run.finished { ticket(i) }
        }
        .card()
    }

    // MARK: Ticket

    private func ticket(_ i: TMInstrument) -> some View {
        let n = Int(qty) ?? 0
        let price = i.price ?? 0
        let maxBuy = price > 0 ? Int(run.portfolio.cash / price) / lot * lot : 0
        let held = run.portfolio.positions.first { $0.symbol == i.symbol }
        let heldShares = Int(held?.shares ?? 0)
        let lotBad = n > 0 && n % lot != 0
        let cashBad = n > 0 && Double(n) * price > run.portfolio.cash + 1e-6
        let canBuy = n > 0 && !lotBad && !cashBad && !i.suspended && !vm.busy
        let canSell = n > 0 && n <= heldShares && !i.suspended && !vm.busy
        return VStack(alignment: .leading, spacing: 10) {
            Divider()
            HStack(spacing: 8) {
                TextField(L("股数"), text: $qty)
                    .keyboardType(.numberPad)
                    .focused($qtyFocused)
                    .font(.system(.body, design: .rounded).weight(.bold))
                    .monospacedDigit()
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(DS.surfaceHi, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                Button { qty = String(maxBuy) } label: {
                    Text(L("最多")).font(.footnote.weight(.semibold))
                        .padding(.horizontal, 14).padding(.vertical, 10)
                        .background(DS.surfaceHi, in: Capsule())
                }
                .buttonStyle(.plain)
                .disabled(maxBuy == 0 || i.suspended)
            }
            HStack(spacing: 10) {
                sideButton(L("买入"), tint: OrderSide.buy.tint, enabled: canBuy) { trade(i, side: "buy", shares: n) }
                sideButton(L("卖出"), tint: OrderSide.sell.tint, enabled: canSell) { trade(i, side: "sell", shares: n) }
            }
            VStack(alignment: .leading, spacing: 4) {
                if i.suspended {
                    Text(L("这只股票今天停牌，不能交易")).foregroundStyle(.orange)
                } else if lotBad {
                    Text(L("A股按 %lld 股的整数倍买入。", lot)).foregroundStyle(.orange)
                } else if cashBad {
                    Text(L("现金不足")).foregroundStyle(.orange)
                } else if n > 0, price > 0 {
                    Text(L("成交金额约 %@", TMFmt.money(Double(n) * price, m, decimals: 0))).monospacedDigit()
                }
                if let held {
                    HStack(spacing: 4) {
                        Text("\(L("持有 %lld 股", heldShares)) · \(L("成本")) \(TMFmt.price(held.cost, m)) ·")
                            .monospacedDigit()
                        Button("\(L("卖出")) \(heldShares)") { qty = String(heldShares) }
                            .foregroundStyle(DS.accent)
                            .buttonStyle(.plain)
                    }
                }
                Text(L("按当天收盘价成交，不收手续费。") + (lot > 1 && !lotBad ? " " + L("A股按 %lld 股的整数倍买入。", lot) : ""))
            }
            .font(.caption)
            .foregroundStyle(.secondary)
            .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func sideButton(_ title: String, tint: Color, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, minHeight: 42)
                .background(tint.opacity(enabled ? 1 : 0.35), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
    }

    private func trade(_ i: TMInstrument, side: String, shares: Int) {
        qtyFocused = false
        Task {
            if await vm.trade(symbol: i.symbol, side: side, shares: shares) { qty = "" }
        }
    }

    // MARK: Portfolio vs index

    private var portfolioCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("收益曲线"))
            VStack(alignment: .leading, spacing: 10) {
                TMValueChart(values: run.portfolio.values, bench: run.portfolio.bench,
                             dates: Array(run.dates.dropFirst(run.startIndex)), market: m)
                    .frame(height: 170)
                HStack(spacing: 14) {
                    Label { Text(L("我的组合")) } icon: { Capsule().fill(DS.accent).frame(width: 14, height: 3) }
                    Label { Text(L("指数基金")) } icon: {
                        Rectangle().stroke(Color.secondary, style: StrokeStyle(lineWidth: 2, dash: [3, 2]))
                            .frame(width: 14, height: 1)
                    }
                }
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
            .card()
        }
    }

    // MARK: Holdings

    private func holdingsCard(_ proxy: ScrollViewProxy) -> some View {
        let positions = run.portfolio.positions
        return VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("持仓"))
            VStack(spacing: 0) {
                if positions.isEmpty {
                    Text(L("还没有持仓，现在全是现金。"))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                }
                ForEach(Array(positions.enumerated()), id: \.element.id) { idx, p in
                    Button {
                        selected = p.symbol
                        withAnimation { proxy.scrollTo("chart", anchor: .center) }
                    } label: { positionRow(p) }
                    .buttonStyle(.plain)
                    if idx < positions.count - 1 { RowDivider() }
                }
                if !run.trades.isEmpty {
                    Rectangle().fill(DS.stroke).frame(height: 1)
                    DisclosureGroup {
                        VStack(spacing: 8) {
                            ForEach(Array(run.trades.enumerated()), id: \.offset) { _, t in tradeRow(t) }
                        }
                        .padding(.top, 8)
                    } label: {
                        Text("\(L("交易记录")) (\(run.trades.count))").font(.footnote.weight(.semibold))
                    }
                    .tint(.secondary)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
            }
            .card(padding: 0)
        }
    }

    private func positionRow(_ p: TMPosition) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(p.name).font(.subheadline.weight(.semibold)).lineLimit(1)
                Text("\(Int(p.shares))\(L("股")) · \(L("成本")) \(TMFmt.price(p.cost, m))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 3) {
                Text(TMFmt.money(p.value, m, decimals: 0)).font(.subheadline.weight(.semibold)).monospacedDigit()
                Text("\(TMFmt.signed(p.pl, m)) (\(TMFmt.pct(p.plPct)))")
                    .font(.caption)
                    .monospacedDigit()
                    .foregroundStyle(TMFmt.color(p.pl, m))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }

    private func tradeRow(_ t: TMTrade) -> some View {
        let buy = t.side == "buy"
        return HStack(spacing: 8) {
            Text(TMDate.short(t.date)).foregroundStyle(.secondary)
            Text(buy ? L("买入") : L("卖出"))
                .fontWeight(.bold)
                .foregroundStyle(buy ? OrderSide.buy.tint : OrderSide.sell.tint)
            Text(name(t.symbol)).lineLimit(1)
            Spacer(minLength: 6)
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(Int(t.shares)) × \(TMFmt.price(t.price, m))")
                if let pl = t.pl {
                    Text(TMFmt.signed(pl, m)).foregroundStyle(TMFmt.color(pl, m))
                }
            }
        }
        .font(.caption)
        .monospacedDigit()
    }

    // MARK: News

    private var newsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("当时的新闻"))
            VStack(alignment: .leading, spacing: 10) {
                ForEach(run.notes) { n in
                    newsItem(isNew: n.new, top: "\(TMDate.short(n.date)) · \(L("你的账户"))",
                             text: dividendText(n), source: nil)
                }
                if run.events.isEmpty {
                    Text(L("目前还没有大事发生。往前走走看。")).font(.footnote).foregroundStyle(.secondary)
                }
                ForEach(run.events) { e in
                    let when = e.happened != e.date ? " · " + L("发生于 %@", TMDate.short(e.happened)) : ""
                    newsItem(isNew: e.new, top: TMDate.short(e.date) + when, text: e.text, source: e.source)
                }
            }
            .card()
        }
    }

    private func dividendText(_ n: TMNote) -> String {
        let cash = TMFmt.money(n.cash, m)
        return n.shares > 0
            ? L("%@ 除权除息（%@）：到账现金 %@，送转 %lld 股", name(n.symbol), n.text, cash, Int(n.shares))
            : L("%@ 除权除息（%@）：到账现金 %@", name(n.symbol), n.text, cash)
    }

    private func newsItem(isNew: Bool, top: String, text: String, source: String?) -> some View {
        let shape = RoundedRectangle(cornerRadius: 12, style: .continuous)
        return VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                if isNew {
                    Text(L("新"))
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 5).padding(.vertical, 1)
                        .background(TMFmt.news, in: RoundedRectangle(cornerRadius: 4))
                }
                Text(top).font(.caption2).foregroundStyle(.secondary).monospacedDigit()
            }
            Text(text).font(.footnote).fixedSize(horizontal: false, vertical: true)
            if let source {
                Text("\(L("来源")): \(source)").font(.caption2).foregroundStyle(.secondary)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(isNew ? TMFmt.news.opacity(0.08) : Color.clear, in: shape)
        .overlay(shape.strokeBorder(isNew ? TMFmt.news.opacity(0.5) : DS.stroke))
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Result

private struct TMResultCard: View {
    let run: TMRun
    let result: TMResult
    let board: TMBoard?
    let busy: Bool
    let onReplay: () -> Void
    let onBack: () -> Void

    private var m: Market { run.scenario.marketValue }
    private func name(_ symbol: String) -> String {
        run.instruments.first { $0.symbol == symbol }?.name ?? symbol
    }

    var body: some View {
        let r = result
        VStack(alignment: .leading, spacing: 18) {
            Label(L("结局揭晓"), systemImage: "flag.checkered").font(.headline)

            HStack(alignment: .top, spacing: 10) {
                big(L("你的收益"), r.returnPct, drawdown: r.maxDrawdownPct)
                big(L("一直持有指数基金"), r.benchReturnPct, drawdown: r.benchMaxDrawdownPct)
            }

            VStack(alignment: .leading, spacing: 5) {
                Text(L("共交易 %lld 次", r.trades)).foregroundStyle(.secondary)
                if let b = r.best { tradeLine(L("最赚的一笔"), b) }
                if let w = r.worst, !(w.date == r.best?.date && w.symbol == r.best?.symbol && w.pl == r.best?.pl) {
                    tradeLine(L("最亏的一笔"), w)
                }
                Text(L("指数基金在 %@ 跌到最低点。", TMDate.short(r.lowDate))).foregroundStyle(.secondary)
            }
            .font(.footnote)

            section(L("复盘")) {
                ForEach(r.lessons, id: \.self) { l in
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Circle().fill(DS.accent).frame(width: 5, height: 5).alignmentGuide(.firstTextBaseline) { $0[.bottom] + 4 }
                        Text(l).font(.subheadline).fixedSize(horizontal: false, vertical: true)
                    }
                }
            }

            section(L("后来发生了什么")) {
                Text(r.epilogue).font(.subheadline).fixedSize(horizontal: false, vertical: true)
            }

            if !r.examPoints.isEmpty {
                section(L("对应的考试知识点")) {
                    ForEach(r.examPoints) { p in
                        HStack(alignment: .firstTextBaseline, spacing: 10) {
                            Text(p.exam).font(.footnote.weight(.bold)).foregroundStyle(DS.accent)
                                .frame(width: 74, alignment: .leading)
                            Text(p.point).font(.footnote).fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
            }

            if let board, !board.rows.isEmpty {
                section("\(L("同一段历史排行榜")) · \(L("%lld 人完成", board.players))") {
                    VStack(spacing: 0) {
                        ForEach(board.rows) { row in boardRow(row) }
                    }
                }
            }

            HStack(spacing: 10) {
                Button(action: onReplay) {
                    Text(L("再玩一次")).font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 18).padding(.vertical, 10)
                        .foregroundStyle(.white)
                        .background(DS.accentGradient, in: Capsule())
                }
                .buttonStyle(.plain)
                .disabled(busy)
                Button(action: onBack) {
                    Text(L("换一段历史")).font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 16).padding(.vertical, 10)
                        .foregroundStyle(.primary)
                        .background(DS.surfaceHi, in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .card()
        .overlay(RoundedRectangle(cornerRadius: DS.radius, style: .continuous).strokeBorder(DS.accent.opacity(0.45)))
    }

    private func big(_ label: String, _ value: Double, drawdown: Double) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption).foregroundStyle(.secondary).lineLimit(2, reservesSpace: true)
            Text(TMFmt.pct(value))
                .font(.system(size: 28, weight: .heavy, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(TMFmt.color(value, m))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text("\(L("最大回撤")) \(TMFmt.pct(drawdown))")
                .font(.caption)
                .foregroundStyle(.secondary)
                .monospacedDigit()
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.surfaceHi, in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
    }

    private func tradeLine(_ label: String, _ t: TMTrade) -> some View {
        HStack(spacing: 4) {
            Text("\(label):")
            Text(name(t.symbol)).fontWeight(.semibold)
            if let pl = t.pl {
                Text(TMFmt.signed(pl, m)).monospacedDigit().foregroundStyle(TMFmt.color(pl, m))
            }
        }
    }

    private func section<C: View>(_ title: String, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.subheadline.weight(.bold))
            content()
        }
    }

    private func boardRow(_ row: TMBoard.Row) -> some View {
        var nick = row.nickname ?? L("匿名同学")
        if Lang.code != "zh", nick.hasPrefix("用户#") { nick = "#" + nick.dropFirst(3) }
        return HStack(spacing: 10) {
            Text("\(row.rank)").font(.footnote.weight(.heavy)).monospacedDigit().frame(width: 26, alignment: .leading)
            Text(nick + (row.isMe ? L("（我）") : "")).font(.footnote).lineLimit(1)
            Spacer()
            Text(TMFmt.pct(row.returnPct))
                .font(.footnote.weight(.bold))
                .monospacedDigit()
                .foregroundStyle(TMFmt.color(row.returnPct, m))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(row.isMe ? DS.accent.opacity(0.12) : Color.clear, in: RoundedRectangle(cornerRadius: 8))
    }
}

// MARK: - Charts

/// Index-based x axis (one step per trading day, no weekend gaps), labelled with the dates.
private func tmTicks(_ n: Int) -> [Int] {
    guard n > 1 else { return [0] }
    return Array(Set([1, 3, 5, 7].map { (n - 1) * $0 / 8 })).sorted()
}

/// Tap a day, or press and drag along the line, to read it off the chart. Unlike chartXSelection,
/// a quick swipe that starts on the chart still scrolls the page.
private struct TMScrub: ViewModifier {
    @Binding var pick: Int?
    let count: Int

    func body(content: Content) -> some View {
        content.chartOverlay { proxy in
            GeometryReader { geo in
                Rectangle().fill(.clear).contentShape(Rectangle())
                    .onTapGesture { loc in
                        let i = index(at: loc, proxy, geo)
                        pick = i == pick ? nil : i
                    }
                    .gesture(
                        LongPressGesture(minimumDuration: 0.25)
                            .sequenced(before: DragGesture(minimumDistance: 0))
                            .onChanged { value in
                                if case .second(true, let drag?) = value { pick = index(at: drag.location, proxy, geo) }
                            }
                            .onEnded { _ in pick = nil }
                    )
            }
        }
    }

    private func index(at point: CGPoint, _ proxy: ChartProxy, _ geo: GeometryProxy) -> Int? {
        guard count > 0, let frame = proxy.plotFrame,
              let v = proxy.value(atX: point.x - geo[frame].origin.x, as: Double.self) else { return nil }
        return min(max(Int(v.rounded()), 0), count - 1)
    }
}

private struct TMCallout: View {
    let date: String
    let values: [(String, Color)]

    var body: some View {
        HStack(spacing: 8) {
            Text(TMDate.short(date)).fontWeight(.bold)
            ForEach(Array(values.enumerated()), id: \.offset) { _, v in
                Text(v.0).foregroundStyle(v.1)
            }
        }
        .font(.caption2)
        .monospacedDigit()
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(DS.surface, in: RoundedRectangle(cornerRadius: 7, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 7, style: .continuous).strokeBorder(DS.stroke))
        .allowsHitTesting(false)
    }
}

/// Closes of one instrument; the lead-in before the scenario's first day is shaded and dimmed,
/// orange dots mark the days news came out.
private struct TMPriceChart: View {
    let dates: [String]
    let closes: [Double?]
    let startIndex: Int
    let markers: [Int]
    let color: Color
    let market: Market
    @State private var pick: Int?

    private struct Pt: Identifiable {
        let i: Int
        let v: Double
        let series: String
        var lead: Bool { series.hasPrefix("L") }
        var id: String { "\(series)-\(i)" }
    }

    /// Suspended days break the line; the start day belongs to both the lead-in and the game.
    private var points: [Pt] {
        var out: [Pt] = []
        var seg = 0
        for (i, c) in closes.enumerated() {
            guard let v = c else { seg += 1; continue }
            if i <= startIndex { out.append(Pt(i: i, v: v, series: "L\(seg)")) }
            if i >= startIndex { out.append(Pt(i: i, v: v, series: "G\(seg)")) }
        }
        return out
    }

    private var domain: ClosedRange<Double> {
        let vals = closes.compactMap { $0 }
        guard var lo = vals.min(), var hi = vals.max() else { return 0...1 }
        if hi == lo { hi += 1; lo -= 1 }
        let pad = (hi - lo) * 0.08
        return (lo - pad)...(hi + pad)
    }

    var body: some View {
        let n = closes.count
        let dom = domain
        Chart {
            if startIndex > 0 && startIndex < n {
                RectangleMark(xStart: .value("Day", 0), xEnd: .value("Day", startIndex),
                              yStart: .value("Close", dom.lowerBound), yEnd: .value("Close", dom.upperBound))
                    .foregroundStyle(DS.surfaceHi.opacity(0.7))
                RuleMark(x: .value("Day", startIndex))
                    .foregroundStyle(Color.secondary.opacity(0.6))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [2, 3]))
            }
            ForEach(points) { p in
                LineMark(x: .value("Day", p.i), y: .value("Close", p.v), series: .value("Segment", p.series))
                    .foregroundStyle(p.lead ? Color.secondary.opacity(0.7) : color)
                    .lineStyle(StrokeStyle(lineWidth: p.lead ? 1.4 : 2.2, lineCap: .round, lineJoin: .round))
            }
            ForEach(markers, id: \.self) { i in
                PointMark(x: .value("Day", i), y: .value("Close", dom.lowerBound))
                    .symbolSize(16)
                    .foregroundStyle(TMFmt.news)
            }
            if let k = pick, closes.indices.contains(k), let v = closes[k] {
                RuleMark(x: .value("Day", k)).foregroundStyle(Color.secondary.opacity(0.5))
                PointMark(x: .value("Day", k), y: .value("Close", v)).symbolSize(36).foregroundStyle(color)
            }
        }
        .chartXScale(domain: 0...max(n - 1, 1))
        .chartYScale(domain: dom)
        .chartXAxis {
            AxisMarks(values: tmTicks(n)) { v in
                AxisGridLine()
                AxisValueLabel {
                    if let i = v.as(Int.self), dates.indices.contains(i) { Text(TMDate.tick(dates[i])) }
                }
            }
        }
        .chartYAxis {
            AxisMarks(position: .trailing, values: .automatic(desiredCount: 4)) { v in
                AxisGridLine()
                AxisValueLabel {
                    if let d = v.as(Double.self) { Text(Formatters.price(d, decimals: d < 10 ? 2 : d < 100 ? 1 : 0)) }
                }
            }
        }
        .modifier(TMScrub(pick: $pick, count: n))
        .overlay(alignment: .topLeading) {
            if let k = pick, closes.indices.contains(k), dates.indices.contains(k), let v = closes[k] {
                TMCallout(date: dates[k], values: [(market.currencySymbol + TMFmt.price(v, market), color)])
            }
        }
    }
}

/// The portfolio against the same money left in the index fund, from the scenario's first day.
private struct TMValueChart: View {
    let values: [Double]
    let bench: [Double]
    let dates: [String]
    let market: Market
    @State private var pick: Int?

    var body: some View {
        let n = max(values.count, bench.count)
        Chart {
            ForEach(Array(bench.enumerated()), id: \.offset) { i, v in
                LineMark(x: .value("Day", i), y: .value("Value", v), series: .value("Series", "bench"))
                    .foregroundStyle(Color.secondary)
                    .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [5, 4]))
            }
            ForEach(Array(values.enumerated()), id: \.offset) { i, v in
                LineMark(x: .value("Day", i), y: .value("Value", v), series: .value("Series", "you"))
                    .foregroundStyle(DS.accent)
                    .lineStyle(StrokeStyle(lineWidth: 2.2, lineCap: .round, lineJoin: .round))
            }
            if let k = pick, k >= 0, k < n {
                RuleMark(x: .value("Day", k)).foregroundStyle(Color.secondary.opacity(0.5))
            }
        }
        .chartXScale(domain: 0...max(n - 1, 1))
        .chartYScale(domain: .automatic(includesZero: false))
        .chartXAxis {
            AxisMarks(values: tmTicks(n)) { v in
                AxisGridLine()
                AxisValueLabel {
                    if let i = v.as(Int.self), dates.indices.contains(i) { Text(TMDate.tick(dates[i])) }
                }
            }
        }
        .chartYAxis {
            AxisMarks(position: .trailing, values: .automatic(desiredCount: 4)) { v in
                AxisGridLine()
                AxisValueLabel {
                    if let d = v.as(Double.self) { Text(TMFmt.compact(d, market)) }
                }
            }
        }
        .modifier(TMScrub(pick: $pick, count: n))
        .overlay(alignment: .topLeading) {
            if let k = pick, values.indices.contains(k), bench.indices.contains(k), dates.indices.contains(k) {
                TMCallout(date: dates[k], values: [(TMFmt.money(values[k], market, decimals: 0), DS.accent),
                                                    (TMFmt.money(bench[k], market, decimals: 0), Color.secondary)])
            }
        }
    }
}
