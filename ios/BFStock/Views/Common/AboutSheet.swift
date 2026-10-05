import SwiftUI

struct AboutSheet: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage("appearance") private var appearance = AppearanceSetting.system.rawValue
    @AppStorage(Lang.storageKey) private var language = AppLanguage.system.rawValue

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    hero

                    VStack(alignment: .leading, spacing: 10) {
                        SectionHeader(L("外观"))
                        HStack(spacing: 8) {
                            ForEach(AppearanceSetting.allCases) { opt in
                                Button {
                                    withAnimation(.easeInOut(duration: 0.25)) { appearance = opt.rawValue }
                                } label: {
                                    Text(opt.label)
                                        .font(.subheadline.weight(.semibold))
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .foregroundStyle(appearance == opt.rawValue ? Color.white : Color.primary)
                                        .background(appearance == opt.rawValue ? DS.accent : DS.surfaceHi, in: Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .card()
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        SectionHeader(L("语言"))
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
                            ForEach(AppLanguage.allCases) { opt in
                                Button {
                                    withAnimation(.easeInOut(duration: 0.25)) { language = opt.rawValue }
                                } label: {
                                    Text(opt.nativeName)
                                        .font(.subheadline.weight(.semibold))
                                        .lineLimit(1)
                                        .minimumScaleFactor(0.8)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .foregroundStyle(language == opt.rawValue ? Color.white : Color.primary)
                                        .background(language == opt.rawValue ? DS.accent : DS.surfaceHi, in: Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .card()
                        .sensoryFeedback(.selection, trigger: language)
                    }

                    group(L("关于")) {
                        infoRow(L("开发者"), "Billy L.")
                        RowDivider()
                        infoRow(L("网站"), "bestfriendstock.com")
                        RowDivider()
                        linkRow(L("访问网站"), "safari", "https://bestfriendstock.com")
                    }

                    group(L("法律")) {
                        linkRow(L("隐私政策 / Privacy Policy"), "hand.raised", "https://bestfriendstock.com/privacy")
                        RowDivider()
                        note(L("免责声明"), L("本应用仅供学习和教育目的，不构成任何投资建议。股市有风险，投资需谨慎。行情数据可能存在延迟。AI 老师内容由 AI 生成，仅供参考。"))
                    }

                    group(L("数据")) {
                        note(L("数据说明"), L("模拟盘数据和 AI 对话记录存储在服务器上，通过设备匿名 ID 关联，不绑定任何个人身份。重置账户将永久删除所有相关数据。"))
                        RowDivider()
                        linkRow(L("联系 / 删除数据请求"), "envelope", "mailto:billyl090119@gmail.com")
                    }
                }
                .padding(16)
            }
            .background(DS.bg.ignoresSafeArea())
            .navigationTitle("关于")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("关闭") { dismiss() }
                }
            }
        }
        .presentationDetents([.large])
        .presentationBackground(DS.bg)
    }

    private var hero: some View {
        VStack(spacing: 10) {
            Image(systemName: "chart.line.uptrend.xyaxis")
                .font(.system(size: 30, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 76, height: 76)
                .background(DS.accentGradient, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
                .shadow(color: DS.accent.opacity(0.35), radius: 18, y: 8)
            Text("BFStock")
                .font(.title2.weight(.bold))
            Text("Best Friend Stock · 版本 1.0")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.top, 8)
    }

    private func group<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(title)
            VStack(spacing: 0, content: content).card(padding: 0)
        }
    }

    private func infoRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.subheadline)
            Spacer()
            Text(value).font(.subheadline).foregroundStyle(.secondary)
        }
        .padding(16)
    }

    private func linkRow(_ title: String, _ icon: String, _ url: String) -> some View {
        Link(destination: URL(string: url)!) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .foregroundStyle(DS.accent)
                    .frame(width: 22)
                Text(title).font(.subheadline).foregroundStyle(.primary)
                Spacer()
                Image(systemName: "arrow.up.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(16)
            .contentShape(Rectangle())
        }
    }

    private func note(_ title: String, _ text: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.subheadline.weight(.semibold))
            Text(text)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
