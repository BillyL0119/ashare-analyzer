import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            MarketTabView()
                .tabItem {
                    Label("tab.market", systemImage: "chart.line.uptrend.xyaxis")
                }
            LearningTabView()
                .tabItem {
                    Label("tab.learning", systemImage: "book.fill")
                }
            AITeacherTabView()
                .tabItem {
                    Label("tab.ai_teacher", systemImage: "bubble.left.and.bubble.right.fill")
                }
            PaperTradingTabView()
                .tabItem {
                    Label("tab.paper_trading", systemImage: "dollarsign.circle.fill")
                }
        }
        .tint(Color.accentColor)
        // Cap dynamic type so numeric-heavy UIs don't break at xxxLarge
        .dynamicTypeSize(.xSmall ... .accessibility1)
    }
}

#Preview {
    ContentView()
}
