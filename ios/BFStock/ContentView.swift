import SwiftUI

struct ContentView: View {
    @State private var showSplash = true

    var body: some View {
        ZStack {
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
            .tint(DS.accent)

            if showSplash {
                SplashView()
                    .transition(.asymmetric(insertion: .identity,
                                            removal: .opacity.combined(with: .scale(scale: 1.08))))
                    .zIndex(1)
            }
        }
        // Cap dynamic type so numeric-heavy UIs don't break at xxxLarge
        .dynamicTypeSize(.xSmall ... .accessibility1)
        .task {
            try? await Task.sleep(for: .seconds(1.7))
            withAnimation(.easeInOut(duration: 0.5)) { showSplash = false }
        }
    }
}

/// Matches the static launch screen (same background, same logo size and position), then adds
/// a light sweep and tagline before dissolving into the app.
private struct SplashView: View {
    @State private var sweep: CGFloat = -1
    @State private var taglineVisible = false

    private let logoWidth: CGFloat = 180

    var body: some View {
        ZStack {
            Color("LaunchBackground").ignoresSafeArea()

            Image("LaunchLogo")
                .resizable()
                .scaledToFit()
                .frame(width: logoWidth)
                .overlay {
                    ZStack {
                        LinearGradient(
                            colors: [.clear, DS.accent.opacity(0.55), .clear],
                            startPoint: .leading, endPoint: .trailing
                        )
                        .frame(width: logoWidth * 0.45)
                        .rotationEffect(.degrees(20))
                        .scaleEffect(y: 2.5)
                        .offset(x: sweep * logoWidth)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .clipped()
                    .mask(Image("LaunchLogo").resizable().scaledToFit())
                }
                .overlay(alignment: .bottom) {
                    Text("BEST FRIEND STOCK")
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .tracking(3.2)
                        .foregroundStyle(.white.opacity(0.75))
                        .fixedSize()
                        .offset(y: 46)
                        .opacity(taglineVisible ? 1 : 0)
                        .offset(y: taglineVisible ? 0 : 6)
                }
        }
        .task {
            withAnimation(.easeInOut(duration: 0.7).delay(0.05)) { sweep = 1.2 }
            withAnimation(.easeOut(duration: 0.45).delay(0.1)) { taglineVisible = true }
        }
    }
}

#Preview {
    ContentView()
}
