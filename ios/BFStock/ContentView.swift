import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            MarketTabView()
                .tabItem {
                    Label("tab.market", systemImage: "chart.line.uptrend.xyaxis")
                }
            WatchlistTabView()
                .tabItem {
                    Label("tab.watchlist", systemImage: "star.fill")
                }
            PaperTradingTabView()
                .tabItem {
                    Label("tab.paper_trading", systemImage: "dollarsign.circle.fill")
                }
            AITeacherTabView()
                .tabItem {
                    Label("tab.ai_teacher", systemImage: "bubble.left.and.bubble.right.fill")
                }
        }
        .tint(Color.accentColor)
    }
}

#Preview {
    ContentView()
}
