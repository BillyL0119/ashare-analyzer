import SwiftUI

// MARK: - Model (/heatmap)

struct HeatmapTile: Decodable, Identifiable {
    let symbol: String
    let name: String
    let marketCap: Double
    let changePct: Double?
    var id: String { symbol }
}

struct HeatmapSector: Decodable, Identifiable {
    let name: String
    let nameEn: String?
    let marketCap: Double
    let changePct: Double?
    let stocks: [HeatmapTile]
    var id: String { name }
}

struct HeatmapResponse: Decodable {
    let market: String
    let sectors: [HeatmapSector]
}

// MARK: - Squarified treemap (Bruls, Huizing & van Wijk) — same algorithm as the web's utils/heatmap.js

enum Treemap {
    /// Lays `values` (positive, ideally sorted largest first) into `rect`; returns one rect per value, same order.
    static func squarify(_ values: [Double], in rect: CGRect) -> [CGRect] {
        let total = values.reduce(0, +)
        guard total > 0, rect.width > 0, rect.height > 0 else { return values.map { _ in .zero } }
        let scale = Double(rect.width * rect.height) / total
        let areas = values.map { $0 * scale }
        var out = [CGRect](repeating: .zero, count: values.count)
        var r = rect
        var row: [Int] = []

        func worst(_ idx: [Int], _ side: Double) -> Double {
            let s = idx.reduce(0) { $0 + areas[$1] }
            let mx = idx.map { areas[$0] }.max() ?? 0, mn = idx.map { areas[$0] }.min() ?? 1
            return max(side * side * mx / (s * s), (s * s) / (side * side * mn))
        }
        func place(_ idx: [Int]) {
            let s = idx.reduce(0) { $0 + areas[$1] }
            if r.width >= r.height {
                let w = CGFloat(s) / r.height
                var y = r.minY
                for i in idx { let h = CGFloat(areas[i]) / w; out[i] = CGRect(x: r.minX, y: y, width: w, height: h); y += h }
                r = CGRect(x: r.minX + w, y: r.minY, width: r.width - w, height: r.height)
            } else {
                let h = CGFloat(s) / r.width
                var x = r.minX
                for i in idx { let w = CGFloat(areas[i]) / h; out[i] = CGRect(x: x, y: r.minY, width: w, height: h); x += w }
                r = CGRect(x: r.minX, y: r.minY + h, width: r.width, height: r.height - h)
            }
        }
        for i in areas.indices where areas[i] > 0 {
            let side = Double(min(r.width, r.height))
            if row.isEmpty || worst(row + [i], side) <= worst(row, side) { row.append(i) } else { place(row); row = [i] }
        }
        if !row.isEmpty { place(row) }
        return out
    }
}

// MARK: - View

/// Market heatmap card for the Market tab: tile area = market cap, colour = today's move, grouped by sector.
struct MarketHeatmapSection: View {
    let market: Market
    @State private var data: HeatmapResponse?
    @State private var failed = false
    private let header: CGFloat = 15

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("市场热力图"))
            VStack(spacing: 8) {
                if let data, data.market == market.rawValue {
                    GeometryReader { geo in map(data, size: geo.size) }
                        .frame(height: 400)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    footer(data)
                } else if failed {
                    ErrorRetryView(message: L("加载失败")) { Task { await load() } }
                        .frame(maxWidth: .infinity).padding(.vertical, 20)
                } else {
                    RoundedRectangle(cornerRadius: 10, style: .continuous).fill(DS.stroke).frame(height: 400)
                }
            }
            .card(padding: 6)
        }
        .task(id: market) { await load() }
    }

    private func load() async {
        let path = "/heatmap"
        let params = ["market": market.rawValue, "limit": "80"]
        if data == nil, let cached: HeatmapResponse = APIClient.shared.cached(path, params: params), cached.market == market.rawValue {
            data = cached
        }
        do {
            data = try await APIClient.shared.get(path, params: params, persist: true)
            failed = false
        } catch {
            if data == nil { failed = true }
        }
    }

    @ViewBuilder
    private func map(_ d: HeatmapResponse, size: CGSize) -> some View {
        let sectorRects = Treemap.squarify(d.sectors.map(\.marketCap), in: CGRect(origin: .zero, size: size))
        ZStack(alignment: .topLeading) {
            Color(r: 0x1B, g: 0x1F, b: 0x2A)
            ForEach(Array(d.sectors.enumerated()), id: \.element.id) { i, g in
                let sr = sectorRects[i]
                let showHead = sr.height > header + 18 && sr.width > 44
                let inner = CGRect(x: sr.minX + 1, y: sr.minY + (showHead ? header : 0) + 1,
                                   width: max(sr.width - 2, 0), height: max(sr.height - (showHead ? header : 0) - 2, 0))
                let rects = Treemap.squarify(g.stocks.map(\.marketCap), in: inner)
                if showHead {
                    Text("\(sectorName(g)) \(pctText(g.changePct))")
                        .font(.system(size: 9.5, weight: .semibold))
                        .foregroundStyle(Color(white: 0.85))
                        .lineLimit(1)
                        .frame(width: sr.width - 6, height: header, alignment: .leading)
                        .offset(x: sr.minX + 3, y: sr.minY)
                        .allowsHitTesting(false)
                }
                ForEach(Array(g.stocks.enumerated()), id: \.element.id) { j, s in
                    tile(s, rect: rects[j])
                }
            }
        }
    }

    private func tile(_ s: HeatmapTile, rect: CGRect) -> some View {
        let big = rect.width > 70 && rect.height > 44
        return NavigationLink(destination: StockDetailView(code: s.symbol, name: s.name, market: market)) {
            ZStack {
                Self.color(s.changePct, market: market)
                VStack(spacing: 1) {
                    if rect.width > 30 && rect.height > 18 {
                        Text(market == .cn && Lang.code == "zh" ? s.name : s.symbol)
                            .font(.system(size: big ? 13 : 10, weight: .bold))
                            .lineLimit(1).minimumScaleFactor(0.7)
                    }
                    if rect.width > 40 && rect.height > 34 {
                        Text(pctText(s.changePct)).font(.system(size: big ? 11 : 9)).opacity(0.9)
                    }
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 1)
            }
            .frame(width: max(rect.width - 1, 0), height: max(rect.height - 1, 0))
        }
        .buttonStyle(.plain)
        .offset(x: rect.minX, y: rect.minY)
        .accessibilityLabel("\(s.name) \(pctText(s.changePct))")
    }

    private func footer(_ d: HeatmapResponse) -> some View {
        let all = d.sectors.flatMap(\.stocks)
        let ups = all.filter { ($0.changePct ?? 0) > 0 }.count
        let downs = all.filter { ($0.changePct ?? 0) < 0 }.count
        return HStack {
            Text(L("面积代表市值，颜色代表今日涨跌"))
            Spacer(minLength: 6)
            Text(L("%lld 涨 · %lld 跌", ups, downs))
        }
        .font(.caption2)
        .foregroundStyle(.secondary)
        .padding(.horizontal, 4)
        .padding(.bottom, 2)
    }

    private func sectorName(_ g: HeatmapSector) -> String {
        if market == .cn { return Lang.code == "zh" ? g.name : (g.nameEn ?? L(g.name)) }
        return Lang.code == "zh" ? (ScreenerView.sectorZh[g.name] ?? g.name) : g.name
    }

    private func pctText(_ v: Double?) -> String {
        guard let v else { return "—" }
        return String(format: "%@%.2f%%", v > 0 ? "+" : "", v)
    }

    /// Same scale as the web: neutral grey to full green/red at ±3%; US green up, A-shares red up.
    static func color(_ chg: Double?, market: Market) -> Color {
        let neutral: (Double, Double, Double) = (58, 63, 76)
        guard let chg else { return Color(red: neutral.0 / 255, green: neutral.1 / 255, blue: neutral.2 / 255) }
        let green: (Double, Double, Double) = (22, 163, 74), red: (Double, Double, Double) = (220, 38, 38)
        let upIsGreen = market == .us
        let target = (chg >= 0) == upIsGreen ? green : red
        let k = pow(min(abs(chg) / 3, 1), 0.8)
        func mix(_ a: Double, _ b: Double) -> Double { (a + (b - a) * k) / 255 }
        return Color(red: mix(neutral.0, target.0), green: mix(neutral.1, target.1), blue: mix(neutral.2, target.2))
    }
}
