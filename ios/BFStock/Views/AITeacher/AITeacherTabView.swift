import SwiftUI
import Combine

struct AITeacherTabView: View {
    @StateObject private var vm = AITeacherViewModel()
    @FocusState private var inputFocused: Bool
    private let impactHaptic = UIImpactFeedbackGenerator(style: .light)

    private let shortcuts: [(String, String)] = [
        (L("什么是标普500"), "chart.line.uptrend.xyaxis"),
        (L("ETF是什么"), "square.stack.3d.up"),
        (L("如何看财报季"), "doc.text"),
        (L("什么是做空"), "arrow.down.right"),
        (L("PE比率怎么看"), "chart.bar"),
        (L("什么是止损"), "exclamationmark.triangle"),
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                messagesArea
                inputBar
            }
            .background(DS.bg.ignoresSafeArea())
            .navigationTitle("tab.ai_teacher")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    if !vm.messages.isEmpty {
                        Button { vm.clearHistory() } label: {
                            Image(systemName: "trash")
                        }
                        .accessibilityLabel(L("清空对话"))
                        .tint(.secondary)
                    }
                }
            }
        }
    }

    // MARK: - Messages Area

    private var messagesArea: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 12) {
                    if vm.messages.isEmpty {
                        welcomeView
                    }
                    ForEach(vm.messages) { msg in
                        ChatBubble(message: msg)
                            .id(msg.id)
                    }
                    Color.clear.frame(height: 1).id("bottom")
                }
                .padding(.horizontal)
                .padding(.top, 12)
            }
            .onChange(of: vm.messages.count) { (_: Int, _: Int) in
                scrollToBottom(proxy)
            }
            .onChange(of: vm.messages.last?.content) { (_: String?, _: String?) in
                if vm.isStreaming { scrollToBottom(proxy) }
            }
            .onChange(of: vm.isStreaming) { (_: Bool, streaming: Bool) in
                if streaming { scrollToBottom(proxy) }
            }
        }
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        withAnimation(.easeOut(duration: 0.2)) {
            proxy.scrollTo("bottom", anchor: .bottom)
        }
    }

    // MARK: - Welcome View

    private var welcomeView: some View {
        VStack(spacing: 18) {
            Image(systemName: "sparkles")
                .font(.system(size: 30, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 72, height: 72)
                .background(
                    LinearGradient(colors: [DS.accent, Color(r: 0x8B, g: 0x6C, b: 0xFF)],
                                   startPoint: .topLeading, endPoint: .bottomTrailing),
                    in: RoundedRectangle(cornerRadius: 22, style: .continuous)
                )
                .shadow(color: DS.accent.opacity(0.35), radius: 18, y: 8)
                .padding(.top, 28)

            VStack(spacing: 6) {
                Text("AI股票老师")
                    .font(.title2.weight(.bold))
                Text("股票、基金、经济学，有问必答")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 10) {
                SectionHeader(L("快速提问"))
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                    ForEach(shortcuts, id: \.0) { text, icon in
                        Button {
                            vm.inputText = text
                            impactHaptic.impactOccurred()
                            vm.send()
                        } label: {
                            VStack(alignment: .leading, spacing: 10) {
                                Image(systemName: icon)
                                    .font(.callout.weight(.semibold))
                                    .foregroundStyle(DS.accent)
                                Text(text)
                                    .font(.subheadline.weight(.medium))
                                    .multilineTextAlignment(.leading)
                                    .lineLimit(2)
                                    .fixedSize(horizontal: false, vertical: true)
                                    .frame(maxWidth: .infinity, alignment: .topLeading)
                                Spacer(minLength: 0)
                            }
                            .padding(14)
                            .frame(maxWidth: .infinity, minHeight: 100, maxHeight: .infinity, alignment: .topLeading)
                            .background(DS.surface, in: RoundedRectangle(cornerRadius: DS.tileRadius + 2, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: DS.tileRadius + 2, style: .continuous).strokeBorder(DS.stroke))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.top, 6)

            Text("仅供学习，不构成投资建议")
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Input Bar

    private var inputBar: some View {
        VStack(spacing: 0) {
            HStack(alignment: .bottom, spacing: 10) {
                TextField("输入问题…", text: $vm.inputText, axis: .vertical)
                    .lineLimit(1...5)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(DS.surface, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(DS.stroke))
                    .focused($inputFocused)
                    .onSubmit {
                        impactHaptic.impactOccurred()
                        vm.send()
                    }

                if vm.isStreaming {
                    Button { vm.stopStream() } label: {
                        Image(systemName: "stop.fill")
                            .font(.system(size: 18))
                            .foregroundStyle(.white)
                            .frame(width: 36, height: 36)
                            .background(Color.red)
                            .clipShape(Circle())
                    }
                    .accessibilityLabel(L("停止生成"))
                } else {
                    Button {
                        impactHaptic.impactOccurred()
                        vm.send()
                    } label: {
                        Image(systemName: "arrow.up")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: 36, height: 36)
                            .background(vm.inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                                ? Color.secondary.opacity(0.3)
                                : DS.accent)
                            .clipShape(Circle())
                    }
                    .accessibilityLabel(L("发送"))
                    .disabled(vm.inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(.bar)
        }
    }
}

// MARK: - Chat Bubble

private struct ChatBubble: View {
    let message: ChatMessage

    private var isUser: Bool { message.role == "user" }

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if isUser { Spacer(minLength: 48) }

            if !isUser {
                Image(systemName: "sparkles")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 28, height: 28)
                    .background(DS.accent.gradient, in: Circle())
            }

            VStack(alignment: isUser ? .trailing : .leading, spacing: 4) {
                Group {
                    if message.content.isEmpty && message.isStreaming {
                        TypingIndicator()
                    } else {
                        if isUser {
                            Text(message.content)
                                .font(.body)
                                .foregroundStyle(.white)
                                .textSelection(.enabled)
                        } else {
                            MarkdownText(text: message.content)
                                .textSelection(.enabled)
                        }
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background {
                    if isUser {
                        BubbleShape(isUser: true).fill(
                            LinearGradient(colors: [DS.accent, Color(r: 0x7A, g: 0x6C, b: 0xFF)],
                                           startPoint: .topLeading, endPoint: .bottomTrailing))
                    } else {
                        BubbleShape(isUser: false).fill(DS.surface)
                            .overlay(BubbleShape(isUser: false).stroke(DS.stroke))
                    }
                }

                if message.isStreaming && !message.content.isEmpty {
                    Image(systemName: "ellipsis")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if !isUser { Spacer(minLength: 48) }
        }
    }
}

// MARK: - Markdown

private struct MarkdownText: View {
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(text.components(separatedBy: "\n").enumerated()), id: \.offset) { _, raw in
                line(raw)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private func line(_ raw: String) -> some View {
        let t = raw.trimmingCharacters(in: .whitespaces)
        if t.isEmpty {
            Color.clear.frame(height: 2)
        } else if t.hasPrefix("|") {
            tableRow(t)
        } else if t.hasPrefix("---") {
            Rectangle().fill(DS.stroke).frame(height: 1).padding(.vertical, 4)
        } else if let r = t.range(of: #"^#{1,4}\s+"#, options: .regularExpression) {
            inline(String(t[r.upperBound...]))
                .font(.headline)
                .padding(.top, 4)
        } else if t.hasPrefix("- ") || t.hasPrefix("* ") {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("•").foregroundStyle(DS.accent)
                inline(String(t.dropFirst(2)))
            }
        } else if let r = t.range(of: #"^\d+[\.、]\s+"#, options: .regularExpression) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(String(t[..<r.upperBound]).trimmingCharacters(in: .whitespaces))
                    .foregroundStyle(DS.accent)
                    .monospacedDigit()
                inline(String(t[r.upperBound...]))
            }
        } else {
            inline(t)
        }
    }

    @ViewBuilder
    private func tableRow(_ t: String) -> some View {
        let cells = t.split(separator: "|", omittingEmptySubsequences: true)
            .map { $0.trimmingCharacters(in: .whitespaces) }
        if cells.allSatisfy({ $0.allSatisfy { "-: ".contains($0) } }) {
            EmptyView()
        } else {
            HStack(alignment: .top, spacing: 8) {
                ForEach(Array(cells.enumerated()), id: \.offset) { _, c in
                    inline(c)
                        .font(.footnote)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(DS.surfaceHi, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
    }

    private func inline(_ s: String) -> Text {
        var attr = (try? AttributedString(
            markdown: s,
            options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        )) ?? AttributedString(s)
        // Model output is untrusted: keep the link text but make it inert (no phishing taps).
        for run in attr.runs where run.link != nil {
            attr[run.range].link = nil
        }
        return Text(attr)
    }
}

// MARK: - Bubble Shape

private struct BubbleShape: Shape {
    let isUser: Bool
    private let r: CGFloat = 16

    func path(in rect: CGRect) -> Path {
        var p = Path()
        let tr: CGFloat = isUser ? 4 : r
        let tl: CGFloat = isUser ? r : 4
        p.addRoundedRect(in: rect, cornerRadii: RectangleCornerRadii(
            topLeading: tl, bottomLeading: r, bottomTrailing: r, topTrailing: tr
        ))
        return p
    }
}

// MARK: - Typing Indicator

private struct TypingIndicator: View {
    @State private var phase = 0
    private let timer = Timer.publish(every: 0.4, on: .main, in: .common).autoconnect()

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3, id: \.self) { i in
                Circle()
                    .frame(width: 7, height: 7)
                    .foregroundStyle(.secondary.opacity(i == phase % 3 ? 1 : 0.3))
            }
        }
        .onReceive(timer) { _ in
            withAnimation(.easeInOut(duration: 0.3)) { phase += 1 }
        }
    }
}
