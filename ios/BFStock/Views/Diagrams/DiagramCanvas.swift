import SwiftUI
import UIKit
import UIKit.UIGestureRecognizerSubclass

// Draws a DLScene as an exam-style diagram (a port of frontend/src/components/diagrams/DiagramSVG.jsx):
// axes with titles, curves labelled at their ends, dashed guides to P₁/Q₁-style tick labels, shaded
// areas, shift arrows and brackets. Curves and points that carry a drag spec can be dragged; a touch
// anywhere else still scrolls the page.

enum DLPalette {
    static let ink2 = Color.secondary

    static func curve(_ kind: String) -> Color {
        switch kind {
        case "d": return Color(light: Color(r: 0x25, g: 0x63, b: 0xEB), dark: Color(r: 0x60, g: 0xA5, b: 0xFA))
        case "s": return Color(light: Color(r: 0xEA, g: 0x58, b: 0x0C), dark: Color(r: 0xFB, g: 0x92, b: 0x3C))
        case "lr": return Color(light: Color(r: 0x7C, g: 0x3A, b: 0xED), dark: Color(r: 0xC0, g: 0x84, b: 0xFC))
        case "social": return Color(light: Color(r: 0x93, g: 0x33, b: 0xEA), dark: Color(r: 0xD8, g: 0xB4, b: 0xFE))
        case "ctrl": return Color(light: Color(r: 0xDC, g: 0x26, b: 0x26), dark: Color(r: 0xF8, g: 0x71, b: 0x71))
        case "world": return Color(light: Color(r: 0x0D, g: 0x94, b: 0x88), dark: Color(r: 0x2D, g: 0xD4, b: 0xBF))
        case "tr": return Color(light: Color(r: 0x16, g: 0xA3, b: 0x4A), dark: Color(r: 0x4A, g: 0xDE, b: 0x80))
        default: return .primary
        }
    }

    static func fill(_ kind: String) -> Color {
        func c(_ l: (Int, Int, Int, Double), _ d: (Int, Int, Int, Double)) -> Color {
            Color(light: Color(r: l.0, g: l.1, b: l.2, a: l.3), dark: Color(r: d.0, g: d.1, b: d.2, a: d.3))
        }
        switch kind {
        case "cs": return c((37, 99, 235, 0.15), (96, 165, 250, 0.16))
        case "ps": return c((234, 88, 12, 0.15), (251, 146, 60, 0.16))
        case "dwl", "loss": return c((220, 38, 38, 0.28), (248, 113, 113, 0.32))
        case "rev": return c((22, 163, 74, 0.2), (74, 222, 128, 0.17))
        case "revC", "gain": return c((22, 163, 74, 0.32), (74, 222, 128, 0.29))
        case "revP": return c((13, 148, 136, 0.17), (45, 212, 191, 0.16))
        case "cost": return c((202, 138, 4, 0.26), (250, 204, 21, 0.22))
        default: return Color.secondary.opacity(0.15)
        }
    }
}

/// Drawing space, the same as the web's SVG viewBox: 430 wide, one or two panels.
enum DLLayout {
    static let W: CGFloat = 430
    static let X0: CGFloat = 58
    static let X1: CGFloat = 392

    static func height(_ panels: Int) -> CGFloat { panels > 1 ? 486 : 336 }
    static func box(_ i: Int, of panels: Int) -> (top: CGFloat, bottom: CGFloat) {
        panels > 1 ? (i == 0 ? (34, 264) : (336, 442)) : (34, 290)
    }

    static func X(_ x: Double) -> CGFloat { X0 + CGFloat(x / 10) * (X1 - X0) }
    static func Y(_ y: Double, _ box: (top: CGFloat, bottom: CGFloat)) -> CGFloat {
        box.bottom - CGFloat(y / 10) * (box.bottom - box.top)
    }

    /// Model point (0–10) under a point in drawing space
    static func model(_ p: CGPoint, _ box: (top: CGFloat, bottom: CGFloat)) -> CGPoint {
        CGPoint(x: Double((p.x - X0) / (X1 - X0)) * 10, y: Double((box.bottom - p.y) / (box.bottom - box.top)) * 10)
    }
}

// MARK: - Labels with subscripts ("P_{max}", "S_2")

private func labelParts(_ text: String) -> [(String, Bool)] {
    guard let re = try? NSRegularExpression(pattern: "_(\\{([^}]*)\\}|([0-9A-Za-z*]+))") else { return [(text, false)] }
    let ns = text as NSString
    var out: [(String, Bool)] = []
    var last = 0
    for m in re.matches(in: text, range: NSRange(location: 0, length: ns.length)) {
        if m.range.location > last { out.append((ns.substring(with: NSRange(location: last, length: m.range.location - last)), false)) }
        let r = m.range(at: 2).location != NSNotFound ? m.range(at: 2) : m.range(at: 3)
        out.append((ns.substring(with: r), true))
        last = m.range.location + m.range.length
    }
    if last < ns.length { out.append((ns.substring(from: last), false)) }
    return out
}

private func richText(_ text: String, size: CGFloat, weight: Font.Weight, color: Color) -> Text {
    labelParts(text).reduce(Text("")) { acc, part in
        let t = part.1
            ? Text(part.0).font(.system(size: size * 0.72, weight: weight)).baselineOffset(-size * 0.28)
            : Text(part.0).font(.system(size: size, weight: weight))
        return acc + t.foregroundColor(color)
    }
}

/// Same estimate as the web, so labels are spaced the same way
private func textWidth(_ text: String, _ size: CGFloat) -> CGFloat {
    var w: CGFloat = 0
    for (t, sub) in labelParts(text) {
        for ch in t.unicodeScalars { w += (ch.value >= 0x2E80 ? 1 : 0.58) * size * (sub ? 0.72 : 1) }
    }
    return w
}

// MARK: - Canvas

struct DiagramCanvas: View {
    let scene: DLScene
    var thumbnail = false

    private var h: CGFloat { DLLayout.height(scene.panels.count) }

    var body: some View {
        Canvas { ctx, size in
            let k = size.width / DLLayout.W
            ctx.scaleBy(x: k, y: k)
            for (i, p) in scene.panels.enumerated() {
                drawPanel(&ctx, p, DLLayout.box(i, of: scene.panels.count))
            }
        }
        .aspectRatio(DLLayout.W / h, contentMode: .fit)
    }

    private func path(_ pts: [CGPoint], _ box: (top: CGFloat, bottom: CGFloat), close: Bool = false) -> Path {
        var p = Path()
        for (i, q) in pts.enumerated() {
            let pt = CGPoint(x: DLLayout.X(q.x), y: DLLayout.Y(q.y, box))
            if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) }
        }
        if close { p.closeSubpath() }
        return p
    }

    /// SVG-style text: (x, baseline y) with start / middle / end anchoring
    private func text(_ ctx: inout GraphicsContext, _ s: String, _ x: CGFloat, _ y: CGFloat, anchor: UnitPoint = .leading,
                      size: CGFloat = 12, weight: Font.Weight = .semibold, color: Color = .primary, opacity: Double = 1, italic: Bool = false) {
        var t = richText(s, size: size, weight: weight, color: color)
        if italic { t = t.italic() }
        var c = ctx
        c.opacity *= opacity
        c.draw(t, at: CGPoint(x: x, y: y - size * 0.36), anchor: anchor)
    }

    private func arrowHead(_ ctx: inout GraphicsContext, at tip: CGPoint, from: CGPoint, color: Color) {
        let ang = atan2(tip.y - from.y, tip.x - from.x)
        var p = Path()
        p.move(to: tip)
        p.addLine(to: CGPoint(x: tip.x - 7 * cos(ang - 0.45), y: tip.y - 7 * sin(ang - 0.45)))
        p.addLine(to: CGPoint(x: tip.x - 7 * cos(ang + 0.45), y: tip.y - 7 * sin(ang + 0.45)))
        p.closeSubpath()
        ctx.fill(p, with: .color(color))
    }

    private func drawPanel(_ ctx: inout GraphicsContext, _ p: DLPanel, _ box: (top: CGFloat, bottom: CGFloat)) {
        let X = DLLayout.X, X0 = DLLayout.X0, X1 = DLLayout.X1, W = DLLayout.W
        let Y = { (y: Double) in DLLayout.Y(y, box) }
        let top = box.top, bottom = box.bottom
        let ink = Color.primary, ink2 = DLPalette.ink2
        let bg = DS.surface

        // Shaded areas
        for a in p.areas where a.pts.count > 2 {
            ctx.fill(path(a.pts, box, close: true), with: .color(DLPalette.fill(a.kind)))
            if !thumbnail, let l = a.label, l.count <= 2 {
                let cx = a.pts.map(\.x).reduce(0, +) / Double(a.pts.count), cy = a.pts.map(\.y).reduce(0, +) / Double(a.pts.count)
                text(&ctx, l, X(cx), Y(cy) + 4, anchor: .center, size: 12.5, weight: .bold)
            }
        }
        for v in p.vlines {
            var l = Path(); l.move(to: CGPoint(x: X(v.x), y: top)); l.addLine(to: CGPoint(x: X(v.x), y: bottom))
            ctx.stroke(l, with: .color(ink2.opacity(v.faded ? 0.4 : 0.8)), style: StrokeStyle(lineWidth: 1, dash: [3, 4]))
        }
        for g in p.guides {
            let sx = X(g.at.x), sy = Y(g.at.y)
            var l = Path()
            if g.v { l.move(to: CGPoint(x: sx, y: sy)); l.addLine(to: CGPoint(x: sx, y: bottom)) }
            if g.h { l.move(to: CGPoint(x: X0, y: sy)); l.addLine(to: CGPoint(x: sx, y: sy)) }
            ctx.stroke(l, with: .color(ink2.opacity(g.faded ? 0.35 : 0.7)), style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
        }

        // Axes
        var axes = Path()
        axes.move(to: CGPoint(x: X0, y: top - 10)); axes.addLine(to: CGPoint(x: X0, y: bottom)); axes.addLine(to: CGPoint(x: X1 + 12, y: bottom))
        axes.move(to: CGPoint(x: X0 - 4, y: top - 4)); axes.addLine(to: CGPoint(x: X0, y: top - 12)); axes.addLine(to: CGPoint(x: X0 + 4, y: top - 4))
        axes.move(to: CGPoint(x: X1 + 6, y: bottom - 4)); axes.addLine(to: CGPoint(x: X1 + 14, y: bottom)); axes.addLine(to: CGPoint(x: X1 + 6, y: bottom + 4))
        ctx.stroke(axes, with: .color(ink2), lineWidth: 1.4)
        if !thumbnail {
            text(&ctx, p.axisY, X0 - 52, top - 18, size: 12, color: ink2)
            text(&ctx, p.axisX, X1 + 14, bottom + 34, anchor: .trailing, size: 12, color: ink2)
            text(&ctx, "0", X0 - 8, bottom + 14, anchor: .trailing, size: 11, weight: .regular, color: ink2)
        }

        // Curves, with a small grip on each draggable one so touch users can see what moves
        for ln in p.lines {
            guard let pts = ln.pts, ln.kind != "hit" else { continue }
            let color = DLPalette.curve(ln.kind)
            ctx.stroke(path(pts, box), with: .color(color.opacity(ln.faded ? 0.45 : 1)),
                       style: StrokeStyle(lineWidth: ln.faded ? 2 : 2.6, lineCap: .round, lineJoin: .round))
            if ln.drag != nil && !thumbnail {
                // 78% along: the upper or lower right, away from the shaded areas near the axes
                let q = pts.count == 2
                    ? CGPoint(x: pts[0].x * 0.22 + pts[1].x * 0.78, y: pts[0].y * 0.22 + pts[1].y * 0.78)
                    : pts[Int(Double(pts.count) * 0.75)]
                let dot = Path(ellipseIn: CGRect(x: X(q.x) - 5, y: Y(q.y) - 5, width: 10, height: 10))
                ctx.fill(dot, with: .color(bg))
                ctx.stroke(dot, with: .color(color), lineWidth: 2)
            }
        }

        if thumbnail {
            for pt in p.points {
                let r: CGFloat = 4.5
                let c = Path(ellipseIn: CGRect(x: X(pt.at.x) - r, y: Y(pt.at.y) - r, width: 2 * r, height: 2 * r))
                ctx.fill(c, with: .color(pt.faded ? bg : ink))
                ctx.stroke(c, with: .color(ink), lineWidth: 1.6)
            }
            return
        }

        // Shift arrows
        for a in p.arrows {
            let x1 = X(a.from.x), y1 = Y(a.from.y), x2 = X(a.to.x), y2 = Y(a.to.y)
            let len = hypot(x2 - x1, y2 - y1)
            guard len >= 16 else { continue }
            let ux = (x2 - x1) / len, uy = (y2 - y1) / len
            let s = CGPoint(x: x1 + ux * 5, y: y1 + uy * 5), e = CGPoint(x: x2 - ux * 4, y: y2 - uy * 4)
            var l = Path(); l.move(to: s); l.addLine(to: CGPoint(x: e.x - ux * 4, y: e.y - uy * 4))
            ctx.stroke(l, with: .color(ink.opacity(0.85)), lineWidth: 1.5)
            arrowHead(&ctx, at: e, from: s, color: ink.opacity(0.85))
        }

        // Brackets: shortage, surplus, output gap, imports, the tax wedge
        for b in p.brackets {
            let a1 = CGPoint(x: X(b.from.x), y: Y(b.from.y)), a2 = CGPoint(x: X(b.to.x), y: Y(b.to.y))
            guard hypot(a2.x - a1.x, a2.y - a1.y) >= 10 else { continue }
            let color = b.gap ? DLPalette.curve("ctrl") : ink
            var l = Path(); l.move(to: a1); l.addLine(to: a2)
            ctx.stroke(l, with: .color(color), lineWidth: 1.4)
            arrowHead(&ctx, at: a1, from: a2, color: color)
            arrowHead(&ctx, at: a2, from: a1, color: color)
            if b.vertical {
                text(&ctx, b.label, a1.x + (b.leftSide ? -6 : 6), (a1.y + a2.y) / 2 + 4, anchor: b.leftSide ? .trailing : .leading,
                     size: 11.5, color: color)
            } else {
                text(&ctx, b.label, (a1.x + a2.x) / 2, min(a1.y, a2.y) - 5, anchor: .center, size: 11.5, color: color)
            }
        }

        // Elasticity zones along the demand curve
        for z in p.zones {
            let mx = (z.from.x + z.to.x) / 2, my = (z.from.y + z.to.y) / 2
            text(&ctx, z.label, X(mx) + 8, Y(my) - 6, size: 11.5, weight: .regular, color: ink2, italic: true)
        }
        if let mid = p.mid {
            let cx = X(mid.at.x), cy = Y(mid.at.y)
            var l = Path(); l.move(to: CGPoint(x: cx - 6, y: cy - 6)); l.addLine(to: CGPoint(x: cx + 6, y: cy + 6))
            ctx.stroke(l, with: .color(ink2), lineWidth: 1.4)
            text(&ctx, mid.label, cx + 10, cy + 18, size: 11, weight: .regular, color: ink2)
        }

        // Points: a point the economy returns to carries both labels, e.g. "A = C"
        var placed: [CGRect] = []
        for (i, pt) in p.points.enumerated() {
            let cx = X(pt.at.x), cy = Y(pt.at.y)
            let same = { (q: DLPoint) in q.label != nil && hypot(X(q.at.x) - cx, Y(q.at.y) - cy) < 3 }
            let drag = pt.drag != nil
            let r: CGFloat = drag ? 6.5 : 4.5
            let c = Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: 2 * r, height: 2 * r))
            ctx.fill(c, with: .color(pt.faded ? bg : ink))
            ctx.stroke(c, with: .color(drag ? DLPalette.curve("d") : ink), lineWidth: drag ? 2.5 : 1.6)
            guard let first = pt.label, !p.points[..<i].contains(where: same) else { continue }
            let label = ([first] + p.points[(i + 1)...].filter(same).compactMap(\.label)).joined(separator: " = ")
            let w = textWidth(label, 12)
            // up and to the right, or another corner if that lands on an earlier point label
            let options: [(CGFloat, CGFloat, Bool)] = [(cx + 8, cy - 8, true), (cx - 8, cy - 8, false), (cx + 8, cy + 18, true), (cx - 8, cy + 18, false)]
            let boxOf = { (o: (CGFloat, CGFloat, Bool)) in o.2 ? CGRect(x: o.0, y: o.1 - 11, width: w, height: 14) : CGRect(x: o.0 - w, y: o.1 - 11, width: w, height: 14) }
            let pick = options.first { o in !placed.contains { $0.intersects(boxOf(o)) } } ?? options[0]
            placed.append(boxOf(pick))
            let fadedLabel = pt.faded && !p.points[(i + 1)...].contains(where: same)
            text(&ctx, label, pick.0, pick.1, anchor: pick.2 ? .leading : .trailing, size: 12, weight: .bold, opacity: fadedLabel ? 0.6 : 1)
        }

        // Curve labels at the curve's end, nudged apart when two land on each other. A curve that has
        // moved back onto an earlier one (long-run adjustment) shares one label: "SRAS_1 = SRAS_3".
        func near(_ a: [CGPoint]?, _ b: [CGPoint]?) -> Bool {
            guard let a, let b, a.count == b.count else { return false }
            return zip(a, b).allSatisfy { hypot($0.x - $1.x, $0.y - $1.y) < 0.05 }
        }
        struct CurveLabel { let line: DLLine; let text: String; var x: CGFloat; var y: CGFloat; let anchor: UnitPoint; var box: CGRect }
        var labels: [CurveLabel] = []
        for (li, ln) in p.lines.enumerated() {
            guard let pts = ln.pts, !ln.label.isEmpty else { continue }
            if p.lines[(li + 1)...].contains(where: { !$0.label.isEmpty && near($0.pts, pts) }) { continue }
            let twins = p.lines[..<li].filter { !$0.label.isEmpty && near($0.pts, pts) }.map(\.label)
            let s = (twins + [ln.label]).joined(separator: " = ")
            let w = textWidth(s, 12.5)
            var tx: CGFloat, ty: CGFloat, anchor = UnitPoint.leading
            let vertical = pts.count == 2 && abs(pts[0].x - pts[1].x) < 1e-6
            if ln.labelAt == .top || vertical {
                let q = pts[0].y > pts[1].y ? pts[0] : pts[1]
                tx = X(q.x); ty = Y(q.y) - 7; anchor = .center
            } else if ln.labelAt == .rightAbove {
                let q = pts[0].x > pts[pts.count - 1].x ? pts[0] : pts[pts.count - 1]
                tx = X(q.x); ty = Y(q.y) - 6; anchor = .trailing
            } else if ln.labelAt == .peak {
                let q = pts.max { $0.y < $1.y }!
                tx = X(q.x) + 14; ty = Y(q.y) - 6
            } else {
                let endFirst = pts[0].x > pts[pts.count - 1].x
                let q = endFirst ? pts[0] : pts[pts.count - 1], o = endFirst ? pts[pts.count - 1] : pts[0]
                let sx = X(q.x), sy = Y(q.y)
                if sx + 5 + w <= W - 2 {
                    tx = sx + 5; ty = sy + (sy < top + 8 ? 8 : sy > bottom - 8 ? -2 : 4)
                } else if q.y < o.y && pts.count == 2 {
                    // a long label on a downward curve: move back up the curve until it fits on the right
                    let kk = (W - 2 - w - 5 - sx) / (X(o.x) - sx)
                    tx = sx + kk * (X(o.x) - sx) + 5; ty = sy + kk * (Y(o.y) - sy) + 4
                } else {
                    tx = sx - 2; ty = sy - 9; anchor = .trailing
                }
            }
            let x0 = anchor == .leading ? tx : anchor == .trailing ? tx - w : tx - w / 2
            labels.append(CurveLabel(line: ln, text: s, x: tx, y: ty, anchor: anchor, box: CGRect(x: x0, y: ty - 11, width: w, height: 17)))
        }
        // Later labels move up past earlier ones; repeat, since a move can land on a label already passed
        var pass = 0, movedAny = true
        while movedAny && pass < 6 {
            movedAny = false
            pass += 1
            for i in labels.indices.dropFirst() {
                for j in 0..<i where labels[j].box.intersects(labels[i].box) {
                    let d = labels[i].box.maxY - labels[j].box.minY + 1
                    labels[i].y -= d
                    labels[i].box.origin.y -= d
                    movedAny = true
                }
            }
        }
        for l in labels {
            text(&ctx, l.text, l.x, l.y, anchor: l.anchor, size: 12.5, weight: .bold,
                 color: l.line.kind == "hit" ? ink : DLPalette.curve(l.line.kind), opacity: l.line.faded ? 0.6 : 1)
        }

        // Tick labels, spread so neighbours do not overlap
        let xt = spread(p.ticksX.map { ($0, X($0.v)) }, gap: { a, b in (textWidth(a, 12) + textWidth(b, 12)) / 2 + 5 },
                        lo: X0 + 4, hi: X1 + 30)
        for t in xt {
            var c = ctx
            c.opacity = t.faded ? 0.55 : 1
            var l = Path(); l.move(to: CGPoint(x: t.pos, y: bottom)); l.addLine(to: CGPoint(x: t.pos, y: bottom + 4))
            c.stroke(l, with: .color(ink2), lineWidth: 1)
            text(&c, t.label, t.at, bottom + 17, anchor: .center, size: 12)
        }
        let yt = spread(p.ticksY.map { ($0, -Y($0.v)) }, gap: { _, _ in 18 }, lo: -bottom + 2, hi: -top + 4)
        for t in yt {
            var c = ctx
            c.opacity = t.faded ? 0.55 : 1
            var l = Path(); l.move(to: CGPoint(x: X0 - 4, y: -t.pos)); l.addLine(to: CGPoint(x: X0, y: -t.pos))
            c.stroke(l, with: .color(ink2), lineWidth: 1)
            text(&c, t.label, X0 - 7, -t.at + 4, anchor: .trailing, size: 12)
        }
    }

    private struct Spread { var label: String; var pos: CGFloat; var at: CGFloat; var faded: Bool }

    /// Spread labels along one axis so neighbours do not overlap; labels at the same spot are merged
    private func spread(_ items: [(DLTick, CGFloat)], gap: (String, String) -> CGFloat, lo: CGFloat, hi: CGFloat) -> [Spread] {
        var merged: [Spread] = []
        for (t, pos) in items.sorted(by: { $0.1 < $1.1 }) {
            if let prev = merged.last, abs(prev.pos - pos) < 2.5 {
                merged[merged.count - 1].label += " = " + t.label
                merged[merged.count - 1].faded = prev.faded && t.faded
            } else {
                merged.append(Spread(label: t.label, pos: pos, at: pos, faded: t.faded))
            }
        }
        for i in merged.indices.dropFirst() {
            let need = gap(merged[i - 1].label, merged[i].label)
            if merged[i].at - merged[i - 1].at < need { merged[i].at = merged[i - 1].at + need }
        }
        if let last = merged.last, last.at - hi > 0 {
            let over = last.at - hi
            for i in merged.indices.reversed() {
                merged[i].at -= over
                if i > 0 && merged[i].at - merged[i - 1].at >= gap(merged[i - 1].label, merged[i].label) { break }
            }
        }
        if let first = merged.first, first.at < lo {
            let d = lo - first.at
            for i in merged.indices { merged[i].at += d }
        }
        return merged
    }
}

// MARK: - Grabbing curves and points

struct DLGrab {
    let drag: DLDrag
    let panel: Int
}

enum DLHit {
    /// The draggable point or curve under a point in drawing space: points first, then the nearest curve
    static func find(_ scene: DLScene, at p: CGPoint) -> DLGrab? {
        let n = scene.panels.count
        for (i, panel) in scene.panels.enumerated() {
            let box = DLLayout.box(i, of: n)
            guard p.y > box.top - 24 && p.y < box.bottom + 20 else { continue }
            for pt in panel.points {
                if let d = pt.drag, hypot(DLLayout.X(pt.at.x) - p.x, DLLayout.Y(pt.at.y, box) - p.y) < 22 { return DLGrab(drag: d, panel: i) }
            }
            var best: (Double, DLDrag)?
            for ln in panel.lines {
                guard let d = ln.drag, let pts = ln.pts, pts.count > 1 else { continue }
                let screen = pts.map { CGPoint(x: DLLayout.X($0.x), y: DLLayout.Y($0.y, box)) }
                let dist = zip(screen, screen.dropFirst()).map { distance(p, $0, $1) }.min() ?? .infinity
                if dist < 18 && dist < (best?.0 ?? .infinity) { best = (dist, d) }
            }
            if let best { return DLGrab(drag: best.1, panel: i) }
        }
        return nil
    }

    private static func distance(_ p: CGPoint, _ a: CGPoint, _ b: CGPoint) -> Double {
        let dx = b.x - a.x, dy = b.y - a.y
        let len2 = dx * dx + dy * dy
        let t = len2 == 0 ? 0 : max(0, min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
        return hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
    }
}

/// Starts a drag only when the touch lands on something draggable; otherwise it fails at once and the
/// scroll view behind it scrolls as usual.
private final class GrabRecognizer: UIGestureRecognizer {
    var canGrab: (CGPoint) -> Bool = { _ in false }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
        guard state == .possible, touches.count == 1, let t = touches.first else {
            if state == .possible { state = .failed }
            return
        }
        state = canGrab(t.location(in: view)) ? .began : .failed
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent) {
        if state == .began || state == .changed { state = .changed }
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent) {
        state = state == .began || state == .changed ? .ended : .failed
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent) {
        state = .cancelled
    }
}

/// Transparent layer over the canvas that reports drags in drawing space (430 wide).
struct DiagramTouchLayer: UIViewRepresentable {
    let canGrab: (CGPoint) -> Bool
    let onBegan: (CGPoint) -> Void
    let onChanged: (CGPoint) -> Void
    let onEnded: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> UIView {
        let v = UIView()
        v.backgroundColor = .clear
        let g = GrabRecognizer(target: context.coordinator, action: #selector(Coordinator.handle(_:)))
        g.canGrab = { [weak coordinator = context.coordinator, weak v] p in
            guard let coordinator else { return false }
            return coordinator.parent.canGrab(Coordinator.drawing(p, in: v))
        }
        v.addGestureRecognizer(g)
        return v
    }

    func updateUIView(_ uiView: UIView, context: Context) { context.coordinator.parent = self }

    final class Coordinator: NSObject {
        var parent: DiagramTouchLayer
        init(_ parent: DiagramTouchLayer) { self.parent = parent }

        static func drawing(_ p: CGPoint, in v: UIView?) -> CGPoint {
            let k = max(v?.bounds.width ?? DLLayout.W, 1) / DLLayout.W
            return CGPoint(x: p.x / k, y: p.y / k)
        }

        @objc func handle(_ g: UIGestureRecognizer) {
            let p = Self.drawing(g.location(in: g.view), in: g.view)
            switch g.state {
            case .began: parent.onBegan(p)
            case .changed: parent.onChanged(p)
            case .ended, .cancelled, .failed: parent.onEnded()
            default: break
            }
        }
    }
}
