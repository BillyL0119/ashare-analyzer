import SwiftUI

struct LeaderboardView: View {
    @ObservedObject var vm: PaperTradingViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if vm.leaderboard.isEmpty {
                    ProgressView("加载排行榜…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(vm.leaderboard) { entry in
                        LeaderboardRow(entry: entry)
                            .listRowBackground(entry.isMe ? Color.accentColor.opacity(0.08) : nil)
                    }
                }
            }
            .navigationTitle("收益排行榜")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("关闭") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .task { await vm.loadLeaderboard() }
    }
}

private struct LeaderboardRow: View {
    let entry: LeaderboardEntry

    private var medalColor: Color? {
        switch entry.rank {
        case 1: return .yellow
        case 2: return Color(r: 0xC0, g: 0xC0, b: 0xC0)
        case 3: return Color(r: 0xCD, g: 0x7F, b: 0x32)
        default: return nil
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                if let color = medalColor {
                    Circle().fill(color.opacity(0.2)).frame(width: 32, height: 32)
                    Text("\(entry.rank)")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(color)
                } else {
                    Text("\(entry.rank)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .frame(width: 32)
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text(entry.nickname)
                        .font(.subheadline.weight(entry.isMe ? .semibold : .regular))
                    if entry.isMe {
                        Text("我")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(Color.accentColor)
                            .clipShape(Capsule())
                    }
                }
                Text("¥\(entry.totalValue, format: .number.precision(.fractionLength(0)))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Text(entry.returnPct >= 0 ? "+\(String(format: "%.2f", entry.returnPct))%" : "\(String(format: "%.2f", entry.returnPct))%")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(entry.returnPct >= 0 ? Theme.cnUp : Theme.cnDown)
        }
        .padding(.vertical, 2)
    }
}
