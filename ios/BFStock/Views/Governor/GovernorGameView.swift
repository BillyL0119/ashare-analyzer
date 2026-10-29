import SwiftUI
import Charts

/// One scenario: set the rate each quarter, see what happened, and compare with the real Fed at the end.
struct GovernorGameView: View {
    @ObservedObject var vm: GovernorViewModel
    let scenarioID: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Group {
            if let run = vm.run, run.scenario.id == scenarioID {
                GVGame(vm: vm, run: run) { dismiss() }
            } else if let err = vm.openError {
                ErrorRetryView(message: err) { Task { await vm.open(scenarioID, fresh: false) } }
                    .frame(maxHeight: .infinity)
            } else {
                ProgressView(String(localized: "loading"))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle(vm.run?.scenario.title ?? GV("title"))
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Game

private struct GVGame: View {
    @ObservedObject var vm: GovernorViewModel
    let run: GVRun
    let onBack: () -> Void

    @State private var confirmRestart = false
    @State private var rate = 0.0             // the rate being set for this quarter

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 18) {
                    header.id("top")
                    if run.finished, let r = run.result {
                        GVVerdictCard(result: r, busy: vm.busy, onReplay: { Task { await vm.restart() } }, onBack: onBack)
                        GVCharts(run: run)
                        GVResultDetails(result: r, board: vm.board)
                    } else if let now = run.now {
                        GVLatestCard(run: run)
                        GVDecisionCard(now: now, rate: $rate, busy: vm.busy)
                            .id(run.decision)
                        GVCharts(run: run)
                        GVNewsCard(run: run)
                    }
                    Text(GV("source"))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 4)
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 24)
            }
            .onChange(of: run.finished) { _, finished in
                if finished { withAnimation { proxy.scrollTo("top", anchor: .top) } }
            }
        }
        .safeAreaInset(edge: .bottom) {
            // The decision stays in reach while scrolling through the charts and events
            if !run.finished && run.now != nil { decideBar }
        }
        .task(id: run.decision) { rate = run.now?.rate ?? 0 }   // a new quarter starts from the rate just set
        .alert(GV("replay"), isPresented: $confirmRestart) {
            Button(GV("replay"), role: .destructive) { Task { await vm.restart() } }
            Button("取消", role: .cancel) {}
        } message: {
            Text(GV("restartConfirm"))
        }
        .task(id: run.finished) {
            if run.finished { await vm.loadBoard() }
        }
        .sensoryFeedback(.success, trigger: run.decision) { old, new in new > old }
        .sensoryFeedback(.error, trigger: vm.error) { _, new in new != nil }
    }

    private var decideBar: some View {
        VStack(spacing: 8) {
            if let err = vm.error {
                Label(err, systemImage: "exclamationmark.circle.fill")
                    .font(.caption)
                    .foregroundStyle(.red)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            Button { Task { await vm.decide(rate) } } label: {
                HStack(spacing: 8) {
                    if vm.busy { ProgressView().tint(.white) } else { Image(systemName: "checkmark.seal.fill") }
                    Text(vm.busy ? GV("deciding") : GV("decide")).lineLimit(1).minimumScaleFactor(0.8)
                    Spacer(minLength: 8)
                    Text(GVFmt.pct(rate)).monospacedDigit()
                }
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.white)
                .padding(.horizontal, 18)
                .frame(maxWidth: .infinity, minHeight: 50)
                .background(DS.accentGradient, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(vm.busy)
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .background(.bar)
        .overlay(alignment: .top) { Rectangle().fill(DS.stroke).frame(height: 1) }
    }

    private var header: some View {
        let n = max(run.scenario.nDecisions, 1)
        return VStack(alignment: .leading, spacing: 12) {
            Text(run.finished ? "\(GVFmt.quarter(run.scenario.start)) – \(GVFmt.quarter(run.scenario.end))"
                              : GVFmt.quarter(run.now?.q ?? run.scenario.end))
                .font(.title3.weight(.bold))
            HStack(spacing: 10) {
                Text(run.finished ? GV("progress", "\(n)", "\(n)") : GV("decisionN", "\(run.decision + 1)", "\(n)"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
                ProgressView(value: Double(min(run.decision, n)), total: Double(n))
                    .tint(GVFmt.tint(run.scenario.id))
                if !run.finished {
                    Button(GV("replay")) { confirmRestart = true }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .buttonStyle(.plain)
                        .disabled(vm.busy)
                }
            }
            Text(GV("chairWas", run.scenario.chair))
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .card()
    }
}

// MARK: - Latest figures

private struct GVLatestCard: View {
    let run: GVRun
    @State private var help: String?

    var body: some View {
        let p = run.played.last
        let h = run.history[run.history.count - 1]
        let q = p?.q ?? h.q
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(GV("latest", GVFmt.quarter(q)))
            Grid(horizontalSpacing: 10, verticalSpacing: 10) {
                GridRow {
                    datum(GV("pce"), p?.pce4 ?? h.pce4, real: p?.real.pce4, help: "pceHelp")
                    datum(GV("u"), p?.u ?? h.u, real: p?.real.u, help: nil)
                }
                GridRow {
                    datum(GV("exp"), p?.exp ?? h.exp, real: p?.real.exp, help: "expHelp")
                    datum(GV("un"), p?.un ?? h.un, real: nil, help: nil)
                }
            }
            if let help {
                Text(GV(help))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .transition(.opacity)
            }
            if let p, let rate = p.rate {
                HStack {
                    Text(GV("youSet", GVFmt.pct(rate))).foregroundStyle(DS.accent).fontWeight(.semibold)
                    Spacer(minLength: 8)
                    Text(GV("fedSet", GVFmt.pct(p.real.ff))).foregroundStyle(.secondary).multilineTextAlignment(.trailing)
                }
                .font(.footnote)
                .monospacedDigit()
            }
        }
        .card()
    }

    private func datum(_ label: String, _ v: Double, real: Double?, help key: String?) -> some View {
        Button {
            guard let key else { return }
            withAnimation(.snappy(duration: 0.2)) { help = help == key ? nil : key }
        } label: {
            VStack(alignment: .leading, spacing: 3) {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(label).lineLimit(2).multilineTextAlignment(.leading)
                    if key != nil { Image(systemName: "info.circle").imageScale(.small) }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
                Text(GVFmt.pct(v))
                    .font(.system(.title3, design: .rounded).weight(.bold))
                    .monospacedDigit()
                if let real {
                    Text("\(GV("real")) \(GVFmt.pct(real))").font(.caption2).foregroundStyle(.secondary).monospacedDigit()
                }
            }
            .padding(10)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(DS.surfaceHi, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
    }
}

// MARK: - The decision

private struct GVDecisionCard: View {
    let now: GVNow
    @Binding var rate: Double
    let busy: Bool

    @State private var showTaylor = false
    private static let maxRate = 20.0

    private var base: Double { (now.rate * 4).rounded() / 4 }
    private func set(_ v: Double) { rate = min(Self.maxRate, max(0, (v * 4).rounded() / 4)) }

    var body: some View {
        let delta = rate - base
        let tv = (now.taylor * 4).rounded() / 4
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline) {
                Text(GV("setRate", GVFmt.quarter(now.q)))
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(DS.accent)
                Spacer(minLength: 8)
                Text("\(GV("now")) \(GVFmt.pct(now.rate))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }
            HStack(spacing: 18) {
                stepButton("minus", label: "−0.25", disabled: busy || rate <= 0) { set(rate - 0.25) }
                VStack(spacing: 4) {
                    Text(GVFmt.pct(rate))
                        .font(.system(size: 40, weight: .heavy, design: .rounded))
                        .monospacedDigit()
                        .contentTransition(.numericText(value: rate))
                        .animation(.snappy(duration: 0.2), value: rate)
                    Text(abs(delta) < 1e-9 ? GV("hold") : "\(GV("change")) \(GVFmt.signed(delta))")
                        .font(.footnote.weight(.semibold))
                        .monospacedDigit()
                        .foregroundStyle(delta > 0 ? GVFmt.hot : delta < 0 ? GVFmt.target : .secondary)
                }
                .frame(minWidth: 140)
                stepButton("plus", label: "+0.25", disabled: busy || rate >= Self.maxRate) { set(rate + 0.25) }
            }
            .frame(maxWidth: .infinity)
            Slider(value: Binding(get: { rate }, set: { set($0) }), in: 0...Self.maxRate, step: 0.25)
                .tint(DS.accent)
                .accessibilityLabel(GV("yourRate"))
                .accessibilityValue(GVFmt.pct(rate))
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 4), spacing: 6) {
                ForEach([-1, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1], id: \.self) { d in
                    let on = abs(delta - d) < 1e-9
                    Button { set(base + d) } label: {
                        Text(d == 0 ? GV("hold") : GVFmt.signed(d))
                            .font(.footnote.weight(.semibold))
                            .monospacedDigit()
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .foregroundStyle(on ? Color.white : Color.primary)
                            .background(on ? DS.accent : DS.surfaceHi, in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .disabled(busy || base + d < 0)
                    .opacity(base + d < 0 ? 0.4 : 1)
                    .accessibilityAddTraits(on ? .isSelected : [])
                }
            }
            .sensoryFeedback(.selection, trigger: rate)
            Divider()
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Label(GV("taylor"), systemImage: "function").font(.footnote.weight(.semibold))
                    Spacer()
                    Button(showTaylor ? GV("taylorHide") : GV("taylorShow")) {
                        withAnimation(.snappy(duration: 0.2)) { showTaylor.toggle() }
                    }
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(DS.surfaceHi, in: Capsule())
                    .buttonStyle(.plain)
                }
                if showTaylor {
                    Text(tv < 0 ? GV("taylorNeg", GVFmt.pct(tv)) : GV("taylorText", GVFmt.pct(tv)))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .card()
        .overlay(RoundedRectangle(cornerRadius: DS.radius, style: .continuous).strokeBorder(DS.accent.opacity(0.45)))
    }

    private func stepButton(_ icon: String, label: String, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.title3.weight(.bold))
                .frame(width: 46, height: 46)
                .foregroundStyle(.primary)
                .background(DS.surfaceHi, in: Circle())
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .opacity(disabled ? 0.4 : 1)
        .accessibilityLabel(label)
    }
}

// MARK: - Events

private struct GVNewsCard: View {
    let run: GVRun

    var body: some View {
        let newest = run.played.last?.q
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(newest.map { GV("revealed", GVFmt.quarter($0)) } ?? GV("history"))
            VStack(alignment: .leading, spacing: 10) {
                if newest != nil && !run.events.contains(where: \.new) {
                    Text(GV("newsEmpty")).font(.footnote).foregroundStyle(.secondary)
                }
                ForEach(run.events) { e in item(e) }
            }
            .card()
        }
    }

    private func item(_ e: GVEvent) -> some View {
        let shape = RoundedRectangle(cornerRadius: 12, style: .continuous)
        return VStack(alignment: .leading, spacing: 4) {
            Text(GVFmt.quarter(e.q) + (e.source.isEmpty || e.source == "—" ? "" : " · " + e.source))
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(e.text).font(.footnote).fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(e.new ? GVFmt.news.opacity(0.08) : Color.clear, in: shape)
        .overlay(shape.strokeBorder(e.new ? GVFmt.news.opacity(0.5) : DS.stroke))
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Result

private struct GVVerdictCard: View {
    let result: GVResult
    let busy: Bool
    let onReplay: () -> Void
    let onBack: () -> Void

    var body: some View {
        let r = result
        let tone = r.verdict == "better" ? GVFmt.target : r.verdict == "worse" ? GVFmt.hot : DS.accent
        let rows: [(String, KeyPath<GVSummary, Double>)] = [
            ("avg_pce4", \.avgPce4), ("peak_pce4", \.peakPce4), ("end_pce4", \.endPce4),
            ("avg_u", \.avgU), ("peak_u", \.peakU), ("end_u", \.endU),
            ("end_exp", \.endExp), ("avg_rate", \.avgRate), ("peak_rate", \.peakRate),
        ]
        VStack(alignment: .leading, spacing: 14) {
            Label(GV("resultTitle"), systemImage: "flag.checkered").font(.headline)
            Text(GV("verdict.\(r.verdict)"))
                .font(.title3.weight(.bold))
                .foregroundStyle(tone)
                .fixedSize(horizontal: false, vertical: true)
            HStack(alignment: .top, spacing: 10) {
                big(GV("you"), r.me.miss, color: tone)
                big(GV("realFed"), r.fed.miss, color: .primary)
            }
            Text(GV("missLine", GVFmt.points(r.me.miss), GVFmt.points(r.fed.miss)))
                .font(.footnote)
                .monospacedDigit()
            Text(GV("missHelp"))
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            Grid(alignment: .leading, horizontalSpacing: 12, verticalSpacing: 8) {
                GridRow {
                    Text("")
                    Text(GV("table.you")).gridColumnAlignment(.trailing)
                    Text(GV("table.fed")).gridColumnAlignment(.trailing)
                }
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                ForEach(rows, id: \.0) { key, path in
                    Divider().gridCellUnsizedAxes(.horizontal)
                    GridRow {
                        Text(GV("table.\(key)"))
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Text(GVFmt.pct(r.me[keyPath: path])).fontWeight(.bold).foregroundStyle(DS.accent)
                        Text(GVFmt.pct(r.fed[keyPath: path]))
                    }
                    .font(.footnote)
                    .monospacedDigit()
                }
            }
            HStack(spacing: 10) {
                Button(action: onReplay) {
                    Text(GV("replay")).font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 18).padding(.vertical, 10)
                        .foregroundStyle(.white)
                        .background(DS.accentGradient, in: Capsule())
                }
                .buttonStyle(.plain)
                .disabled(busy)
                Button(action: onBack) {
                    Text(GV("other")).font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 16).padding(.vertical, 10)
                        .foregroundStyle(.primary)
                        .background(DS.surfaceHi, in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .card()
        .overlay(RoundedRectangle(cornerRadius: DS.radius, style: .continuous).strokeBorder(tone.opacity(0.5)))
    }

    private func big(_ label: String, _ miss: Double, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            Text(GVFmt.points(miss))
                .font(.system(size: 28, weight: .heavy, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(color)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.surfaceHi, in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
    }
}

private struct GVResultDetails: View {
    let result: GVResult
    let board: GVBoard?

    var body: some View {
        VStack(spacing: 18) {
            section(GV("lessonsTitle")) {
                ForEach(result.lessons, id: \.self) { k in
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Circle().fill(DS.accent).frame(width: 5, height: 5).alignmentGuide(.firstTextBaseline) { $0[.bottom] + 4 }
                        Text(GV("lessons.\(k)")).font(.subheadline).fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            section(GV("epilogue")) {
                Text(result.epilogue).font(.subheadline).fixedSize(horizontal: false, vertical: true)
            }
            section(GV("learnMore")) {
                VStack(spacing: 8) {
                    labLink(GV("diagramLink"), id: "phillips")
                    labLink(GV("adasLink"), id: "adas")
                }
            }
            if let board {
                section(GV("board")) {
                    if board.rows.isEmpty {
                        Text(GV("boardEmpty")).font(.footnote).foregroundStyle(.secondary)
                    }
                    VStack(spacing: 0) {
                        ForEach(board.rows) { row in boardRow(row) }
                    }
                }
            }
        }
    }

    private func section<C: View>(_ title: String, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(title)
            VStack(alignment: .leading, spacing: 10) { content() }.card()
        }
    }

    private func labLink(_ title: String, id: String) -> some View {
        NavigationLink(destination: DiagramDetailView(id: id)) {
            HStack(spacing: 10) {
                Image(systemName: "chart.xyaxis.line").foregroundStyle(DS.accent)
                Text(title).font(.subheadline.weight(.semibold)).multilineTextAlignment(.leading)
                Spacer(minLength: 4)
                Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(.tertiary)
            }
            .padding(12)
            .background(DS.surfaceHi.opacity(0.6), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func boardRow(_ row: GVBoard.Row) -> some View {
        var nick = row.nickname ?? GV("anon")
        if Lang.code != "zh", nick.hasPrefix("用户#") { nick = "#" + nick.dropFirst(3) }
        return HStack(spacing: 10) {
            Text("\(row.rank)").font(.footnote.weight(.heavy)).monospacedDigit().frame(width: 26, alignment: .leading)
            Text(nick + (row.isMe ? " (\(GV("meTag")))" : "")).font(.footnote).lineLimit(1)
            Spacer()
            Text(GVFmt.points(row.miss)).font(.footnote.weight(.bold)).monospacedDigit()
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(row.isMe ? DS.accent.opacity(0.12) : Color.clear, in: RoundedRectangle(cornerRadius: 8))
    }
}

// MARK: - Charts

/// Quarters from a to b inclusive, as "2021Q2" labels
private func qRange(_ a: String, _ b: String) -> [String] {
    let pa = a.split(separator: "Q").compactMap { Int($0) }, pb = b.split(separator: "Q").compactMap { Int($0) }
    guard pa.count == 2, pb.count == 2 else { return [] }
    var (y, q) = (pa[0], pa[1])
    var out: [String] = []
    while y < pb[0] || (y == pb[0] && q <= pb[1]) {
        out.append("\(y)Q\(q)")
        q += 1
        if q > 4 { q = 1; y += 1 }
    }
    return out
}

/// The whole period on one quarterly timeline: real history before the start, then the student's
/// economy and the real one side by side for the quarters played so far.
private struct GVTimeline {
    let labels: [String]
    let start: Int
    let inflReal, inflMine, uReal, uMine, uNatural, rateReal, rateMine: [Double?]

    init(_ run: GVRun) {
        let hist = run.history
        let labels = hist.map(\.q) + qRange(run.scenario.start, run.scenario.end)
        func pad(_ a: [Double?]) -> [Double?] { a + Array(repeating: nil, count: max(0, labels.count - a.count)) }
        let last = hist[hist.count - 1]
        let lead = [Double?](repeating: nil, count: hist.count - 1)
        self.labels = labels
        start = hist.count
        inflReal = pad(hist.map(\.pce4) + run.played.map(\.real.pce4))
        inflMine = pad(lead + [last.pce4] + run.played.map(\.pce4))
        uReal = pad(hist.map(\.u) + run.played.map(\.real.u))
        uMine = pad(lead + [last.u] + run.played.map(\.u))
        uNatural = pad(hist.map(\.un) + run.played.map(\.un))
        rateReal = pad(hist.map(\.ff) + run.played.map(\.real.ff))
        rateMine = pad(lead + [last.ff] + run.played.compactMap(\.rate))
    }
}

private struct GVSeries {
    let label: String
    let values: [Double?]
    let color: Color
    var width: CGFloat = 2.8
    var dash: [CGFloat] = []
    var dot = false
}

private struct GVCharts: View {
    let run: GVRun

    var body: some View {
        let tl = GVTimeline(run)
        let real = { (label: String, values: [Double?]) in
            GVSeries(label: label, values: values, color: .secondary, width: 2, dash: [5, 4])
        }
        let mine = { (label: String, values: [Double?]) in GVSeries(label: label, values: values, color: DS.accent, dot: true) }
        VStack(alignment: .leading, spacing: 22) {
            GVChart(title: GV("chartInfl"), labels: tl.labels, startIndex: tl.start, series: [
                GVSeries(label: GV("target"), values: tl.labels.map { _ in 2 }, color: GVFmt.target, width: 1.4, dash: [2, 4]),
                real(GV("legendReal"), tl.inflReal),
                mine(GV("legendYou"), tl.inflMine),
            ])
            GVChart(title: GV("chartU"), labels: tl.labels, startIndex: tl.start, series: [
                GVSeries(label: GV("natural"), values: tl.uNatural, color: GVFmt.target, width: 1.4, dash: [2, 4]),
                real(GV("legendReal"), tl.uReal),
                mine(GV("legendYou"), tl.uMine),
            ])
            GVChart(title: GV("chartRate"), labels: tl.labels, startIndex: tl.start, series: [
                real(GV("realFed"), tl.rateReal),
                mine(GV("yourRate"), tl.rateMine),
            ], height: 150)
        }
        .card()
    }
}

/// Quarterly lines on a fixed timeline, the real history before the start shaded. Tap a quarter, or
/// press and drag along the lines, to read the values (TMScrub, so swipes still scroll the page).
private struct GVChart: View {
    let title: String
    let labels: [String]
    let startIndex: Int
    let series: [GVSeries]
    var height: CGFloat = 170
    @State private var pick: Int?

    private struct Pt: Identifiable {
        let s: Int
        let i: Int
        let v: Double
        var id: Int { s * 10_000 + i }
    }

    private var points: [Pt] {
        series.enumerated().flatMap { s, sr in sr.values.enumerated().compactMap { i, v in v.map { Pt(s: s, i: i, v: $0) } } }
    }

    private var domain: ClosedRange<Double> {
        let vals = series.flatMap { $0.values.compactMap { $0 } }
        let lo = min(0, vals.min() ?? 0)
        var hi = vals.max() ?? 2
        if hi - lo < 2 { hi = lo + 2 }
        return lo...(hi + (hi - lo) * 0.06)
    }

    /// A year label under each first quarter, every other year when space is short
    private var yearTicks: [Int] {
        let q1 = labels.indices.filter { labels[$0].hasSuffix("Q1") }
        let every = q1.count > 6 ? 2 : 1
        return q1.enumerated().filter { $0.offset % every == 0 }.map(\.element)
    }

    var body: some View {
        let n = labels.count
        let dom = domain
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.subheadline.weight(.semibold))
            DLFlow(spacing: 12, lineSpacing: 4) {
                ForEach(Array(series.enumerated()), id: \.offset) { _, sr in
                    HStack(spacing: 6) {
                        swatch(sr)
                        Text(sr.label)
                    }
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                }
            }
            Chart {
                if startIndex > 0 && startIndex < n {
                    RectangleMark(xStart: .value("Q", 0), xEnd: .value("Q", startIndex),
                                  yStart: .value("%", dom.lowerBound), yEnd: .value("%", dom.upperBound))
                        .foregroundStyle(DS.surfaceHi.opacity(0.7))
                }
                ForEach(points) { p in
                    let sr = series[p.s]
                    LineMark(x: .value("Q", p.i), y: .value("%", p.v), series: .value("Series", p.s))
                        .foregroundStyle(sr.color)
                        .lineStyle(StrokeStyle(lineWidth: sr.width, lineCap: .round, lineJoin: .round, dash: sr.dash))
                }
                ForEach(Array(series.enumerated()), id: \.offset) { s, sr in
                    if sr.dot, let i = sr.values.lastIndex(where: { $0 != nil }), let v = sr.values[i] {
                        PointMark(x: .value("Q", i), y: .value("%", v)).symbolSize(40).foregroundStyle(sr.color)
                    }
                }
                if let k = pick {
                    RuleMark(x: .value("Q", k)).foregroundStyle(Color.secondary.opacity(0.5))
                }
            }
            .chartXScale(domain: 0...max(n - 1, 1))
            .chartYScale(domain: dom)
            .chartXAxis {
                AxisMarks(values: yearTicks) { v in
                    AxisGridLine()
                    AxisValueLabel {
                        if let i = v.as(Int.self), labels.indices.contains(i) { Text(labels[i].prefix(4)) }
                    }
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading, values: .automatic(desiredCount: 4)) { v in
                    AxisGridLine()
                    AxisValueLabel {
                        if let d = v.as(Double.self) { Text(String(format: d == d.rounded() ? "%.0f" : "%.1f", d)) }
                    }
                }
            }
            .modifier(TMScrub(pick: $pick, count: n))
            .overlay(alignment: (pick ?? 0) * 2 > n ? .topLeading : .topTrailing) {
                if let k = pick, labels.indices.contains(k) { callout(k) }
            }
            .frame(height: height)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(title)
        }
    }

    private func swatch(_ sr: GVSeries) -> some View {
        Path { p in p.move(to: CGPoint(x: 0, y: 1.5)); p.addLine(to: CGPoint(x: 16, y: 1.5)) }
            .stroke(sr.color, style: StrokeStyle(lineWidth: 2.5, dash: sr.dash.isEmpty ? [] : [4, 3]))
            .frame(width: 16, height: 3)
    }

    private func callout(_ k: Int) -> some View {
        let shown = series.filter { $0.values.indices.contains(k) && $0.values[k] != nil }
        return VStack(alignment: .leading, spacing: 2) {
            Text(GVFmt.quarter(labels[k])).fontWeight(.bold)
            ForEach(Array(shown.enumerated()), id: \.offset) { _, sr in
                Text("\(sr.label) \(GVFmt.pct(sr.values[k]))").foregroundStyle(sr.color == .secondary ? Color.primary : sr.color)
            }
        }
        .font(.caption2)
        .monospacedDigit()
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(DS.surface, in: RoundedRectangle(cornerRadius: 7, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 7, style: .continuous).strokeBorder(DS.stroke))
        .padding(.leading, 30)
        .allowsHitTesting(false)
    }
}
