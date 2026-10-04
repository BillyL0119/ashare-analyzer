import Foundation

@MainActor
final class MarketViewModel: ObservableObject {
    @Published var overview: MarketOverview?
    @Published var cnHotStocks: [HotStock] = []
    @Published var usHotStocks: [HotStock] = []
    @Published var sectors: [SectorItem] = []
    @Published var searchResults: [StockSearchResult] = []
    @Published var isLoadingOverview = false
    @Published var isLoadingHot = false
    @Published var isLoadingSectors = false
    @Published var isSearching = false
    @Published var overviewError: String?
    @Published var hotError: String?
    @Published var sectorsError: String?
    @Published var searchError: String?

    private var searchTask: Task<Void, Never>?

    func loadAll() async {
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadOverview() }
            group.addTask { await self.loadHotStocks() }
            group.addTask { await self.loadSectors() }
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

    func loadSectors() async {
        isLoadingSectors = true
        sectorsError = nil
        do {
            let resp: SectorsResponse = try await APIClient.shared.get("/market/sectors")
            sectors = resp.sectors
        } catch {
            sectorsError = errorMessage(error)
        }
        isLoadingSectors = false
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
                let hasCJK = query.unicodeScalars.contains { $0.value >= 0x2E80 }
                let lettersOnly = query.allSatisfy { $0.isASCII && $0.isLetter }
                async let cnTask: Result<[StockSearchResult], Error> = Self.fetch {
                    try await APIClient.shared.get("/stocks/search", params: ["q": query])
                }
                async let usTask: Result<[USSearchItem], Error> = hasCJK ? .success([]) : Self.fetch {
                    try await APIClient.shared.get("/us/search", params: ["q": query])
                }
                let (cnRes, usRes) = await (cnTask, usTask)
                if Task.isCancelled { return }
                var cn: [StockSearchResult] = []
                var us: [StockSearchResult] = []
                if case .success(let r) = cnRes { cn = r }
                if case .success(let r) = usRes { us = r.map(\.asResult) }
                if case .failure(let e) = cnRes, case .failure = usRes { throw e }
                searchResults = lettersOnly ? us + cn : cn + us
            } catch {
                if !Task.isCancelled { searchError = errorMessage(error) }
            }
            if !Task.isCancelled { isSearching = false }
        }
    }

    private nonisolated static func fetch<T>(_ op: @Sendable () async throws -> T) async -> Result<T, Error> {
        do { return .success(try await op()) } catch { return .failure(error) }
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

struct SearchHistoryItem: Codable, Identifiable, Equatable {
    let code: String
    let name: String
    let market: String
    var id: String { "\(market)_\(code)" }
}

@MainActor
final class SearchHistoryStore: ObservableObject {
    static let shared = SearchHistoryStore()
    private let key = "searchHistory.v1"
    private let limit = 8

    @Published private(set) var items: [SearchHistoryItem] = []

    private init() {
        if let data = UserDefaults.standard.data(forKey: key),
           let decoded = try? JSONDecoder().decode([SearchHistoryItem].self, from: data) {
            items = decoded
        }
    }

    func record(code: String, name: String, market: Market) {
        let item = SearchHistoryItem(code: code, name: name, market: market.rawValue)
        items.removeAll { $0 == item }
        items.insert(item, at: 0)
        if items.count > limit { items = Array(items.prefix(limit)) }
        persist()
    }

    func clear() {
        items = []
        persist()
    }

    private func persist() {
        if let data = try? JSONEncoder().encode(items) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }
}
