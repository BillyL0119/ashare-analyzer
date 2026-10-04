import SwiftUI

struct PaperTradingTabView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                Spacer()
                Image(systemName: "dollarsign.circle.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(.secondary)
                Text("tab.paper_trading")
                    .font(.title2.weight(.semibold))
                Text("Coming in Step 6")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                Spacer()
            }
            .navigationTitle("tab.paper_trading")
        }
    }
}

#Preview {
    PaperTradingTabView()
}
