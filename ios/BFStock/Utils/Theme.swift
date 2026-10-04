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
