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

    // MARK: Large numbers
    // zh / ja / ko group by 万 (10_000) and 亿 (100_000_000); en / fr use K / M / B.

    private static func scaled(_ value: Double, myriadDecimals: Int, unit: String = "") -> String {
        if Lang.usesMyriad {
            if value >= 1_0000_0000 {
                return String(format: "%.\(myriadDecimals)f", value / 1_0000_0000) + L("亿") + unit
            } else if value >= 1_0000 {
                return String(format: "%.\(myriadDecimals)f", value / 1_0000) + L("万") + unit
            }
        } else {
            if value >= 1_000_000_000 {
                return String(format: "%.2f", value / 1_000_000_000) + "B" + unit
            } else if value >= 1_000_000 {
                return String(format: "%.2f", value / 1_000_000) + "M" + unit
            } else if value >= 1_000 {
                return String(format: "%.1f", value / 1_000) + "K" + unit
            }
        }
        return String(format: "%.0f", value) + unit
    }

    static func cnyAmount(_ value: Double) -> String {
        scaled(value, myriadDecimals: 2)
    }

    // MARK: Volume

    static func shareVolume(_ value: Double) -> String {
        scaled(value, myriadDecimals: 1, unit: L("股"))
    }

    /// Compact axis tick for volume charts ("100M", "1.2亿"); the unit is implied by the chart.
    static func volumeTick(_ value: Double) -> String {
        scaled(value, myriadDecimals: 1).replacingOccurrences(of: ".00", with: "")
    }

    /// A-share volume is quoted in lots (手) of 100 shares.
    static func volume(_ value: Double) -> String {
        scaled(value, myriadDecimals: 1, unit: L("手"))
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
