import SwiftUI

struct StockRow: View {
    let code: String
    let name: String
    let changePct: Double?
    let market: Market

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                Text(code)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            if let pct = changePct {
                Text(Formatters.changePct(pct))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.changeColor(pct, market: market))
                    .monospacedDigit()
            } else {
                Text("--")
                    .font(.subheadline)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 4)
    }
}
