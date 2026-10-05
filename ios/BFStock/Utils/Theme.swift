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

    var body: some View {
        let color = pct.map { Theme.changeColor($0, market: market) } ?? .secondary
        Text(pct.map { Formatters.changePct($0) } ?? "--")
            .font(.system(.footnote, design: .rounded).weight(.semibold))
            .monospacedDigit()
            .foregroundStyle(color)
            .padding(.horizontal, 10)
            .frame(minWidth: minWidth)
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
                    Text(m == .cn ? "A股" : "美股")
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
    }
}
