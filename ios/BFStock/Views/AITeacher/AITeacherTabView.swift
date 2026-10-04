import SwiftUI
import Combine

struct AITeacherTabView: View {
    @StateObject private var vm = AITeacherViewModel()
    @FocusState private var inputFocused: Bool
    private let impactHaptic = UIImpactFeedbackGenerator(style: .light)

    private let shortcuts: [(String, String)] = [
        ("什么是K线图", "bubble.left"),
        ("PE比率怎么看", "chart.bar"),
        ("股票和基金区别", "scale.3d"),
        ("如何看财报", "doc.text"),
        ("什么是止损", "exclamationmark.triangle"),
        ("分散投资原则", "circle.grid.3x3"),
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                messagesArea
                inputBar
            }
            .navigationTitle("tab.ai_teacher")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    if !vm.messages.isEmpty {
                        Button { vm.clearHistory() } label: {
                            Image(systemName: "trash")
                        }
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
        VStack(spacing: 20) {
            Image(systemName: "brain.head.profile")
                .font(.system(size: 48))
                .foregroundStyle(Color.accentColor)
                .padding(.top, 32)

            Text("AI股票老师")
                .font(.title2.weight(.semibold))

            Text("我可以帮你解答股票、基金、经济学相关问题。")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            VStack(alignment: .leading, spacing: 8) {
                Text("快速提问")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)

                ForEach(shortcuts, id: \.0) { text, icon in
                    Button {
                        vm.inputText = text
                        impactHaptic.impactOccurred()
                        vm.send()
                    } label: {
                        Label(text, systemImage: icon)
                            .font(.subheadline)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.secondary.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.top, 4)

            Text("仅供学习，不构成投资建议")
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .padding(.top, 8)
        }
        .padding(.horizontal, 8)
        .frame(maxWidth: .infinity)
    }

    // MARK: - Input Bar

    private var inputBar: some View {
        VStack(spacing: 0) {
            Divider()
            HStack(alignment: .bottom, spacing: 8) {
                TextField("输入问题…", text: $vm.inputText, axis: .vertical)
                    .lineLimit(1...5)
                    .padding(10)
                    .background(Color.secondary.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
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
                                : Color.accentColor)
                            .clipShape(Circle())
                    }
                    .disabled(vm.inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .padding(.horizontal)
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
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 14))
                    .foregroundStyle(.white)
                    .frame(width: 28, height: 28)
                    .background(Color.accentColor)
                    .clipShape(Circle())
            }

            VStack(alignment: isUser ? .trailing : .leading, spacing: 4) {
                Group {
                    if message.content.isEmpty && message.isStreaming {
                        TypingIndicator()
                    } else {
                        Text(message.content)
                            .font(.body)
                            .foregroundStyle(isUser ? .white : .primary)
                            .textSelection(.enabled)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isUser ? Color.accentColor : Color.secondary.opacity(0.12))
                .clipShape(BubbleShape(isUser: isUser))

                if message.isStreaming && !message.content.isEmpty {
                    Image(systemName: "ellipsis")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if isUser {
                Image(systemName: "person.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(.white)
                    .frame(width: 28, height: 28)
                    .background(Color.secondary.opacity(0.5))
                    .clipShape(Circle())
            }

            if !isUser { Spacer(minLength: 48) }
        }
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
