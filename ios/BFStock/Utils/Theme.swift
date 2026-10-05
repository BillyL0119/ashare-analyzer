import SwiftUI

// MARK: - Market type

enum Market: String {
    case cn  // A股：红涨绿跌
    case us  // 美股：绿涨红跌
}

// MARK: - Theme

enum Theme {
    // Website uses: UP = #ef5350 (red), DOWN = #26a69a (teal-green)
    // A-share: red = up, teal = down
    // US stock: teal = up, red = down

    static let cnUp   = Color(r: 0xEF, g: 0x53, b: 0x50)   // #ef5350
    static let cnDown = Color(r: 0x26, g: 0xA6, b: 0x9A)   // #26a69a

    // US convention is the reverse
    static var usUp:   Color { cnDown }
    static var usDown: Color { cnUp   }

    static func upColor(market: Market) -> Color {
        market == .cn ? cnUp : usUp
    }

    static func downColor(market: Market) -> Color {
        market == .cn ? cnDown : usDown
    }

    /// Returns the appropriate color for a price change percentage.
    static func changeColor(_ pct: Double, market: Market) -> Color {
        if pct > 0 { return upColor(market: market) }
        if pct < 0 { return downColor(market: market) }
        return .secondary
    }

    // MARK: Misc

    static let disclaimer = Color.secondary
    static let cardBackground = Color(.secondarySystemBackground)
    static let rowBackground  = Color(.systemBackground)
}

// MARK: - Color convenience init

extension Color {
    init(r: Int, g: Int, b: Int, a: Double = 1) {
        self.init(
            .sRGB,
            red:   Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: a
        )
    }
}

// MARK: - Design system

extension Color {
    init(light: Color, dark: Color) {
        self.init(UIColor { $0.userInterfaceStyle == .dark ? UIColor(dark) : UIColor(light) })
    }
}

enum DS {
    static let bg        = Color(light: Color(r: 0xF2, g: 0xF4, b: 0xF8), dark: Color(r: 0x09, g: 0x0C, b: 0x13))
    static let surface   = Color(light: .white,                            dark: Color(r: 0x12, g: 0x17, b: 0x21))
    static let surfaceHi = Color(light: Color(r: 0xEA, g: 0xEE, b: 0xF5), dark: Color(r: 0x1B, g: 0x22, b: 0x30))
    static let stroke    = Color(light: Color.black.opacity(0.06),         dark: Color.white.opacity(0.07))
    static let accent    = Color(light: Color(r: 0x2F, g: 0x5B, b: 0xEA), dark: Color(r: 0x6C, g: 0x8E, b: 0xFF))
    static let accentAlt = Color(light: Color(r: 0x6A, g: 0x4B, b: 0xE8), dark: Color(r: 0x8B, g: 0x6C, b: 0xFF))
    static var accentGradient: LinearGradient {
        LinearGradient(colors: [accent, accentAlt], startPoint: .topLeading, endPoint: .bottomTrailing)
    }
    static let ma5  = Color(light: Color(r: 0xD9, g: 0x91, b: 0x00), dark: Color(r: 0xFA, g: 0xCC, b: 0x15))
    static let boll = Color(light: Color(r: 0x0E, g: 0x74, b: 0x90), dark: Color(r: 0x22, g: 0xD3, b: 0xEE))
    static let radius: CGFloat = 20
    static let tileRadius: CGFloat = 14
}

private struct CardModifier: ViewModifier {
    let padding: CGFloat
    func body(content: Content) -> some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DS.surface, in: RoundedRectangle(cornerRadius: DS.radius, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: DS.radius, style: .continuous).strokeBorder(DS.stroke))
            .shadow(color: Color.black.opacity(0.05), radius: 10, y: 3)
    }
}

extension View {
    func card(padding: CGFloat = 16) -> some View { modifier(CardModifier(padding: padding)) }
}

struct SectionHeader<Trailing: View>: View {
    let title: String
    let trailing: Trailing
    init(_ title: String, @ViewBuilder trailing: () -> Trailing = { EmptyView() }) {
        self.title = title
        self.trailing = trailing()
    }
    var body: some View {
        HStack {
            Text(title)
                .font(.footnote.weight(.semibold))
                .tracking(0.6)
                .foregroundStyle(.secondary)
            Spacer()
            trailing
        }
        .padding(.horizontal, 4)
    }
}

struct PctPill: View {
    let pct: Double?
    let market: Market
    var minWidth: CGFloat = 68
    var fixedWidth: CGFloat? = nil

    var body: some View {
        let color = pct.map { Theme.changeColor($0, market: market) } ?? .secondary
        Text(pct.map { Formatters.changePct($0) } ?? "--")
            .font(.system(.footnote, design: .rounded).weight(.semibold))
            .monospacedDigit()
            .foregroundStyle(color)
            .contentTransition(.numericText(value: pct ?? 0))
            .animation(.snappy(duration: 0.45), value: pct)
            .padding(.horizontal, 10)
            .frame(minWidth: fixedWidth == nil ? minWidth : nil)
            .frame(width: fixedWidth)
            .padding(.vertical, 5)
            .background(color.opacity(0.14), in: Capsule())
    }
}

struct RowDivider: View {
    var body: some View {
        Rectangle().fill(DS.stroke).frame(height: 1).padding(.leading, 16)
    }
}

struct MarketSegmentControl: View {
    @Binding var selection: Market
    @Namespace private var ns

    var body: some View {
        HStack(spacing: 0) {
            ForEach([Market.cn, Market.us], id: \.self) { m in
                Button {
                    withAnimation(.snappy(duration: 0.25)) { selection = m }
                } label: {
                    Text(m == .cn ? L("A股") : L("美股"))
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .foregroundStyle(selection == m ? Color.white : Color.secondary)
                        .background {
                            if selection == m {
                                Capsule().fill(DS.accent).matchedGeometryEffect(id: "seg", in: ns)
                            }
                        }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(2)
        .background(DS.surfaceHi, in: Capsule())
        .sensoryFeedback(.selection, trigger: selection)
    }
}

// MARK: - Skeleton loading

private struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = -1
    private let sheen = Color(light: Color.white.opacity(0.85), dark: Color.white.opacity(0.10))

    func body(content: Content) -> some View {
        content
            .overlay {
                GeometryReader { geo in
                    LinearGradient(colors: [.clear, sheen, .clear], startPoint: .leading, endPoint: .trailing)
                        .frame(width: geo.size.width * 0.7)
                        .offset(x: phase * geo.size.width * 1.4)
                }
                .mask(content)
            }
            .onAppear {
                withAnimation(.linear(duration: 1.3).repeatForever(autoreverses: false)) { phase = 1 }
            }
    }
}

extension View {
    func shimmer() -> some View { modifier(ShimmerModifier()) }
}

struct SkeletonBar: View {
    var width: CGFloat? = nil
    var height: CGFloat = 12
    var radius: CGFloat = 6

    var body: some View {
        RoundedRectangle(cornerRadius: radius, style: .continuous)
            .fill(DS.surfaceHi)
            .frame(width: width, height: height)
            .shimmer()
    }
}

struct SkeletonRows: View {
    var rows: Int = 4
    var trailingPill = true

    var body: some View {
        VStack(spacing: 0) {
            ForEach(0..<rows, id: \.self) { i in
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 8) {
                        SkeletonBar(width: CGFloat(90 + (i * 23) % 50), height: 13)
                        SkeletonBar(width: 54, height: 9)
                    }
                    Spacer()
                    if trailingPill { SkeletonBar(width: 68, height: 26, radius: 13) }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 13)
                if i < rows - 1 { RowDivider() }
            }
        }
        .accessibilityLabel("加载中")
    }
}

// MARK: - Sparkline

struct Sparkline: View {
    let values: [Double]
    let color: Color
    var lineWidth: CGFloat = 1.6
    @State private var progress: CGFloat = 0

    var body: some View {
        GeometryReader { geo in
            let pts = points(in: geo.size)
            ZStack {
                if pts.count > 1 {
                    fillPath(pts, height: geo.size.height)
                        .fill(LinearGradient(colors: [color.opacity(0.28), color.opacity(0)],
                                             startPoint: .top, endPoint: .bottom))
                        .opacity(progress)
                    linePath(pts)
                        .trim(from: 0, to: progress)
                        .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round))
                    if let last = pts.last {
                        Circle().fill(color)
                            .frame(width: 4.5, height: 4.5)
                            .position(last)
                            .opacity(progress >= 1 ? 1 : 0)
                    }
                }
            }
        }
        .onAppear { withAnimation(.easeOut(duration: 0.8)) { progress = 1 } }
        .onChange(of: values) { _, _ in
            progress = 0
            withAnimation(.easeOut(duration: 0.8)) { progress = 1 }
        }
    }

    private func points(in size: CGSize) -> [CGPoint] {
        guard values.count > 1, let lo = values.min(), let hi = values.max() else { return [] }
        let span = max(hi - lo, 1e-9)
        let inset: CGFloat = 3
        return values.enumerated().map { i, v in
            CGPoint(x: inset + (size.width - 2 * inset) * CGFloat(i) / CGFloat(values.count - 1),
                    y: inset + (size.height - 2 * inset) * (1 - CGFloat((v - lo) / span)))
        }
    }

    private func linePath(_ pts: [CGPoint]) -> Path {
        var p = Path()
        p.move(to: pts[0])
        for pt in pts.dropFirst() { p.addLine(to: pt) }
        return p
    }

    private func fillPath(_ pts: [CGPoint], height: CGFloat) -> Path {
        var p = linePath(pts)
        p.addLine(to: CGPoint(x: pts.last!.x, y: height))
        p.addLine(to: CGPoint(x: pts[0].x, y: height))
        p.closeSubpath()
        return p
    }
}
