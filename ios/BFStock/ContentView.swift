import SwiftUI

enum AppTab: Hashable { case market, learning, news, teacher, paper }

struct ContentView: View {
    @State private var tab = ContentView.initialTab
    @State private var classLink: String?     // class code from an invite link, opened on the paper tab

    var body: some View {
        TabView(selection: $tab) {
            MarketTabView()
                .tabItem {
                    Label("tab.market", systemImage: "chart.line.uptrend.xyaxis")
                }
                .tag(AppTab.market)
            LearningTabView()
                .tabItem {
                    Label("tab.learning", systemImage: "book.fill")
                }
                .tag(AppTab.learning)
            NewsTabView()
                .tabItem {
                    Label(L("资讯"), systemImage: "newspaper.fill")
                }
                .tag(AppTab.news)
            AITeacherTabView()
                .tabItem {
                    Label("tab.ai_teacher", systemImage: "bubble.left.and.bubble.right.fill")
                }
                .tag(AppTab.teacher)
            PaperTradingTabView(classLink: $classLink)
                .tabItem {
                    Label("tab.paper_trading", systemImage: "dollarsign.circle.fill")
                }
                .tag(AppTab.paper)
        }
        .tint(DS.accent)
        // Cap dynamic type so numeric-heavy UIs don't break at xxxLarge
        .dynamicTypeSize(.xSmall ... .accessibility1)
        // The static launch screen hands straight over to the app; no animated splash in between.
        .onOpenURL { url in
            guard let code = ClassLink.code(from: url) else { return }
            tab = .paper
            classLink = code
        }
    }

    /// Debug builds can open on another tab with a launch argument, e.g. `-startTab learning`
    /// (used by the screenshot job in .github/workflows/ios.yml). Release builds always open on the market tab.
    private static var initialTab: AppTab {
        #if DEBUG
        switch UserDefaults.standard.string(forKey: "startTab") {
        case "learning": return .learning
        case "news": return .news
        case "teacher": return .teacher
        case "paper": return .paper
        default: return .market
        }
        #else
        return .market
        #endif
    }
}

#Preview {
    ContentView()
}
