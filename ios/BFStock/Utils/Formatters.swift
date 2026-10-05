import Foundation

enum Formatters {

    // MARK: Price

    static func price(_ value: Double, decimals: Int = 2) -> String {
        String(format: "%.\(decimals)f", value)
    }

    // MARK: Change percentage / absolute

    static func changePct(_ value: Double) -> String {
        let sign = value >= 0 ? "+" : ""
        return "\(sign)\(String(format: "%.2f", value))%"
    }

    static func changeAbs(_ value: Double) -> String {
        let sign = value >= 0 ? "+" : ""
        return "\(sign)\(String(format: "%.2f", value))"
    }

    // MARK: Large numbers (volume / amount in CNY)
    // 1亿 = 100_000_000, 1万 = 10_000

    static func cnyAmount(_ value: Double) -> String {
        if value >= 1_0000_0000 {
            return String(format: "%.2f亿", value / 1_0000_0000)
        } else if value >= 1_0000 {
            return String(format: "%.2f万", value / 1_0000)
        }
        return String(format: "%.0f", value)
    }

    // MARK: Volume (shares)

    static func shareVolume(_ value: Double) -> String {
        if value >= 1_0000_0000 {
            return String(format: "%.2f亿股", value / 1_0000_0000)
        } else if value >= 1_0000 {
            return String(format: "%.1f万股", value / 1_0000)
        }
        return String(format: "%.0f股", value)
    }

    static func volume(_ value: Double) -> String {
        if value >= 1_0000_0000 {
            return String(format: "%.1f亿手", value / 1_0000_0000)
        } else if value >= 1_0000 {
            return String(format: "%.1f万手", value / 1_0000)
        }
        return String(format: "%.0f手", value)
    }

    // MARK: Date

    static func shortDate(_ iso: String) -> String {
        // Input: "2024-01-15", output: "01-15"
        guard iso.count >= 10 else { return iso }
        let s = iso.index(iso.startIndex, offsetBy: 5)
        let e = iso.index(iso.startIndex, offsetBy: 9)
        return String(iso[s...e])
    }
}
