import CoreGraphics
import Foundation

// MARK: - Diagram lab geometry (a port of frontend/src/components/diagrams/diagramModels.js)
// Every diagram is drawn in model units (x and y from 0 to 10) and built from a small state (curve
// shifts, a tax, a price line...). build() returns a scene for DiagramCanvas plus the explanation.
// Curves are straight lines y = a + b·x unless noted; "shifting right by d" keeps the slope and moves
// the line d units along the x axis.
//
// Labels use "_" for subscripts: "S_1", "P_{max}", "D£_2". The numbers are model units only: no
// real-world figure is ever drawn on a diagram.

private let LO = 0.25
private let HI = 9.75
private let SMALL = 0.12

private func P(_ x: Double, _ y: Double) -> CGPoint { CGPoint(x: x, y: y) }
private func moved(_ v: Double) -> Bool { abs(v) > SMALL }
private func clamp(_ v: Double, _ lo: Double, _ hi: Double) -> Double { min(hi, max(lo, v)) }

/// Diagram-lab wording (ios/tools/l10n_catalog.py, keys "dl.…")
func DL(_ key: String) -> String { L("dl." + key) }
func DL(_ key: String, _ args: CVarArg...) -> String { String(format: L("dl." + key), locale: Lang.locale, arguments: args) }

/// y = a + b·x
struct DLLn {
    var a: Double
    var b: Double
    func at(_ x: Double) -> Double { a + b * x }
    func xAt(_ y: Double) -> Double { (y - a) / b }
    func shiftX(_ d: Double) -> DLLn { DLLn(a: a - b * d, b: b) }   // move right by d
    func shiftY(_ d: Double) -> DLLn { DLLn(a: a + d, b: b) }       // move up by d
}

private func meet(_ A: DLLn, _ B: DLLn) -> CGPoint {
    let x = (A.a - B.a) / (B.b - A.b)
    return P(x, A.at(x))
}

/// Part of the line inside the box [lo, hi]²
private func seg(_ L: DLLn, lo: Double = LO, hi: Double = HI) -> [CGPoint]? {
    if abs(L.b) < 1e-9 { return L.a >= lo && L.a <= hi ? [P(lo, L.a), P(hi, L.a)] : nil }
    let xa = (lo - L.a) / L.b, xb = (hi - L.a) / L.b
    let x0 = max(lo, min(xa, xb)), x1 = min(hi, max(xa, xb))
    return x1 - x0 > 0.05 ? [P(x0, L.at(x0)), P(x1, L.at(x1))] : nil
}

private func vseg(_ x: Double) -> [CGPoint] { [P(x, LO), P(x, HI)] }

/// Polygon clipped to [0, 10]² (Sutherland–Hodgman)
private func clipPoly(_ pts: [CGPoint], lo: Double = 0, hi: Double = 10) -> [CGPoint] {
    typealias Edge = (inside: (CGPoint) -> Bool, cut: (CGPoint, CGPoint) -> CGPoint)
    let edges: [Edge] = [
        ({ $0.x >= lo }, { p, q in P(lo, p.y + (q.y - p.y) * (lo - p.x) / (q.x - p.x)) }),
        ({ $0.x <= hi }, { p, q in P(hi, p.y + (q.y - p.y) * (hi - p.x) / (q.x - p.x)) }),
        ({ $0.y >= lo }, { p, q in P(p.x + (q.x - p.x) * (lo - p.y) / (q.y - p.y), lo) }),
        ({ $0.y <= hi }, { p, q in P(p.x + (q.x - p.x) * (hi - p.y) / (q.y - p.y), hi) }),
    ]
    var out = pts
    for (inside, cut) in edges {
        let src = out
        out = []
        for (i, p) in src.enumerated() {
            let q = src[(i + 1) % src.count]
            if inside(p) {
                out.append(p)
                if !inside(q) { out.append(cut(p, q)) }
            } else if inside(q) {
                out.append(cut(p, q))
            }
        }
        if out.isEmpty { return [] }
    }
    return out
}

private func rect(_ x0: Double, _ y0: Double, _ x1: Double, _ y1: Double) -> [CGPoint] {
    [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)]
}

// MARK: - Scene

enum DLKey: CaseIterable { case dD, dS, q, move, c, t, e, dAD, dSRAS, dLRAS, adj, u, dpe }

/// What a drag moves: state[key] along x or y in model units (sign flips it), clamped; `along`
/// follows the demand curve P = 10 − Q.
struct DLDrag {
    enum Axis { case x, y, along }
    let key: DLKey
    let axis: Axis
    var sign: Double = 1
    var min: Double = -10
    var max: Double = 10
}

enum DLLabelAt { case end, top, rightAbove, peak }

struct DLLine {
    var pts: [CGPoint]?
    var label: String
    var kind: String            // d s lr social ctrl world tr hit
    var faded = false
    var drag: DLDrag? = nil
    var labelAt: DLLabelAt = .end
}

struct DLArea {
    let kind: String            // cs ps dwl rev revC revP cost gain loss
    let pts: [CGPoint]
    var label: String? = nil
    init(_ kind: String, _ pts: [CGPoint], _ label: String? = nil) {
        self.kind = kind
        self.pts = clipPoly(pts)
        self.label = label
    }
}

struct DLArrow { let from: CGPoint; let to: CGPoint }

struct DLBracket {
    let from: CGPoint
    let to: CGPoint
    let label: String
    var vertical = false
    var leftSide = false
    var gap = false             // output gaps are drawn in the control colour
}

struct DLPoint {
    let at: CGPoint
    var faded = false
    var label: String? = nil
    var drag: DLDrag? = nil
}

struct DLTick {
    let v: Double
    let label: String
    var faded = false
}

struct DLGuide {
    let at: CGPoint
    var faded = false
    var v = true
    var h = true
}

struct DLZone { let from: CGPoint; let to: CGPoint; let label: String }

struct DLPanel {
    var axisX: String
    var axisY: String
    var lines: [DLLine] = []
    var areas: [DLArea] = []
    var arrows: [DLArrow] = []
    var brackets: [DLBracket] = []
    var points: [DLPoint] = []
    var ticksX: [DLTick] = []
    var ticksY: [DLTick] = []
    var guides: [DLGuide] = []
    var zones: [DLZone] = []
    var mid: (at: CGPoint, label: String)? = nil
    var vlines: [(x: Double, faded: Bool)] = []
}

struct DLScene {
    var panels: [DLPanel]
    var text: [String]
    var legend: [(String, String)] = []         // (area kind, label)
    var canAdjust = false
}

/// One state for every diagram; each diagram reads only its own fields.
struct DLState: Equatable {
    var dD = 0.0, dS = 0.0, surplus = false
    var q = 5.0, move = 0.0
    var mode = "", c = 3.4
    var t = 0.0, el = "unit"
    var e = 2.0
    var dAD = 0.0, dSRAS = 0.0, dLRAS = 0.0, adj = 0.0, adjusted = false
    var u = 5.0, dpe = 0.0
    var cur = "GBP", removed = false

    subscript(k: DLKey) -> Double {
        get {
            switch k {
            case .dD: return dD
            case .dS: return dS
            case .q: return q
            case .move: return move
            case .c: return c
            case .t: return t
            case .e: return e
            case .dAD: return dAD
            case .dSRAS: return dSRAS
            case .dLRAS: return dLRAS
            case .adj: return adj
            case .u: return u
            case .dpe: return dpe
            }
        }
        set {
            switch k {
            case .dD: dD = newValue
            case .dS: dS = newValue
            case .q: q = newValue
            case .move: move = newValue
            case .c: c = newValue
            case .t: t = newValue
            case .e: e = newValue
            case .dAD: dAD = newValue
            case .dSRAS: dSRAS = newValue
            case .dLRAS: dLRAS = newValue
            case .adj: adj = newValue
            case .u: u = newValue
            case .dpe: dpe = newValue
            }
        }
    }

    /// The numbers part way from `a` to `b`; everything else is already `b`'s
    static func mix(_ a: DLState, _ b: DLState, _ k: Double) -> DLState {
        var out = b
        for key in DLKey.allCases { out[key] = a[key] + (b[key] - a[key]) * k }
        return out
    }

    /// A drag from model point m0 to m, starting from this state
    func dragged(_ spec: DLDrag, to m: CGPoint, from m0: CGPoint) -> DLState {
        var s = self
        if spec.axis == .along {
            s.q = clamp((m.x - m.y + 10) / 2, 0.6, 9.4)
            s.move = 0
        } else {
            let delta = spec.axis == .x ? m.x - m0.x : m.y - m0.y
            s[spec.key] = clamp(self[spec.key] + delta * spec.sign, spec.min, spec.max)
        }
        if spec.key != .adj { s.adjusted = false }
        return s
    }
}

// MARK: - Shared pieces

/// A curve shown before and after a change: the old one faded, the new one draggable
private func pair(_ base: DLLn, _ now: DLLn, _ isMoved: Bool, _ name: String, _ kind: String, _ drag: DLDrag) -> [DLLine] {
    if !isMoved { return [DLLine(pts: seg(base), label: name, kind: kind, drag: drag)] }
    return [DLLine(pts: seg(base), label: "\(name)_1", kind: kind, faded: true),
            DLLine(pts: seg(now), label: "\(name)_2", kind: kind, drag: drag)]
}

/// Horizontal arrow from one parallel line to another, at the first height where both are in view
private func shiftArrow(_ A: DLLn, _ B: DLLn, _ levels: [Double]) -> DLArrow? {
    for y in levels {
        let xa = A.xAt(y), xb = B.xAt(y)
        if xa > 0.6 && xa < 9.4 && xb > 0.6 && xb < 9.4 { return DLArrow(from: P(xa, y), to: P(xb, y)) }
    }
    return nil
}

private func dir(_ v: Double, _ tol: Double = 0.08) -> String { v > tol ? "up" : v < -tol ? "down" : "same" }

// MARK: - Supply and demand (also the currency market)

private let D0 = DLLn(a: 9, b: -0.8)
private let S0 = DLLn(a: 1, b: 0.8)

private struct MarketNames { let D, S, P, Q: String }

private func marketPanel(_ st: DLState, _ n: MarketNames, axisX: String, axisY: String) -> (DLPanel, dd: Double, ds: Double, dp: Double, dq: Double) {
    let dd = moved(st.dD) ? st.dD : 0, ds = moved(st.dS) ? st.dS : 0
    let D = D0.shiftX(dd), S = S0.shiftX(ds)
    let e1 = meet(D0, S0), e2 = meet(D, S)
    let changed = dd != 0 || ds != 0
    var p = DLPanel(axisX: axisX, axisY: axisY)
    p.lines = pair(D0, D, dd != 0, n.D, "d", DLDrag(key: .dD, axis: .x, min: -3.5, max: 3.5))
        + pair(S0, S, ds != 0, n.S, "s", DLDrag(key: .dS, axis: .x, min: -3.5, max: 3.5))
    if dd != 0, let a = shiftArrow(D0, D, [2.4, 3.4, 6.6, 7.6]) { p.arrows.append(a) }
    if ds != 0, let a = shiftArrow(S0, S, [2.4, 3.4, 6.6, 7.6]) { p.arrows.append(a) }
    if st.surplus {
        p.areas.append(DLArea("cs", [P(0, D.at(0)), P(0, e2.y), P(e2.x, e2.y)], DL("cs")))
        p.areas.append(DLArea("ps", [P(0, S.at(0)), P(0, e2.y), P(e2.x, e2.y)], DL("ps")))
    }
    p.points = changed ? [DLPoint(at: e1, faded: true), DLPoint(at: e2)] : [DLPoint(at: e1)]
    p.ticksX = changed ? [DLTick(v: e1.x, label: "\(n.Q)_1"), DLTick(v: e2.x, label: "\(n.Q)_2")] : [DLTick(v: e1.x, label: "\(n.Q)_1")]
    p.ticksY = changed ? [DLTick(v: e1.y, label: "\(n.P)_1"), DLTick(v: e2.y, label: "\(n.P)_2")] : [DLTick(v: e1.y, label: "\(n.P)_1")]
    p.guides = (changed ? [e1, e2] : [e1]).map { DLGuide(at: $0) }
    return (p, dd, ds, e2.y - e1.y, e2.x - e1.x)
}

private func sdBuild(_ st: DLState, _ board: String) -> DLScene {
    let (panel, dd, ds, dp, dq) = marketPanel(st, MarketNames(D: "D", S: "S", P: "P", Q: "Q"),
                                              axisX: DL("ax.quantity"), axisY: DL("ax.price"))
    let text: String
    if dd == 0 && ds == 0 { text = DL("d.sd.ex.none") }
    else if dd != 0 && ds == 0 { text = DL(dd > 0 ? "d.sd.ex.dUp" : "d.sd.ex.dDown") }
    else if ds != 0 && dd == 0 { text = DL(ds > 0 ? "d.sd.ex.sUp" : "d.sd.ex.sDown") }
    else { text = DL("d.sd.ex.both", DL("moved." + dir(dp)), DL("moved." + dir(dq))) }
    return DLScene(panels: [panel], text: [text])
}

/// Currency symbol drawn on the curves (D£, S$…)
let DLCurrencies: [(code: String, sym: String)] = [
    ("GBP", "£"), ("USD", "$"), ("EUR", "€"), ("CNY", "¥"), ("JPY", "¥"), ("KRW", "₩"), ("OTHER", ""),
]

private func forexBuild(_ st: DLState, _ board: String) -> DLScene {
    let cur = DLCurrencies.contains { $0.code == st.cur } ? st.cur : "GBP"
    let sym = DLCurrencies.first { $0.code == cur }?.sym ?? ""
    let (panel, dd, ds, dp, _) = marketPanel(st, MarketNames(D: "D\(sym)", S: "S\(sym)", P: "ER", Q: "Q"),
                                             axisX: DL("cur.\(cur).qty"), axisY: DL("cur.\(cur).price"))
    var text: [String] = []
    if dd == 0 && ds == 0 { text = [DL("d.forex.ex.none")] }
    else {
        if dd != 0 && ds == 0 { text = [DL(dd > 0 ? "d.forex.ex.dUp" : "d.forex.ex.dDown")] }
        else if ds != 0 && dd == 0 { text = [DL(ds > 0 ? "d.forex.ex.sUp" : "d.forex.ex.sDown")] }
        else { text = [DL("d.forex.ex.both", DL("d.forex.ex.dir." + dir(dp)))] }
        if dir(dp) == "up" { text.append(DL("d.forex.ex.appEffects")) }
        if dir(dp) == "down" { text.append(DL("d.forex.ex.depEffects")) }
    }
    return DLScene(panels: [panel], text: text)
}

// MARK: - Price ceiling and floor

private func controlsBuild(_ st: DLState, _ board: String) -> DLScene {
    let ceiling = st.mode != "floor"
    let c = st.c
    let e = meet(D0, S0)
    let qe = e.x, pe = e.y
    let qs = S0.xAt(c), qd = D0.xAt(c)
    let binding = ceiling ? c < pe - 0.05 : c > pe + 0.05
    let tag = board == "ap" ? (ceiling ? "P_c" : "P_f") : (ceiling ? "P_{max}" : "P_{min}")
    var p = DLPanel(axisX: DL("ax.quantity"), axisY: DL("ax.price"))
    p.lines = [
        DLLine(pts: seg(D0), label: "D", kind: "d"),
        DLLine(pts: seg(S0), label: "S", kind: "s"),
        DLLine(pts: seg(DLLn(a: c, b: 0)), label: DL(ceiling ? "d.controls.ceilingLine.\(board)" : "d.controls.floorLine.\(board)"),
               kind: "ctrl", drag: DLDrag(key: .c, axis: .y, min: 1.4, max: 8.6), labelAt: .rightAbove),
    ]
    let traded = binding ? min(qs, qd) : qe
    if binding {
        let top = D0.at(traded), bot = S0.at(traded)
        p.areas.append(DLArea("dwl", [P(traded, top), P(qe, pe), P(traded, bot)], DL("dwl")))
        if st.surplus {
            p.areas.append(DLArea("cs", ceiling ? [P(0, c), P(0, D0.at(0)), P(traded, top), P(traded, c)]
                                                : [P(0, c), P(0, D0.at(0)), P(traded, c)], DL("cs")))
            p.areas.append(DLArea("ps", ceiling ? [P(0, S0.at(0)), P(0, c), P(traded, c)]
                                                : [P(0, S0.at(0)), P(0, c), P(traded, c), P(traded, bot)], DL("ps")))
        }
        let y = ceiling ? c - 0.5 : c + 0.5
        p.brackets.append(DLBracket(from: P(min(qs, qd), y), to: P(max(qs, qd), y),
                                    label: DL(ceiling ? "d.controls.shortage" : "d.controls.surplus")))
    } else if st.surplus {
        p.areas.append(DLArea("cs", [P(0, D0.at(0)), P(0, pe), P(qe, pe)], DL("cs")))
        p.areas.append(DLArea("ps", [P(0, S0.at(0)), P(0, pe), P(qe, pe)], DL("ps")))
    }
    p.points = [DLPoint(at: e, faded: binding)]
    p.ticksX = binding ? [DLTick(v: qs, label: "Q_s"), DLTick(v: qe, label: "Q_e", faded: true), DLTick(v: qd, label: "Q_d")]
                       : [DLTick(v: qe, label: "Q_e")]
    p.ticksY = [DLTick(v: pe, label: "P_e", faded: binding), DLTick(v: c, label: tag)]
    p.guides = binding ? [DLGuide(at: P(qs, c)), DLGuide(at: P(qd, c)), DLGuide(at: e, faded: true)] : [DLGuide(at: e)]
    let text = binding
        ? [DL(ceiling ? "d.controls.ex.ceilingOn" : "d.controls.ex.floorOn"), DL(ceiling ? "d.controls.ex.ceilingMore" : "d.controls.ex.floorMore")]
        : [DL(ceiling ? "d.controls.ex.ceilingOff" : "d.controls.ex.floorOff")]
    return DLScene(panels: [p], text: text)
}

// MARK: - Indirect tax and subsidy

private let PED_SLOPES: [String: Double] = ["elastic": 0.42, "unit": 0.8, "inelastic": 1.7]

private func taxBuild(_ st: DLState, _ board: String) -> DLScene {
    let subsidy = st.mode == "subsidy"
    let b = PED_SLOPES[st.el] ?? 0.8
    let D = DLLn(a: 5 + 5 * b, b: -b)                 // pivots on the untaxed equilibrium (5, 5)
    let t = moved(st.t) ? st.t : 0
    let S2 = S0.shiftY(subsidy ? -t : t)
    let e1 = meet(D, S0), e2 = meet(D, S2)
    let q1 = e1.x, p1 = e1.y, q2 = e2.x, p2 = e2.y
    let p3 = subsidy ? p2 + t : p2 - t                 // what producers keep
    var p = DLPanel(axisX: DL("ax.quantity"), axisY: DL("ax.price"))
    p.lines = [DLLine(pts: seg(D), label: "D", kind: "d")]
    if t != 0 { p.lines.append(DLLine(pts: seg(S0), label: "S_1", kind: "s", faded: true)) }
    p.lines.append(DLLine(pts: seg(S2), label: t != 0 ? "S_2" : "S", kind: "s",
                          drag: DLDrag(key: .t, axis: .y, sign: subsidy ? -1 : 1, min: 0, max: 3.4)))
    var legend: [(String, String)] = []
    if t != 0 {
        if subsidy { p.areas.append(DLArea("cost", rect(0, p2, q2, p3), DL("d.tax.govCost"))) }
        else {
            p.areas.append(DLArea("revC", rect(0, p1, q2, p2), DL("d.tax.consShare")))
            p.areas.append(DLArea("revP", rect(0, p3, q2, p1), DL("d.tax.prodShare")))
        }
        p.areas.append(DLArea("dwl", [P(q1, p1), P(q2, p2), P(q2, p3)], DL("dwl")))
        let bx = q2 + (subsidy ? 0.35 : -0.35)         // beside Q2, away from the deadweight-loss triangle
        p.brackets.append(DLBracket(from: P(bx, min(p2, p3)), to: P(bx, max(p2, p3)),
                                    label: DL(subsidy ? "d.tax.perUnitS" : "d.tax.perUnitT"), vertical: true, leftSide: !subsidy))
        legend = subsidy ? [("cost", DL("d.tax.govCost")), ("dwl", DL("dwl"))]
                         : [("revC", DL("d.tax.consShare")), ("revP", DL("d.tax.prodShare")), ("dwl", DL("dwl"))]
    }
    // Share of the tax (or subsidy) that shows up in the consumer price
    let consShare = b / (b + S0.b)
    let who = consShare > 0.58 ? "cons" : consShare < 0.42 ? "prod" : "even"
    let text = t == 0 ? [DL("d.tax.ex.none")]
        : [DL(subsidy ? "d.tax.ex.subsidy" : "d.tax.ex.tax"), DL((subsidy ? "d.tax.ex.subInc." : "d.tax.ex.taxInc.") + who)]
    p.points = t != 0 ? [DLPoint(at: e1, faded: true), DLPoint(at: e2)] : [DLPoint(at: e1)]
    p.ticksX = t != 0 ? [DLTick(v: q1, label: "Q_1"), DLTick(v: q2, label: "Q_2")] : [DLTick(v: q1, label: "Q_1")]
    p.ticksY = t != 0 ? [DLTick(v: p1, label: "P_1"), DLTick(v: p2, label: "P_2"), DLTick(v: p3, label: "P_3")] : [DLTick(v: p1, label: "P_1")]
    p.guides = t != 0 ? [DLGuide(at: e1), DLGuide(at: P(q2, max(p2, p3))), DLGuide(at: P(q2, min(p2, p3)), v: false)] : [DLGuide(at: e1)]
    return DLScene(panels: [p], text: text, legend: legend)
}

// MARK: - Price elasticity of demand and total revenue

private func pedBuild(_ st: DLState, _ board: String) -> DLScene {
    let DLine = DLLn(a: 10, b: -1)                    // P = 10 − Q, so |PED| = P / Q
    let q = clamp(st.q, 0.6, 9.4), p = 10 - q
    let step = 1.1 * st.move
    let p2 = clamp(p + step, 0.5, 9.5), q2 = 10 - p2
    let ped = p / q
    let kind = ped > 1.08 ? "elastic" : ped < 0.92 ? "inelastic" : "unit"
    let changed = abs(p2 - p) > 0.05
    var main = DLPanel(axisX: DL("ax.quantity"), axisY: DL("ax.price"))
    main.lines = [DLLine(pts: seg(DLine), label: "D", kind: "d")]
    main.points = [DLPoint(at: P(q, p), drag: DLDrag(key: .q, axis: .along))]
    if !changed { main.areas.append(DLArea("rev", rect(0, 0, q, p), DL("d.ped.tr"))) }
    else {
        main.areas.append(DLArea("rev", rect(0, 0, min(q, q2), min(p, p2))))
        if p2 > p {
            main.areas.append(DLArea("gain", rect(0, p, q2, p2)))
            main.areas.append(DLArea("loss", rect(q2, 0, q, p)))
        } else {
            main.areas.append(DLArea("gain", rect(q, 0, q2, p2)))
            main.areas.append(DLArea("loss", rect(0, p2, q, p)))
        }
        main.points.append(DLPoint(at: P(q2, p2)))
    }
    let tr1 = p * q, tr2 = p2 * q2
    let pedText = String(format: ped < 10 ? "%.2f" : "%.1f", locale: Lang.locale, ped)
    var text = [DL("d.ped.ex.at", pedText, DL("d.ped.kind." + kind))]
    if !changed { text.append(DL("d.ped.ex.none")) }
    else if abs(tr2 - tr1) < 0.35 { text.append(DL("d.ped.ex.flat")) }
    else if p2 > p { text.append(DL(tr2 > tr1 ? "d.ped.ex.riseUp" : "d.ped.ex.riseDown")) }
    else { text.append(DL(tr2 > tr1 ? "d.ped.ex.cutUp" : "d.ped.ex.cutDown")) }
    main.ticksX = changed ? [DLTick(v: q, label: "Q_1"), DLTick(v: q2, label: "Q_2")] : [DLTick(v: q, label: "Q_1")]
    main.ticksY = changed ? [DLTick(v: p, label: "P_1"), DLTick(v: p2, label: "P_2")] : [DLTick(v: p, label: "P_1")]
    main.guides = (changed ? [P(q, p), P(q2, p2)] : [P(q, p)]).map { DLGuide(at: $0) }
    main.zones = [DLZone(from: P(0.6, 9.4), to: P(5, 5), label: DL("d.ped.kind.elastic")),
                  DLZone(from: P(5, 5), to: P(9.4, 0.6), label: DL("d.ped.kind.inelastic"))]
    main.mid = (P(5, 5), "|PED| = 1")
    // TR = P·Q = 10Q − Q², drawn in the lower panel (scaled into 0..10 by /2.6)
    let tr = { (x: Double) in (10 * x - x * x) / 2.6 }
    var lower = DLPanel(axisX: DL("ax.quantity"), axisY: DL("ax.tr"))
    lower.lines = [DLLine(pts: stride(from: 0.0, through: 10.0001, by: 0.25).map { P($0, tr($0)) }, label: "TR", kind: "tr", labelAt: .peak)]
    lower.points = [DLPoint(at: P(q, tr(q)))] + (changed ? [DLPoint(at: P(q2, tr(q2)), faded: true)] : [])
    lower.vlines = [(5, true)]
    return DLScene(panels: [main, lower], text: text,
                   legend: changed ? [("gain", DL("d.ped.gained")), ("loss", DL("d.ped.lost"))] : [("rev", DL("d.ped.tr"))])
}

// MARK: - AD–AS

/// SRAS shift that brings output back to full employment, given the AD and LRAS now in place
func adasAdjust(_ st: DLState) -> Double {
    let AD = D0.shiftX(moved(st.dAD) ? st.dAD : 0)
    let yf = 5 + (moved(st.dLRAS) ? st.dLRAS : 0)
    let sr = S0.shiftX(moved(st.dSRAS) ? st.dSRAS : 0)
    return yf - sr.xAt(AD.at(yf))                    // SRAS must pass through (yf, AD(yf))
}

private func adasBuild(_ st: DLState, _ board: String) -> DLScene {
    let pl = board == "alevel" ? "P" : "PL"
    let yfName = board == "alevel" ? "Y_f" : board == "ib" ? "Y_p" : "Y_F"
    let dAD = moved(st.dAD) ? st.dAD : 0, dSR = moved(st.dSRAS) ? st.dSRAS : 0, dLR = moved(st.dLRAS) ? st.dLRAS : 0
    let adj = st.adjusted && moved(st.adj) ? st.adj : 0
    let AD = D0.shiftX(dAD), SR = S0.shiftX(dSR), SR3 = SR.shiftX(adj)
    let yf0 = 5.0, yf = 5 + dLR
    let e1 = meet(D0, S0), e2 = meet(AD, SR), e3 = meet(AD, SR3)
    var p = DLPanel(axisX: DL(board == "alevel" ? "ax.realOutput" : "ax.realGdp"), axisY: DL("ax.pl"))
    p.lines = pair(D0, AD, dAD != 0, "AD", "d", DLDrag(key: .dAD, axis: .x, min: -3.2, max: 3.2))
    // SRAS can have three stages: before, after the shock, after long-run adjustment
    var srStages = [S0]
    if dSR != 0 { srStages.append(SR) }
    if adj != 0 { srStages.append(SR3) }
    for (i, Ls) in srStages.enumerated() {
        let last = i == srStages.count - 1
        p.lines.append(DLLine(pts: seg(Ls), label: srStages.count > 1 ? "SRAS_\(i + 1)" : "SRAS", kind: "s", faded: !last,
                              drag: last ? DLDrag(key: adj != 0 ? .adj : .dSRAS, axis: .x, min: -3.2, max: 3.2) : nil))
    }
    if dLR != 0 { p.lines.append(DLLine(pts: vseg(yf0), label: "LRAS_1", kind: "lr", faded: true)) }
    p.lines.append(DLLine(pts: vseg(yf), label: dLR != 0 ? "LRAS_2" : "LRAS", kind: "lr",
                          drag: DLDrag(key: .dLRAS, axis: .x, min: -2.5, max: 3), labelAt: .top))

    var stages = [e1]
    if dAD != 0 || dSR != 0 { stages.append(e2) }
    if adj != 0 { stages.append(e3) }
    let final = stages[stages.count - 1]
    p.ticksX = stages.enumerated().map { i, e in DLTick(v: e.x, label: stages.count > 1 ? "Y_\(i + 1)" : "Y_1") }
    p.ticksX.append(DLTick(v: yf0, label: dLR != 0 ? "\(yfName)1" : yfName, faded: dLR != 0))
    if dLR != 0 { p.ticksX.append(DLTick(v: yf, label: "\(yfName)2")) }
    p.ticksY = stages.enumerated().map { i, e in DLTick(v: e.y, label: "\(pl)_\(i + 1)") }
    if dAD != 0, let a = shiftArrow(D0, AD, [2.2, 3.2, 7.2]) { p.arrows.append(a) }
    if dSR != 0, let a = shiftArrow(S0, SR, [7.6, 6.6, 2.4]) { p.arrows.append(a) }
    if adj != 0, let a = shiftArrow(SR, SR3, [7.6, 6.6, 2.4]) { p.arrows.append(a) }
    let gap = final.x - yf
    if abs(gap) > 0.2 {
        p.brackets.append(DLBracket(from: P(final.x, 0.75), to: P(yf, 0.75),
                                    label: DL(gap < 0 ? "d.adas.gapShort.\(board)" : "d.adas.gapShortInf.\(board)"), gap: true))
    }
    p.points = stages.enumerated().map { i, e in
        DLPoint(at: e, faded: i < stages.count - 1, label: stages.count > 1 ? ["A", "B", "C"][i] : nil)
    }
    p.guides = stages.map { DLGuide(at: $0) }

    var text: [String] = []
    let changes = [dAD != 0, dSR != 0, dLR != 0].filter { $0 }.count
    if changes == 0 { text.append(DL("d.adas.ex.none")) }
    else if changes == 1 || (dLR != 0 && dSR != 0 && dAD == 0 && abs(dLR - dSR) < 0.3) {
        text.append(DL(dLR != 0 ? "d.adas.ex.lras" : dAD != 0 ? (dAD > 0 ? "d.adas.ex.adUp" : "d.adas.ex.adDown")
                                                     : (dSR > 0 ? "d.adas.ex.srasUp" : "d.adas.ex.srasDown")))
    } else { text.append(DL("d.adas.ex.mixed")) }
    if adj != 0 { text.append(DL("d.adas.ex.adjusted")) }
    if changes > 0 {
        text.append(gap < -0.2 ? DL("d.adas.ex.gapRec", DL("d.adas.gap.\(board).rec"))
                    : gap > 0.2 ? DL("d.adas.ex.gapInf", DL("d.adas.gap.\(board).inf")) : DL("d.adas.ex.atFull"))
    }
    return DLScene(panels: [p], text: text, canAdjust: changes > 0 && abs(gap) > 0.2 && adj == 0)
}

// MARK: - Phillips curve

private let NRU = 5.0
private let PE0 = 3.4
private func srpc(_ pe: Double) -> (Double) -> Double { { u in pe + 1.55 * (exp(-0.45 * (u - NRU)) - 1) } }
private func curvePts(_ f: (Double) -> Double) -> [CGPoint] {
    stride(from: 0.3, through: 9.71, by: 0.1).compactMap { u in
        let y = f(u)
        return y >= LO && y <= HI ? P(u, y) : nil
    }
}

private func phillipsBuild(_ st: DLState, _ board: String) -> DLScene {
    let dpe = moved(st.dpe) ? st.dpe : 0
    let u = moved(st.u - NRU) ? st.u : NRU
    let um = moved(u - NRU)
    let f2 = srpc(PE0 + dpe)
    let A = P(NRU, PE0), B = P(u, f2(u))
    let adjusted = st.adjusted && (um || dpe != 0)
    let C = P(NRU, B.y)
    var p = DLPanel(axisX: DL("ax.unemployment"), axisY: DL("ax.inflation"))
    p.lines = [DLLine(pts: vseg(NRU), label: "LRPC", kind: "lr", labelAt: .top)]
    var stages = [PE0]
    if dpe != 0 { stages.append(PE0 + dpe) }
    if adjusted && um { stages.append(B.y) }
    for (i, pe) in stages.enumerated() {
        let last = i == stages.count - 1
        p.lines.append(DLLine(pts: curvePts(srpc(pe)), label: stages.count > 1 ? "SRPC_\(i + 1)" : "SRPC", kind: "s", faded: !last,
                              drag: last && !adjusted ? DLDrag(key: .dpe, axis: .y, min: -2.2, max: 3.2) : nil))
    }
    let pointDrag = DLDrag(key: .u, axis: .x, min: 1.2, max: 9.4)
    var points = [DLPoint(at: A, faded: dpe != 0 || um, label: "A")]
    if dpe != 0 || um { points.append(DLPoint(at: B, faded: adjusted, label: "B", drag: adjusted ? nil : pointDrag)) }
    else { points[0].drag = pointDrag }
    if adjusted && um { points.append(DLPoint(at: C, label: "C")) }
    p.points = points
    let shown = points.map(\.at)
    var text: [String] = []
    if dpe == 0 && !um { text.append(DL("d.phillips.ex.none")) }
    else if dpe != 0 && um { text.append(DL("d.phillips.ex.combined")) }
    else if dpe != 0 { text.append(DL(dpe > 0 ? "d.phillips.ex.shiftUp" : "d.phillips.ex.shiftDown")) }
    else { text.append(DL(u < NRU ? "d.phillips.ex.moveUp" : "d.phillips.ex.moveDown")) }
    if adjusted && um { text.append(DL("d.phillips.ex.adjusted")) }
    p.ticksX = [DLTick(v: NRU, label: "NRU")] + (um ? [DLTick(v: u, label: "U_1")] : [])
    p.ticksY = shown.enumerated().map { i, pt in DLTick(v: pt.y, label: "π_\(i + 1)", faded: i < shown.count - 1) }
    p.guides = shown.map { DLGuide(at: $0) }
    return DLScene(panels: [p], text: text, canAdjust: um && !adjusted)
}

// MARK: - Tariff (small open economy)

private let TD = DLLn(a: 9.5, b: -0.85)
private let TS = DLLn(a: 0.8, b: 0.85)
private let PW = 2.6

private func tariffBuild(_ st: DLState, _ board: String) -> DLScene {
    let t = max(0, st.t)
    let e = meet(TD, TS)
    let pe = e.y
    let pt = min(PW + t, pe), prohibitive = PW + t >= pe - 0.02
    let q1 = TS.xAt(PW), q4 = TD.xAt(PW), q2 = TS.xAt(pt), q3 = TD.xAt(pt)
    let drag = DLDrag(key: .t, axis: .y, min: 0, max: 3.6)
    let on = t > 0.05
    var p = DLPanel(axisX: DL("ax.quantity"), axisY: DL("ax.price"))
    p.lines = [
        DLLine(pts: seg(TD), label: "D_{dom}", kind: "d"),
        DLLine(pts: seg(TS), label: "S_{dom}", kind: "s"),
        DLLine(pts: seg(DLLn(a: PW, b: 0)), label: "S_w", kind: "world", labelAt: .rightAbove),
    ]
    if on {
        p.lines.append(DLLine(pts: seg(DLLn(a: PW + t, b: 0)), label: "S_w + t", kind: "ctrl", drag: drag, labelAt: .rightAbove))
        p.areas.append(DLArea("ps", [P(0, PW), P(q1, PW), P(q2, pt), P(0, pt)], "a"))
        p.areas.append(DLArea("dwl", [P(q1, PW), P(q2, PW), P(q2, pt)], "b"))
        if !prohibitive { p.areas.append(DLArea("rev", rect(q2, PW, q3, pt), "c")) }
        p.areas.append(DLArea("dwl", [P(q3, PW), P(q4, PW), P(q3, pt)], "d"))
        // both import brackets sit under the world price, where no curve runs
        if q3 - q2 > 1.2 { p.brackets.append(DLBracket(from: P(q2, PW - 1.6), to: P(q3, PW - 1.6), label: DL("d.tariff.importsTariff"))) }
    } else {
        // an invisible line on top of the world price, to drag a tariff into place
        p.lines.append(DLLine(pts: seg(DLLn(a: PW + 0.001, b: 0)), label: "", kind: "hit", drag: drag))
    }
    p.brackets.append(DLBracket(from: P(q1, PW - 0.8), to: P(q4, PW - 0.8), label: DL("d.tariff.importsFree")))
    let text = !on ? [DL("d.tariff.ex.none")] : prohibitive ? [DL("d.tariff.ex.prohibitive")]
        : st.removed ? [DL("d.tariff.ex.removed")] : [DL("d.tariff.ex.imposed"), DL("d.tariff.ex.areas")]
    p.points = prohibitive ? [DLPoint(at: e)] : []
    p.ticksX = on ? [DLTick(v: q1, label: "Q_1"), DLTick(v: q2, label: "Q_2"), DLTick(v: q3, label: "Q_3"), DLTick(v: q4, label: "Q_4")]
                  : [DLTick(v: q1, label: "Q_1"), DLTick(v: q4, label: "Q_4")]
    p.ticksY = [DLTick(v: PW, label: "P_w")] + (on ? [DLTick(v: pt, label: prohibitive ? "P_e" : "P_w + t")] : [])
    p.guides = (on ? [P(q1, PW), P(q2, pt), P(q3, pt), P(q4, PW)] : [P(q1, PW), P(q4, PW)]).map { DLGuide(at: $0) }
    let legend: [(String, String)] = on && !prohibitive
        ? [("ps", DL("d.tariff.legend.a")), ("dwl", DL("d.tariff.legend.b")), ("rev", DL("d.tariff.legend.c")), ("dwl", DL("d.tariff.legend.d"))] : []
    return DLScene(panels: [p], text: text, legend: legend)
}

// MARK: - Externalities

private let EXT: [String: (cost: Bool, sign: Double)] = [
    // which curve the externality moves, and which way
    "neg_production": (true, 1), "pos_production": (true, -1),
    "neg_consumption": (false, -1), "pos_consumption": (false, 1),
]

private func externalityBuild(_ st: DLState, _ board: String) -> DLScene {
    let mode = EXT[st.mode] != nil ? st.mode : "neg_production"
    let (cost, sign) = EXT[mode]!
    let e = clamp(st.e, 0.3, 3.6)
    let MPB = D0, MPC = S0
    let social = cost ? MPC.shiftY(sign * e) : MPB.shiftY(sign * e)
    let MSB = cost ? MPB : social, MSC = cost ? social : MPC
    let m = meet(MPB, MPC), o = meet(MSB, MSC)
    let n = board == "ib" ? (qm: "Q_m", qo: "Q_{opt}", pm: "P_m", po: "P_{opt}") : (qm: "Q_m", qo: "Q*", pm: "P_m", po: "P*")
    let drag = DLDrag(key: .e, axis: .y, sign: sign, min: 0.3, max: 3.6)
    var p = DLPanel(axisX: DL("ax.quantity"), axisY: DL("ax.costsBenefits"))
    p.lines = cost
        ? [DLLine(pts: seg(MPB), label: "MPB = MSB", kind: "d"), DLLine(pts: seg(MPC), label: "MPC", kind: "s"),
           DLLine(pts: seg(MSC), label: "MSC", kind: "social", drag: drag)]
        : [DLLine(pts: seg(MPB), label: "MPB", kind: "d"), DLLine(pts: seg(MSB), label: "MSB", kind: "social", drag: drag),
           DLLine(pts: seg(MPC), label: "MPC = MSC", kind: "s")]
    // The welfare-loss triangle: between MSC and MSB, from the market quantity to the optimum
    p.areas = [DLArea("dwl", [o, P(m.x, MSB.at(m.x)), P(m.x, MSC.at(m.x))])]
    p.points = [DLPoint(at: m), DLPoint(at: o)]
    p.ticksX = [DLTick(v: m.x, label: n.qm), DLTick(v: o.x, label: n.qo)]
    p.ticksY = [DLTick(v: m.y, label: n.pm), DLTick(v: o.y, label: n.po)]
    p.guides = [DLGuide(at: m), DLGuide(at: o)]
    return DLScene(panels: [p], text: [DL("d.externality.ex." + mode), DL("d.externality.policy." + mode)],
                   legend: [("dwl", DL("welfareLoss"))])
}

// MARK: - Registry

typealias DLChange = (inout DLState) -> Void

struct DiagramDef: Identifiable {
    let id: String
    let build: (DLState, String) -> DLScene
    let base: DLState
    let shocks: [(key: String, change: DLChange)]
    var modes: [String] = []
    var modeDefaults: [String: DLChange] = [:]
    var elastic: [String] = []
    var surplusToggle = false

    var name: String { DL("d.\(id).name") }
    var blurb: String { DL("d.\(id).blurb") }
    var tip: String { DL("d.\(id).tip") }
    func shockText(_ key: String) -> String { DL("d.\(id).shocks.\(key)") }
}

enum DiagramLab {
    static let groups: [(key: String, ids: [String])] = [
        ("micro", ["sd", "ped", "controls", "tax", "externality"]),
        ("macro", ["adas", "phillips"]),
        ("intl", ["forex", "tariff"]),
    ]

    private static func state(_ f: DLChange) -> DLState {
        var s = DLState()
        f(&s)
        return s
    }

    static let all: [DiagramDef] = [
        DiagramDef(id: "sd", build: sdBuild, base: state { $0.dD = 0; $0.dS = 0 },
                   shocks: [("incomes", { $0.dD = 1.6 }), ("substitute", { $0.dD = 1.3 }), ("complement", { $0.dD = -1.4 }), ("scare", { $0.dD = -1.8 }),
                            ("opec", { $0.dS = -1.6 }), ("harvest", { $0.dS = -1.8 }), ("costs", { $0.dS = -1.2 }), ("tech", { $0.dS = 1.6 }), ("reserves", { $0.dS = 1.2 })],
                   surplusToggle: true),
        DiagramDef(id: "ped", build: pedBuild, base: state { $0.q = 5; $0.move = 0 },
                   shocks: [("petrol", { $0.q = 7.2; $0.move = 1 }), ("brand", { $0.q = 2.6; $0.move = 1 }),
                            ("fares", { $0.q = 2.6; $0.move = -1 }), ("crop", { $0.q = 7.2; $0.move = -1 })]),
        DiagramDef(id: "controls", build: controlsBuild, base: state { $0.mode = "ceiling"; $0.c = 3.4 },
                   shocks: [("rent", { $0.mode = "ceiling"; $0.c = 3.2 }), ("energy", { $0.mode = "ceiling"; $0.c = 3.9 }),
                            ("alcohol", { $0.mode = "floor"; $0.c = 6.4 }), ("farm", { $0.mode = "floor"; $0.c = 7.0 })],
                   modes: ["ceiling", "floor"], modeDefaults: ["ceiling": { $0.c = 3.4 }, "floor": { $0.c = 6.6 }], surplusToggle: true),
        DiagramDef(id: "tax", build: taxBuild, base: state { $0.mode = "tax"; $0.t = 1.6; $0.el = "unit" },
                   shocks: [("sugar", { $0.mode = "tax"; $0.t = 1.6; $0.el = "unit" }), ("fuel", { $0.mode = "tax"; $0.t = 1.8; $0.el = "inelastic" }),
                            ("substitutes", { $0.mode = "tax"; $0.t = 1.6; $0.el = "elastic" }),
                            ("solar", { $0.mode = "subsidy"; $0.t = 1.6; $0.el = "unit" }), ("staple", { $0.mode = "subsidy"; $0.t = 1.4; $0.el = "inelastic" })],
                   modes: ["tax", "subsidy"], elastic: ["elastic", "unit", "inelastic"]),
        DiagramDef(id: "externality", build: externalityBuild, base: state { $0.mode = "neg_production"; $0.e = 2 },
                   shocks: [("factory", { $0.mode = "neg_production"; $0.e = 2.2 }), ("flights", { $0.mode = "neg_production"; $0.e = 1.5 }),
                            ("vaccines", { $0.mode = "pos_consumption"; $0.e = 2.2 }), ("education", { $0.mode = "pos_consumption"; $0.e = 1.6 }),
                            ("smoking", { $0.mode = "neg_consumption"; $0.e = 2 }), ("training", { $0.mode = "pos_production"; $0.e = 1.8 })],
                   modes: ["neg_production", "pos_consumption", "neg_consumption", "pos_production"]),
        DiagramDef(id: "adas", build: adasBuild, base: DLState(),
                   shocks: [("rates_up", { $0.dAD = -1.5 }), ("rates_down", { $0.dAD = 1.5 }), ("spending", { $0.dAD = 1.5 }),
                            ("confidence", { $0.dAD = -1.8 }), ("exports", { $0.dAD = 1.2 }), ("opec", { $0.dSRAS = -1.5 }),
                            ("wages", { $0.dSRAS = -1.1 }), ("energy_down", { $0.dSRAS = 1.3 }), ("productivity", { $0.dLRAS = 1.2; $0.dSRAS = 1.2 })]),
        DiagramDef(id: "phillips", build: phillipsBuild, base: state { $0.u = NRU; $0.dpe = 0 },
                   shocks: [("ad_up", { $0.u = 3.6 }), ("ad_down", { $0.u = 6.8 }), ("oil", { $0.dpe = 1.8; $0.u = 5.9 }),
                            ("expect_up", { $0.dpe = 1.8 }), ("credible", { $0.dpe = -1.5 })]),
        DiagramDef(id: "forex", build: forexBuild, base: state { $0.cur = "GBP" },
                   shocks: [("rates", { $0.dD = 1.5 }), ("exports", { $0.dD = 1.3 }), ("tourists", { $0.dD = 1.0 }),
                            ("spec", { $0.dD = -1.3 }), ("imports", { $0.dS = 1.4 }), ("capital", { $0.dS = 1.6 })]),
        DiagramDef(id: "tariff", build: tariffBuild, base: state { $0.t = 1.6; $0.removed = false },
                   shocks: [("steel", { $0.t = 1.6 }), ("small", { $0.t = 0.8 }), ("prohibitive", { $0.t = 3.0 }),
                            ("removed", { $0.t = 1.6; $0.removed = true })]),
    ]

    static func def(_ id: String) -> DiagramDef { all.first { $0.id == id } ?? all[0] }
}
