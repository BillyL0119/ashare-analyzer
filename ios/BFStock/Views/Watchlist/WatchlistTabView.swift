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
                    .font(.title2.weight(.semibold))
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
