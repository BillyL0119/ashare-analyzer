import SwiftUI

struct StockRow: View {
    let code: String
    let name: String
    let changePct: Double?
    let market: Market

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(name)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                Text(code)
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 8)
            PctPill(pct: changePct, market: market)
        }
        .padding(.vertical, 2)
    }
}
