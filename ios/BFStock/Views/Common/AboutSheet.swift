import SwiftUI

struct AboutSheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        Spacer()
                        VStack(spacing: 6) {
                            Image(systemName: "chart.line.uptrend.xyaxis.circle.fill")
                                .font(.system(size: 52))
                                .foregroundStyle(Color.accentColor)
                            Text("BFStock")
                                .font(.title2.weight(.bold))
                            Text("版本 1.0")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 12)
                        Spacer()
                    }
                }
                .listRowBackground(Color.clear)

                Section("关于") {
                    LabeledContent("开发者", value: "Billy L.")
                    LabeledContent("网站", value: "bestfriendstock.com")
                    Link(destination: URL(string: "https://bestfriendstock.com")!) {
                        Label("访问网站", systemImage: "safari")
                    }
                }

                Section("法律") {
                    Link(destination: URL(string: "https://bestfriendstock.com/privacy")!) {
                        Label("隐私政策 / Privacy Policy", systemImage: "hand.raised")
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text("免责声明")
                            .font(.subheadline.weight(.medium))
                        Text("本应用仅供学习和教育目的，不构成任何投资建议。股市有风险，投资需谨慎。行情数据可能存在延迟。AI 老师内容由 AI 生成，仅供参考。")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }

                Section("数据") {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("数据说明")
                            .font(.subheadline.weight(.medium))
                        Text("模拟盘数据和 AI 对话记录存储在服务器上，通过设备匿名 ID 关联，不绑定任何个人身份。重置账户将永久删除所有相关数据。")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                    Link(destination: URL(string: "mailto:billyl090119@gmail.com")!) {
                        Label("联系 / 删除数据请求", systemImage: "envelope")
                    }
                }
            }
            .navigationTitle("关于")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("关闭") { dismiss() }
                }
            }
        }
        .presentationDetents([.large])
    }
}
