import SwiftUI

// MARK: - Shared formatting

enum TMFmt {
    static func money(_ v: Double, _ m: Market, decimals: Int = 2) -> String {
        (v < 0 ? "-" : "") + m.currencySymbol + Formatters.price(abs(v), decimals: decimals)
    }

    static func signed(_ v: Double, _ m: Market, decimals: Int = 0) -> String {
        (v > 0 ? "+" : v < 0 ? "-" : "") + m.currencySymbol + Formatters.price(abs(v), decimals: decimals)
    }

    /// A-share ETFs trade around ¥4, so they keep a third decimal
    static func price(_ v: Double, _ m: Market) -> String {
        Formatters.price(v, decimals: m == .cn && abs(v) < 10 ? 3 : 2)
    }

    /// Axis label: ¥102万 / $95.0K
    static func compact(_ v: Double, _ m: Market) -> String {
        func short(_ x: Double) -> String { String(format: abs(x) >= 100 ? "%.0f" : abs(x) >= 10 ? "%.1f" : "%.2f", x) }
        let a = abs(v)
        if Lang.usesMyriad, a >= 10_000 { return m.currencySymbol + short(v / 10_000) + L("万") }
        if a >= 1_000_000 { return m.currencySymbol + short(v / 1_000_000) + "M" }
        if a >= 1_000 { return m.currencySymbol + short(v / 1_000) + "K" }
        return m.currencySymbol + short(v)
    }

    static func pct(_ v: Double?) -> String {
        guard let v else { return "—" }
        return String(format: "%@%.2f%%", v > 0 ? "+" : "", v)
    }

    static func color(_ v: Double?, _ m: Market) -> Color {
        Theme.changeColor(v ?? 0, market: m)
    }

    static func tint(_ id: String) -> Color {
        switch id {
        case "gfc_2008": return Color(r: 0xEF, g: 0x44, b: 0x44)
        case "covid_2020": return Color(r: 0x8B, g: 0x5C, b: 0xF6)
        case "ashare_2015": return Color(r: 0xF5, g: 0x9E, b: 0x0B)
        case "rates_2022": return Color(r: 0x0E, g: 0xA5, b: 0xE9)
        default: return DS.accent
        }
    }

    static func icon(_ id: String) -> String {
        switch id {
        case "gfc_2008": return "building.columns"
        case "covid_2020": return "cross.case"
        case "ashare_2015": return "chart.line.downtrend.xyaxis"
        case "rates_2022": return "percent"
        default: return "clock.arrow.circlepath"
        }
    }

    static let news = Color(r: 0xF5, g: 0x9E, b: 0x0B)
}

// MARK: - Entry card (paper trading tab)

struct TimeMachineEntryCard: View {
    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 46, height: 46)
                .background(DS.accentGradient, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
            VStack(alignment: .leading, spacing: 3) {
                Text(L("历史穿越交易")).font(.subheadline.weight(.semibold))
                Text(L("回到 2008 金融危机、2020 疫情暴跌等真实时刻，用虚拟资金一天天做决定"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Image(systemName: "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.tertiary)
        }
        .contentShape(Rectangle())
        .card()
    }
}

// MARK: - Scenario picker

struct TimeMachineView: View {
    @StateObject private var vm = TimeMachineViewModel()
    @State private var openID: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Text(L("回到真实的历史时刻：你只能看到当天以前的行情和新闻，用虚拟资金一天天做决定，结束后揭晓结局。"))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 4)

                howItWorks

                VStack(spacing: 14) {
                    if let list = vm.scenarios {
                        ForEach(list) { sc in
                            ScenarioCard(scenario: sc) { fresh in pick(sc.id, fresh: fresh) }
                        }
                        if let err = vm.listError {
                            ErrorRetryView(message: err) { Task { await vm.loadScenarios() } }
                        }
                    } else {
                        ForEach(0..<3, id: \.self) { _ in
                            VStack(alignment: .leading, spacing: 12) {
                                SkeletonBar(width: 90, height: 36, radius: 8)
                                SkeletonBar(width: 200, height: 16)
                                SkeletonBar(height: 12)
                                SkeletonBar(width: 240, height: 12)
                            }
                            .card()
                        }
                    }
                }

                Text(L("价格为当时真实的每日收盘价（美股：新浪财经；A股：腾讯财经），A股分红送转按除权日发放；美股未计入现金分红。新闻为有据可查的公开事件。仅供学习。"))
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .padding(.horizontal, 4)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 40)
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle(L("历史穿越交易"))
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await vm.loadScenarios() }
        .task { await vm.loadScenarios() }      // also refreshes progress when coming back from a run
        .navigationDestination(item: $openID) { id in
            TimeMachineGameView(vm: vm, scenarioID: id)
        }
        .onChange(of: openID) { _, id in
            if id == nil { vm.close() }
        }
    }

    private func pick(_ id: String, fresh: Bool) {
        Task { await vm.open(id, fresh: fresh) }
        openID = id
    }

    private var howItWorks: some View {
        let steps = [
            (L("选一段历史"), L("2008 金融危机、2020 疫情暴跌、2015 股灾、2022 加息…")),
            (L("一天天往前走"), L("只看得到当天以前的真实价格和新闻，未来对你保密")),
            (L("揭晓结局"), L("和一直持有指数基金比一比，学习对应的考试知识点")),
        ]
        return VStack(alignment: .leading, spacing: 14) {
            ForEach(Array(steps.enumerated()), id: \.offset) { i, step in
                HStack(alignment: .top, spacing: 12) {
                    Text("\(i + 1)")
                        .font(.footnote.weight(.heavy))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                        .frame(width: 26, height: 26)
                        .background(DS.accent, in: Circle())
                    VStack(alignment: .leading, spacing: 2) {
                        Text(step.0).font(.subheadline.weight(.semibold))
                        Text(step.1).font(.caption).foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
        .card()
    }
}

private struct ScenarioCard: View {
    let scenario: TMScenario
    let onPick: (_ fresh: Bool) -> Void

    var body: some View {
        let sc = scenario
        let m = sc.marketValue
        let tint = TMFmt.tint(sc.id)
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .center) {
                Text(sc.year)
                    .font(.system(size: 42, weight: .heavy, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(tint)
                Spacer()
                Text(m.label)
                    .font(.caption2.weight(.semibold))
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .foregroundStyle(tint)
                    .background(tint.opacity(0.14), in: Capsule())
            }
            Text(sc.title).font(.headline)
            Text("\(TMDate.short(sc.startDate)) → \(TMDate.short(sc.endDate)) · \(L("%lld 个交易日", sc.nDays))")
                .font(.caption)
                .foregroundStyle(.secondary)
                .monospacedDigit()
            Text(sc.tagline)
                .font(.subheadline)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 4) {
                Text(L("起始资金")).foregroundStyle(.secondary)
                Text(TMFmt.money(sc.cash, m, decimals: 0)).fontWeight(.semibold).monospacedDigit()
                if let n = sc.instruments {
                    Text("· " + L("%lld 个可交易品种", n)).foregroundStyle(.secondary)
                }
            }
            .font(.caption)
            if let pr = sc.progress {
                VStack(alignment: .leading, spacing: 3) {
                    if !pr.finished {
                        HStack(spacing: 4) {
                            Text(L("进行到第 %lld/%lld 天", pr.day + 1, sc.nDays)).foregroundStyle(.secondary)
                            Text("· " + TMFmt.pct(pr.returnPct)).foregroundStyle(TMFmt.color(pr.returnPct, m))
                        }
                    }
                    if let best = pr.best {
                        HStack(spacing: 4) {
                            Text(L("你的最好成绩")).foregroundStyle(.secondary)
                            Text(TMFmt.pct(best)).fontWeight(.bold).foregroundStyle(TMFmt.color(best, m))
                        }
                    }
                }
                .font(.caption)
                .monospacedDigit()
            }
            HStack(spacing: 10) {
                if let pr = sc.progress, !pr.finished {
                    primary(L("继续")) { onPick(false) }
                    secondary(L("重新开始")) { onPick(true) }
                } else {
                    primary(sc.progress == nil ? L("开始穿越") : L("再玩一次")) { onPick(true) }
                }
            }
            .padding(.top, 4)
        }
        .card()
        .overlay(alignment: .bottomTrailing) {
            Image(systemName: TMFmt.icon(sc.id))
                .font(.system(size: 54, weight: .light))
                .foregroundStyle(tint.opacity(0.16))
                .padding(.bottom, 14)
                .padding(.trailing, 18)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
        }
    }

    private func primary(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(.subheadline.weight(.semibold))
                .padding(.horizontal, 18).padding(.vertical, 9)
                .foregroundStyle(.white)
                .background(DS.accentGradient, in: Capsule())
        }
        .buttonStyle(.plain)
    }

    private func secondary(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(.subheadline.weight(.semibold))
                .padding(.horizontal, 16).padding(.vertical, 9)
                .foregroundStyle(.primary)
                .background(DS.surfaceHi, in: Capsule())
        }
        .buttonStyle(.plain)
    }
}
