import Foundation

@MainActor
final class WatchlistQuoteViewModel: ObservableObject {
    @Published var changePct: Double?
    @Published var price: Double?

    private let code: String
    private let market: Market

    init(code: String, market: Market) {
        self.code = code
        self.market = market
    }

    func load() async {
        do {
            if market == .cn {
                let q: RealtimeQuote = try await APIClient.shared.get("/stocks/\(code)/realtime")
                price = q.price
                changePct = q.pctChange
            } else {
                let q: USRealtimeQuote = try await APIClient.shared.get("/us/stock/\(code)/realtime")
                price = q.price
                changePct = q.changePct
            }
        } catch {
            // silently ignore — row stays showing "--"
        }
    }
}
