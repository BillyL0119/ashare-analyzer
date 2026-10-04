import Foundation

@MainActor
final class MarketViewModel: ObservableObject {
    @Published var overview: MarketOverview?
    @Published var cnHotStocks: [HotStock] = []
    @Published var usHotStocks: [HotStock] = []
    @Published var searchResults: [StockSearchResult] = []
    @Published var isLoadingOverview = false
    @Published var isLoadingHot = false
    @Published var isSearching = false
    @Published var overviewError: String?
    @Published var hotError: String?
    @Published var searchError: String?

    private var searchTask: Task<Void, Never>?

    func loadAll() async {
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadOverview() }
            group.addTask { await self.loadHotStocks() }
        }
    }

    func loadOverview() async {
        isLoadingOverview = true
        overviewError = nil
        do {
            // API returns plain object, no {success, data} wrapper
            let ov: MarketOverview = try await APIClient.shared.get("/market/overview")
            overview = ov
        } catch {
            overviewError = errorMessage(error)
        }
        isLoadingOverview = false
    }

    func loadHotStocks() async {
        isLoadingHot = true
        hotError = nil
        do {
            // Endpoints: /api/stocks/hot?market=cn|us — returns plain array
            async let cn: [HotStock] = APIClient.shared.get("/stocks/hot", params: ["market": "cn"])
            async let us: [HotStock] = APIClient.shared.get("/stocks/hot", params: ["market": "us"])
            let (cnStocks, usStocks) = try await (cn, us)
            cnHotStocks = cnStocks
            usHotStocks = usStocks
        } catch {
            hotError = errorMessage(error)
        }
        isLoadingHot = false
    }

    func search(_ query: String) {
        searchTask?.cancel()
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else {
            searchResults = []
            searchError = nil
            return
        }
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000)
            guard !Task.isCancelled else { return }
            isSearching = true
            searchError = nil
            do {
                // /api/stocks/search?q=... — returns plain array
                let results: [StockSearchResult] = try await APIClient.shared.get("/stocks/search", params: ["q": query])
                if !Task.isCancelled { searchResults = results }
            } catch {
                if !Task.isCancelled { searchError = errorMessage(error) }
            }
            if !Task.isCancelled { isSearching = false }
        }
    }

    private func errorMessage(_ error: Error) -> String {
        if let api = error as? APIError {
            switch api {
            case .timeout: return String(localized: "error.timeout")
            case .networkError: return String(localized: "error.network")
            default: return String(localized: "error.decoding")
            }
        }
        return error.localizedDescription
    }
}
