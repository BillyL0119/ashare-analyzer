import SwiftUI

struct LeaderboardView: View {
    @ObservedObject var vm: PaperTradingViewModel
    @Environment(\.dismiss) private var dismiss

    private var top3: [LeaderboardEntry] { Array(vm.leaderboard.prefix(3)) }
    private var rest: [LeaderboardEntry] { Array(vm.leaderboard.dropFirst(3)) }

    var body: some View {
        NavigationStack {
            Group {
                if vm.leaderboard.isEmpty {
                    ProgressView("加载排行榜…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(spacing: 20) {
                            podium
                            if !rest.isEmpty {
                                VStack(spacing: 0) {
                                    ForEach(Array(rest.enumerated()), id: \.element.id) { idx, entry in
                                        LeaderboardRow(entry: entry)
                                            .padding(.horizontal, 16)
                                            .padding(.vertical, 11)
                                            .background(entry.isMe ? DS.accent.opacity(0.12) : Color.clear)
                                        if idx < rest.count - 1 { RowDivider() }
                                    }
                                }
                                .clipShape(RoundedRectangle(cornerRadius: DS.radius, style: .continuous))
                                .card(padding: 0)
                            }
                        }
                        .padding(16)
                    }
                }
            }
            .background(DS.bg.ignoresSafeArea())
            .navigationTitle("收益排行榜")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("关闭") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationBackground(DS.bg)
        .task { await vm.loadLeaderboard() }
    }

    // Order 2 – 1 – 3 with the winner raised.
    private var podium: some View {
        let order: [Int] = top3.count >= 3 ? [1, 0, 2] : Array(top3.indices)
        return HStack(alignment: .bottom, spacing: 10) {
            ForEach(order, id: \.self) { i in
                PodiumCard(entry: top3[i], isFirst: top3[i].rank == 1)
            }
        }
    }
}

private func medalColor(_ rank: Int) -> Color? {
    switch rank {
    case 1: return Color(r: 0xF5, g: 0xC5, b: 0x42)
    case 2: return Color(r: 0xB8, g: 0xC2, b: 0xD0)
    case 3: return Color(r: 0xD9, g: 0x8A, b: 0x4E)
    default: return nil
    }
}

private struct PodiumCard: View {
    let entry: LeaderboardEntry
    let isFirst: Bool

    var body: some View {
        let medal = medalColor(entry.rank) ?? .secondary
        VStack(spacing: 8) {
            Image(systemName: isFirst ? "crown.fill" : "medal.fill")
                .font(.system(size: isFirst ? 22 : 18, weight: .semibold))
                .foregroundStyle(medal)
            Text("\(entry.rank)")
                .font(.system(size: isFirst ? 30 : 24, weight: .bold, design: .rounded))
                .foregroundStyle(medal)
            Text(entry.nickname + (entry.isMe ? L("（我）") : ""))
                .font(.caption.weight(.semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            PctPill(pct: entry.returnPct, market: .cn, minWidth: 0)
                .fixedSize()
            Text("¥\(entry.totalValue, format: .number.precision(.fractionLength(0)))")
                .font(.system(.caption2, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, isFirst ? 20 : 14)
        .padding(.horizontal, 8)
        .frame(maxWidth: .infinity)
        .background {
            RoundedRectangle(cornerRadius: DS.radius, style: .continuous)
                .fill(LinearGradient(colors: [medal.opacity(0.22), DS.surface],
                                     startPoint: .top, endPoint: .bottom))
        }
        .overlay(
            RoundedRectangle(cornerRadius: DS.radius, style: .continuous)
                .strokeBorder(entry.isMe ? DS.accent : medal.opacity(0.35), lineWidth: entry.isMe ? 1.5 : 1)
        )
    }
}

private struct LeaderboardRow: View {
    let entry: LeaderboardEntry

    var body: some View {
        HStack(spacing: 12) {
            Text("\(entry.rank)")
                .font(.system(.subheadline, design: .rounded).weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(.secondary)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(entry.nickname)
                        .font(.subheadline.weight(entry.isMe ? .semibold : .regular))
                    if entry.isMe {
                        Text("我")
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(DS.accent, in: Capsule())
                    }
                }
                Text("¥\(entry.totalValue, format: .number.precision(.fractionLength(0)))")
                    .font(.caption)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }

            Spacer()
            PctPill(pct: entry.returnPct, market: .cn)
        }
    }
}
