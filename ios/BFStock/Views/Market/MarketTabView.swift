import SwiftUI

struct MarketTabView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                Spacer()
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: 48))
                    .foregroundStyle(.secondary)
                Text("tab.market")
                    .font(.title2.weight(.semibold))
                Text("Coming in Step 2")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                Spacer()
            }
            .navigationTitle("tab.market")
        }
    }
}

#Preview {
    MarketTabView()
}
