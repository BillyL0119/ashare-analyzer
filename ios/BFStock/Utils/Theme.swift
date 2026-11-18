import SwiftUI
import CoreText

// MARK: - Market type

enum Market: String {
    case cn  // A股：红涨绿跌
    case us  // 美股：绿涨红跌
    case hk  // 港股：绿涨红跌（同美股）
    case jp  // 日股：绿涨红跌（同美股）

    /// US, Hong Kong and Japan share the US-shaped API: /api/{market}/stock/{symbol}[/realtime|/history]
    var stockPath: String { self == .cn ? "/stocks" : "/\(rawValue)/stock" }
    var currencySymbol: String { [.us: "$", .cn: "¥", .hk: "HK$", .jp: "¥"][self] ?? "" }
    var label: String { L([.us: "美股", .cn: "A股", .hk: "港股", .jp: "日股"][self] ?? "美股") }
    /// Hong Kong / Japan: no news, scores, simulations or peers for these yet
    var isHKJP: Bool { self == .hk || self == .jp }

    init(code: String, market: String?) {
        if let m = market.flatMap(Market.init(rawValue:)) { self = m; return }
        // Older saved items carry no market: 6 digits A-share, 5 Hong Kong, 4 Japan, otherwise US
        if code.count == 6, code.allSatisfy(\.isNumber) { self = .cn }
        else if code.count == 5, code.allSatisfy(\.isNumber) { self = .hk }
        else if code.count == 4, code.allSatisfy(\.isNumber) { self = .jp }
        else { self = .us }
    }
}

// MARK: - Theme

enum Theme {
    // Same as the website: A-shares red = up, green = down; US, Hong Kong, Japan the reverse.
    // A shade darker on the light theme so the numbers stay readable on white (AA contrast).

    static let cnUp   = Color(light: Color(r: 0xDC, g: 0x26, b: 0x26), dark: Color(r: 0xE5, g: 0x48, b: 0x4D))
    static let cnDown = Color(light: Color(r: 0x15, g: 0x80, b: 0x3D), dark: Color(r: 0x3F, g: 0xB6, b: 0x7A))

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

/// Design tokens, matching bestfriendstock.com (Nov 2026 redesign): an ink-blue ramp, one blue accent
/// used rarely (selection, the primary action, links), hairline borders, no gradients or glows.
enum DS {
    static let bg        = Color(light: Color(r: 0xF5, g: 0xF7, b: 0xFA), dark: Color(r: 0x0A, g: 0x0F, b: 0x1B))
    static let surface   = Color(light: .white,                            dark: Color(r: 0x0F, g: 0x16, b: 0x26))
    static let surfaceHi = Color(light: Color(r: 0xEC, g: 0xEF, b: 0xF4), dark: Color(r: 0x16, g: 0x20, b: 0x36))
    static let stroke    = Color(light: Color.black.opacity(0.07),         dark: Color.white.opacity(0.08))
    /// Accent as text, icons, selection and tint
    static let accent    = Color(light: Color(r: 0x1D, g: 0x4E, b: 0xD8), dark: Color(r: 0x6C, g: 0x9C, b: 0xFF))
    /// Accent as a solid fill under white text (5.2:1 in both themes)
    static let accentFill = Color(r: 0x25, g: 0x63, b: 0xEB)
    /// The selected segment of a control: a step up from `surfaceHi`
    static let raised    = Color(light: .white,                            dark: Color(r: 0x24, g: 0x30, b: 0x4C))
    // Meaning only (done, error, warning), toned to sit in the palette; the website's values
    static let good      = Color(light: Color(r: 0x15, g: 0x80, b: 0x3D), dark: Color(r: 0x4C, g: 0xC3, b: 0x8A))
    static let bad       = Color(light: Color(r: 0xDC, g: 0x26, b: 0x26), dark: Color(r: 0xE5, g: 0x48, b: 0x4D))
    static let warn      = Color(light: Color(r: 0x9A, g: 0x62, b: 0x00), dark: Color(r: 0xE0, g: 0xA4, b: 0x3A))
    /// Solid fills under white text (4.5:1 or better in both themes)
    static let goodFill  = Color(r: 0x15, g: 0x80, b: 0x3D)
    static let badFill   = Color(r: 0xC8, g: 0x1E, b: 0x1E)
    /// Series colours for a chart that must tell several holdings apart; blue leads
    static let series: [Color] = [
        accent,
        Color(light: Color(r: 0x0F, g: 0x76, b: 0x6E), dark: Color(r: 0x2D, g: 0xD4, b: 0xBF)),
        warn,
        Color(light: Color(r: 0x6D, g: 0x28, b: 0xD9), dark: Color(r: 0xA7, g: 0x8B, b: 0xFA)),
        Color(light: Color(r: 0xBE, g: 0x18, b: 0x5D), dark: Color(r: 0xF4, g: 0x72, b: 0xB6)),
        Color(light: Color(r: 0x4D, g: 0x7C, b: 0x0F), dark: Color(r: 0xA3, g: 0xE6, b: 0x35)),
        Color(light: Color(r: 0x0E, g: 0x74, b: 0x90), dark: Color(r: 0x22, g: 0xD3, b: 0xEE)),
    ]
    static let ma5  = Color(light: Color(r: 0xD9, g: 0x91, b: 0x00), dark: Color(r: 0xFA, g: 0xCC, b: 0x15))
    static let ma10 = Color(light: Color(r: 0x9B, g: 0x3D, b: 0xD6), dark: Color(r: 0xC0, g: 0x84, b: 0xFC))
    static let ma20 = Color(light: Color(r: 0x25, g: 0x63, b: 0xEB), dark: Color(r: 0x60, g: 0xA5, b: 0xFA))
    static let boll = Color(light: Color(r: 0x0E, g: 0x74, b: 0x90), dark: Color(r: 0x22, g: 0xD3, b: 0xEE))
    static let radius: CGFloat = 16
    static let tileRadius: CGFloat = 12
}

private struct CardModifier: ViewModifier {
    let padding: CGFloat
    func body(content: Content) -> some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DS.surface, in: RoundedRectangle(cornerRadius: DS.radius, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: DS.radius, style: .continuous).strokeBorder(DS.stroke))
            // depth from surface steps and a hairline; only a faint neutral shadow on the light theme
            .shadow(color: Color(light: Color.black.opacity(0.04), dark: .clear), radius: 6, y: 2)
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
            .font(.system(.footnote).weight(.semibold))
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.7)   // "+14.21%" must shrink, never wrap inside a fixed-width pill
            .foregroundStyle(color)
            .contentTransition(.numericText(value: pct ?? 0))
            .animation(.snappy(duration: 0.45), value: pct)
            .padding(.horizontal, 10)
            .frame(minWidth: fixedWidth == nil ? minWidth : nil)
            .frame(width: fixedWidth)
            .padding(.vertical, 5)
            .background(color.opacity(0.12), in: Capsule())
    }
}

struct RowDivider: View {
    var body: some View {
        Rectangle().fill(DS.stroke).frame(height: 1).padding(.leading, 16)
    }
}

struct MarketSegmentControl: View {
    @Binding var selection: Market
    var order: [Market] = [.cn, .us]
    @Namespace private var ns

    var body: some View {
        HStack(spacing: 0) {
            ForEach(order, id: \.self) { m in
                Button {
                    withAnimation(.snappy(duration: 0.25)) { selection = m }
                } label: {
                    // The selected market is a raised segment with a hairline, like the website's period control
                    Text(m.label)
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, order.count > 2 ? 10 : 14)
                        .padding(.vertical, 6)
                        .foregroundStyle(selection == m ? Color.primary : Color.secondary)
                        .background {
                            if selection == m {
                                Capsule().fill(DS.raised)
                                    .overlay(Capsule().strokeBorder(DS.stroke))
                                    .shadow(color: Color(light: Color.black.opacity(0.06), dark: .clear), radius: 2, y: 1)
                                    .matchedGeometryEffect(id: "seg", in: ns)
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

/// A faint sheen across loading placeholders; still placeholders when Reduce Motion is on.
private struct ShimmerModifier: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var phase: CGFloat = -1
    private let sheen = Color(light: Color.white.opacity(0.6), dark: Color.white.opacity(0.06))

    func body(content: Content) -> some View {
        if reduceMotion {
            content
        } else {
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
                    withAnimation(.linear(duration: 1.4).repeatForever(autoreverses: false)) { phase = 1 }
                }
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

// MARK: - Brush script for Chinese quotes

/// The website sets Chinese quotes in Long Cang, a brush hand. iOS has no brush font built in, but Apple
/// serves some Chinese fonts on demand: the first Chinese quote asks the system for Xingkai SC (行楷),
/// then Kaiti SC, and the card uses the system serif until one is ready. iOS keeps the font afterwards.
@MainActor
final class BrushFont: ObservableObject {
    static let shared = BrushFont()
    @Published private(set) var name: String?
    private var requested = false
    private static let candidates = ["STXingkai-SC-Light", "STKaiti-SC-Regular"]

    func request() {
        guard !requested else { return }
        requested = true
        if let ready = Self.candidates.first(where: { UIFont(name: $0, size: 17) != nil }) {
            name = ready
        } else {
            download(0)
        }
    }

    private func download(_ index: Int) {
        guard index < Self.candidates.count else { return }
        let font = Self.candidates[index]
        let descriptor = CTFontDescriptorCreateWithAttributes([kCTFontNameAttribute: font] as CFDictionary)
        CTFontDescriptorMatchFontDescriptorsWithProgressHandler([descriptor] as CFArray, nil) { state, _ in
            if state == .didFinish {
                Task { @MainActor in
                    if UIFont(name: font, size: 17) != nil {
                        BrushFont.shared.name = font
                    } else {
                        BrushFont.shared.download(index + 1)
                    }
                }
            }
            return true
        }
    }
}

