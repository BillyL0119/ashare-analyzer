import SwiftUI

struct WatchlistTabView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                Spacer()
                Image(systemName: "star.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(.secondary)
                Text("tab.watchlist")
                    .font(.system(.title2, design: .serif).weight(.semibold))
                Text("Coming in Step 5")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                Spacer()
            }
            .navigationTitle("tab.watchlist")
        }
    }
}

#Preview {
    WatchlistTabView()
}
