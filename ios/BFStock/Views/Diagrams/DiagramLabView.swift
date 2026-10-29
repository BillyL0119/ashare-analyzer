import SwiftUI

// Interactive economics diagrams (the website's /diagrams): drag curves or pick a shock, read what
// happened, and see the exam tip. Geometry in Models/DiagramModels.swift, drawing in DiagramCanvas.

private let tipColor = Color(r: 0xF5, g: 0x9E, b: 0x0B)

// MARK: - List

struct DiagramLabView: View {
    @AppStorage("dlBoard") private var board = "ib"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Text(DL("subtitleApp"))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 4)

                ForEach(DiagramLab.groups, id: \.key) { group in
                    VStack(alignment: .leading, spacing: 10) {
                        SectionHeader(DL("groups.\(group.key)"))
                        VStack(spacing: 0) {
                            ForEach(Array(group.ids.enumerated()), id: \.element) { idx, id in
                                NavigationLink(destination: DiagramDetailView(id: id)) { row(DiagramLab.def(id)) }
                                    .buttonStyle(.plain)
                                if idx < group.ids.count - 1 { RowDivider() }
                            }
                        }
                        .card(padding: 0)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 40)
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle(DL("title"))
        .navigationBarTitleDisplayMode(.inline)
    }

    /// The thumbnail shows the diagram after its first shock, so the shifted curves are visible
    private func row(_ d: DiagramDef) -> some View {
        var st = d.base
        d.shocks.first?.change(&st)
        return HStack(spacing: 14) {
            DiagramCanvas(scene: d.build(st, board), thumbnail: true)
                .frame(width: 76)
                .padding(6)
                .background(DS.surfaceHi.opacity(0.6), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 3) {
                Text(d.name).font(.subheadline.weight(.semibold))
                Text(d.blurb)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }
}

// MARK: - One diagram

struct DiagramDetailView: View {
    private let def: DiagramDef
    @AppStorage("dlBoard") private var board = "ib"
    @State private var st: DLState
    @State private var shock: String?
    @State private var grab: DLGrab?
    @State private var dragStart: (state: DLState, at: CGPoint)?
    @State private var anim: Task<Void, Never>?
    @State private var grabs = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    init(id: String) {
        def = DiagramLab.def(id)
        _st = State(initialValue: def.base)
    }

    private var boardKey: String { ["ib", "alevel", "ap"].contains(board) ? board : "ib" }

    var body: some View {
        let scene = def.build(st, boardKey)
        ScrollViewReader { proxy in
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text(def.blurb)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 4)
                diagramCard(scene).id("diagram")
                VStack(alignment: .leading, spacing: 10) {
                    SectionHeader(DL("whatHappened"))
                    VStack(alignment: .leading, spacing: 10) {
                        ForEach(scene.text, id: \.self) { p in
                            Text(p).font(.subheadline).fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    .card()
                    .animation(nil, value: scene.text)
                }
                shocksCard(proxy)
                VStack(alignment: .leading, spacing: 8) {
                    Label(DL("examTip"), systemImage: "pencil.and.list.clipboard")
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(tipColor)
                    Text(def.tip).font(.subheadline).fixedSize(horizontal: false, vertical: true)
                }
                .card()
                .overlay(RoundedRectangle(cornerRadius: DS.radius, style: .continuous).strokeBorder(tipColor.opacity(0.4)))
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 40)
        }
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle(def.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { reset() } label: { Label(DL("reset"), systemImage: "arrow.counterclockwise") }
            }
        }
        .sensoryFeedback(.selection, trigger: grabs)
        .sensoryFeedback(.impact(weight: .light), trigger: shock) { _, new in new != nil }
        .onDisappear { anim?.cancel() }
    }

    // MARK: Diagram

    private func diagramCard(_ scene: DLScene) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text(DL("boardLabel")).font(.caption).foregroundStyle(.secondary)
                Picker(DL("boardLabel"), selection: $board) {
                    ForEach(["ib", "alevel", "ap"], id: \.self) { b in Text(DL("boards.\(b)")).tag(b) }
                }
                .pickerStyle(.segmented)
            }
            DiagramCanvas(scene: scene)
                .overlay {
                    DiagramTouchLayer(
                        canGrab: { DLHit.find(scene, at: $0) != nil },
                        onBegan: { p in begin(scene, p) },
                        onChanged: { p in move(p, panels: scene.panels.count) },
                        onEnded: { grab = nil; dragStart = nil }
                    )
                }
                .padding(.top, 4)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(def.name)
                .accessibilityValue(scene.text.joined(separator: " "))
            controls(scene)
            if !scene.legend.isEmpty {
                DLFlow(spacing: 6, lineSpacing: 6) {
                    ForEach(Array(scene.legend.enumerated()), id: \.offset) { _, item in
                        HStack(spacing: 6) {
                            RoundedRectangle(cornerRadius: 3).fill(DLPalette.fill(item.0))
                                .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(DS.stroke))
                                .frame(width: 14, height: 10)
                            Text(item.1)
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.trailing, 8)
                    }
                }
            }
            Label(DL("dragHintApp"), systemImage: "hand.draw")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .card(padding: 14)
    }

    @ViewBuilder
    private func controls(_ scene: DLScene) -> some View {
        let id = def.id
        VStack(alignment: .leading, spacing: 10) {
            if !def.modes.isEmpty {
                DLFlow(spacing: 6, lineSpacing: 6) {
                    ForEach(def.modes, id: \.self) { m in
                        chip(DL("d.\(id).modes.\(m)"), on: st.mode == m) {
                            shock = nil
                            var t = st
                            t.mode = m
                            def.modeDefaults[m]?(&t)
                            animate(to: t)
                        }
                    }
                }
            }
            if !def.elastic.isEmpty {
                DLFlow(spacing: 6, lineSpacing: 6) {
                    ForEach(def.elastic, id: \.self) { e in
                        chip(DL("d.\(id).el.\(e)"), on: st.el == e) { st.el = e }
                    }
                }
            }
            if id == "ped" {
                DLFlow(spacing: 6, lineSpacing: 6) {
                    ForEach([(1.0, "rise"), (-1.0, "cut"), (0.0, "noMove")], id: \.1) { item in
                        chip(DL("d.ped.\(item.1)"), on: st.move == item.0) {
                            shock = nil
                            st.move = item.0
                        }
                    }
                }
            }
            if id == "forex" {
                HStack(spacing: 8) {
                    Text(DL("currency")).font(.caption).foregroundStyle(.secondary)
                    Picker(DL("currency"), selection: $st.cur) {
                        ForEach(DLCurrencies, id: \.code) { c in Text(DL("cur.\(c.code).name")).tag(c.code) }
                    }
                    .pickerStyle(.menu)
                }
            }
            if def.surplusToggle {
                Toggle(DL("surplusToggle"), isOn: $st.surplus)
                    .font(.subheadline)
                    .tint(DS.accent)
            }
            if scene.canAdjust {
                Button {
                    var t = st
                    t.adjusted = true
                    if id == "adas" { t.adj = adasAdjust(st) }
                    animate(to: t)
                } label: {
                    Label(DL("d.\(id).adjustBtn"), systemImage: "forward.fill")
                        .font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 14).padding(.vertical, 9)
                        .foregroundStyle(DS.accent)
                        .background(DS.accent.opacity(0.12), in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func chip(_ title: String, on: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.footnote.weight(.semibold))
                .padding(.horizontal, 12).padding(.vertical, 7)
                .foregroundStyle(on ? Color.white : Color.primary)
                .background(on ? DS.accent : DS.surfaceHi, in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
    }

    // MARK: Shocks

    /// Picking a shock brings the diagram back into view, so the change can be watched
    private func shocksCard(_ proxy: ScrollViewProxy) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(DL("shocks"))
            VStack(spacing: 8) {
                ForEach(def.shocks, id: \.key) { sh in
                    let on = shock == sh.key
                    Button {
                        pick(sh.key, sh.change)
                        withAnimation(reduceMotion ? nil : .snappy) { proxy.scrollTo("diagram", anchor: .top) }
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: on ? "bolt.fill" : "bolt")
                                .font(.footnote)
                                .foregroundStyle(on ? DS.accent : .secondary)
                            Text(def.shockText(sh.key))
                                .font(.subheadline)
                                .multilineTextAlignment(.leading)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(on ? DS.accent.opacity(0.12) : DS.surfaceHi.opacity(0.6),
                                    in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(on ? DS.accent.opacity(0.6) : .clear))
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(on ? .isSelected : [])
                }
            }
            .card(padding: 12)
        }
    }

    // MARK: State changes

    /// The settings a shock or reset keeps: the currency, the surplus switch and the elasticity
    private func kept(_ base: DLState) -> DLState {
        var t = base
        t.cur = st.cur
        t.surplus = st.surplus
        return t
    }

    private func pick(_ key: String, _ change: DLChange) {
        shock = key
        var t = kept(def.base)
        t.el = st.el
        change(&t)
        animate(to: t)
    }

    private func reset() {
        shock = nil
        animate(to: kept(def.base))
    }

    private func animate(to target: DLState) {
        anim?.cancel()
        let from = st
        if reduceMotion { st = target; return }
        anim = Task { @MainActor in
            let start = Date()
            while !Task.isCancelled {
                let k = min(1, Date().timeIntervalSince(start) / 0.42)
                st = DLState.mix(from, target, 1 - pow(1 - k, 3))
                if k >= 1 { break }
                try? await Task.sleep(nanoseconds: 16_000_000)
            }
        }
    }

    private func begin(_ scene: DLScene, _ p: CGPoint) {
        guard let g = DLHit.find(scene, at: p) else { return }
        anim?.cancel()
        shock = nil
        grab = g
        dragStart = (st, DLLayout.model(p, DLLayout.box(g.panel, of: scene.panels.count)))
        grabs += 1
    }

    private func move(_ p: CGPoint, panels: Int) {
        guard let g = grab, let start = dragStart else { return }
        st = start.state.dragged(g.drag, to: DLLayout.model(p, DLLayout.box(g.panel, of: panels)), from: start.at)
    }
}

// MARK: - Wrapping row of chips

struct DLFlow: Layout {
    var spacing: CGFloat = 8
    var lineSpacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = arrange(proposal.width ?? .infinity, subviews)
        let w = rows.map { $0.width }.max() ?? 0
        let h = rows.map(\.height).reduce(0, +) + lineSpacing * CGFloat(max(rows.count - 1, 0))
        return CGSize(width: proposal.width ?? w, height: h)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var y = bounds.minY
        for row in arrange(bounds.width, subviews) {
            var x = bounds.minX
            for i in row.items {
                let s = subviews[i].sizeThatFits(.unspecified)
                subviews[i].place(at: CGPoint(x: x, y: y + (row.height - s.height) / 2), proposal: ProposedViewSize(s))
                x += s.width + spacing
            }
            y += row.height + lineSpacing
        }
    }

    private struct Row { var items: [Int] = []; var width: CGFloat = 0; var height: CGFloat = 0 }

    private func arrange(_ maxWidth: CGFloat, _ subviews: Subviews) -> [Row] {
        var rows: [Row] = []
        var cur = Row()
        for (i, v) in subviews.enumerated() {
            let s = v.sizeThatFits(.unspecified)
            let add = cur.items.isEmpty ? s.width : cur.width + spacing + s.width
            if add > maxWidth && !cur.items.isEmpty {
                rows.append(cur)
                cur = Row(items: [i], width: s.width, height: s.height)
            } else {
                cur.items.append(i)
                cur.width = add
                cur.height = max(cur.height, s.height)
            }
        }
        if !cur.items.isEmpty { rows.append(cur) }
        return rows
    }
}
