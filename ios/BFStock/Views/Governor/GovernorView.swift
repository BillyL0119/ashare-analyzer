import SwiftUI

/// "Be the Fed chair" wording (ios/tools/l10n_catalog.py, keys "gv.…")
func GV(_ key: String) -> String { L("gv." + key) }
func GV(_ key: String, _ args: CVarArg...) -> String { String(format: L("gv." + key), locale: Lang.locale, arguments: args) }

// MARK: - Shared formatting

enum GVFmt {
    static let target = Color(light: Color(r: 0x05, g: 0x96, b: 0x69), dark: Color(r: 0x34, g: 0xD3, b: 0x99))
    static let hot = Color(light: Color(r: 0xDC, g: 0x26, b: 0x26), dark: Color(r: 0xF8, g: 0x71, b: 0x71))
    static let news = Color(r: 0xF5, g: 0x9E, b: 0x0B)

    static func pct(_ v: Double?, _ decimals: Int = 2) -> String {
        guard let v else { return "—" }
        return String(format: "%.\(decimals)f%%", locale: Lang.locale, v)
    }

    static func points(_ v: Double) -> String { String(format: "%.2f", locale: Lang.locale, v) }

    static func signed(_ v: Double) -> String { String(format: "%@%.2f", locale: Lang.locale, v > 0 ? "+" : "", v) }

    /// "2021Q2" in the app's language
    static func quarter(_ q: String) -> String {
        let parts = q.split(separator: "Q")
        guard parts.count == 2 else { return q }
        return GV("quarter", String(parts[0]), String(parts[1]))
    }

    static func tint(_ id: String) -> Color {
        switch id {
        case "inflation_2021": return Color(r: 0x0E, g: 0xA5, b: 0xE9)
        case "volcker_1979": return Color(r: 0xF5, g: 0x9E, b: 0x0B)
        case "crisis_2007": return Color(r: 0xEF, g: 0x44, b: 0x44)
        default: return DS.accent
        }
    }

    static func icon(_ id: String) -> String {
        switch id {
        case "inflation_2021": return "cart"
        case "volcker_1979": return "fuelpump"
        case "crisis_2007": return "house"
        default: return "building.columns"
        }
    }
}

// MARK: - Scenario picker

struct GovernorView: View {
    @StateObject private var vm = GovernorViewModel()
    @State private var openID: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Text(GV("intro"))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 4)

                howItWorks

                VStack(spacing: 14) {
                    if let list = vm.scenarios {
                        ForEach(list) { sc in
                            GVScenarioCard(scenario: sc) { fresh in pick(sc.id, fresh: fresh) }
                        }
                        if let err = vm.listError {
                            ErrorRetryView(message: err) { Task { await vm.loadScenarios() } }
                        }
                    } else {
                        ForEach(0..<3, id: \.self) { _ in
                            VStack(alignment: .leading, spacing: 12) {
                                SkeletonBar(width: 150, height: 36, radius: 8)
                                SkeletonBar(width: 200, height: 16)
                                SkeletonBar(height: 12)
                                SkeletonBar(width: 240, height: 12)
                            }
                            .card()
                        }
                    }
                }

                Text(GV("source"))
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .padding(.horizontal, 4)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 40)
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle(GV("title"))
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await vm.loadScenarios() }
        .task { await vm.loadScenarios() }      // also refreshes progress when coming back from a run
        .navigationDestination(item: $openID) { id in
            GovernorGameView(vm: vm, scenarioID: id)
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
        let icons = ["calendar", "hourglass", "scalemass"]
        return VStack(alignment: .leading, spacing: 14) {
            ForEach(0..<3, id: \.self) { i in
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: icons[i])
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(.white)
                        .frame(width: 26, height: 26)
                        .background(DS.accent, in: Circle())
                    VStack(alignment: .leading, spacing: 2) {
                        Text(GV("how.\(i).1")).font(.subheadline.weight(.semibold))
                        Text(GV("how.\(i).2")).font(.caption).foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
        .card()
    }
}

private struct GVScenarioCard: View {
    let scenario: GVScenario
    let onPick: (_ fresh: Bool) -> Void

    var body: some View {
        let sc = scenario
        let tint = GVFmt.tint(sc.id)
        VStack(alignment: .leading, spacing: 10) {
            Text("\(sc.start.prefix(4))–\(sc.end.prefix(4))")
                .font(.system(size: 38, weight: .heavy, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(tint)
            Text(sc.title).font(.headline)
            Text(GV("chairWas", sc.chair)).font(.caption).foregroundStyle(.secondary)
            Text(sc.tagline)
                .font(.subheadline)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 6) {
                stat(GV("inflation"), sc.startPce4, 1)
                stat(GV("unemployment"), sc.startU, 1)
                stat(GV("rate"), sc.startRate, 2)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel(GV("atStart"))
            if let pr = sc.progress {
                Group {
                    if !pr.finished {
                        Text(GV("progress", "\(pr.decision)", "\(sc.nDecisions)"))
                    } else if let best = pr.best {
                        Text(GV("best", GVFmt.points(best)))
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
                .monospacedDigit()
            }
            HStack(spacing: 10) {
                if let pr = sc.progress, !pr.finished {
                    primary(GV("resume")) { onPick(false) }
                    secondary(GV("replay")) { onPick(true) }
                } else {
                    primary(sc.progress == nil ? GV("start") : GV("replay")) { onPick(sc.progress != nil) }
                }
            }
            .padding(.top, 4)
        }
        .card()
        .overlay(alignment: .topTrailing) {
            Image(systemName: GVFmt.icon(sc.id))
                .font(.system(size: 46, weight: .light))
                .foregroundStyle(tint.opacity(0.16))
                .padding(.top, 18)
                .padding(.trailing, 18)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
        }
    }

    private func stat(_ label: String, _ v: Double?, _ decimals: Int) -> some View {
        Text("\(label) \(GVFmt.pct(v, decimals))")
            .font(.caption)
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .padding(.horizontal, 9).padding(.vertical, 4)
            .background(DS.surfaceHi, in: Capsule())
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
