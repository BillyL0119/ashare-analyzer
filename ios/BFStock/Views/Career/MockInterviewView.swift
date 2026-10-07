import SwiftUI

/// AI interviewer for one role: pick a type, answer one question at a time, get scored feedback at the end.
struct MockInterviewView: View {
    let role: CareerRole
    @StateObject private var vm: MockInterviewViewModel
    @FocusState private var focused: Bool

    init(role: CareerRole) {
        self.role = role
        _vm = StateObject(wrappedValue: MockInterviewViewModel(roleID: role.id))
    }

    private var types: [(String, String)] {
        [("technical", L("技术面试")), ("behavioral", L("行为面试")), ("comprehensive", L("综合面试"))]
    }

    var body: some View {
        VStack(spacing: 0) {
            if vm.started { chat } else { intro }
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle(L("模拟面试"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if vm.started {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(L("重新开始")) { vm.reset() }.disabled(vm.isStreaming)
                }
            }
        }
    }

    private var intro: some View {
        VStack(spacing: 18) {
            Spacer()
            Text(role.icon).font(.system(size: 44))
            Text(role.displayTitle).font(.title3.weight(.bold)).multilineTextAlignment(.center)
            Text(L("AI面试官会一次问一个问题，4-5轮后给出评分和改进建议"))
                .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center).padding(.horizontal, 32)
            Picker("", selection: $vm.interviewType) {
                ForEach(types, id: \.0) { Text($0.1).tag($0.0) }
            }
            .pickerStyle(.segmented).padding(.horizontal, 24)
            Button { vm.start() } label: {
                Text(L("开始面试")).font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity).padding(.vertical, 13)
                    .background(role.tint, in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
                    .foregroundStyle(.white)
            }
            .padding(.horizontal, 24)
            Spacer()
            Text("仅供学习，不构成投资建议").font(.caption2).foregroundStyle(.tertiary).padding(.bottom, 8)
        }
    }

    private var chat: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(vm.messages) { m in
                            ChatBubble(message: cleaned(m)).id(m.id)
                        }
                        Color.clear.frame(height: 1).id("bottom")
                    }
                    .padding(16)
                }
                .scrollDismissesKeyboard(.interactively)
                .onChange(of: vm.messages.last?.content) { _, _ in withAnimation(.easeOut(duration: 0.2)) { proxy.scrollTo("bottom", anchor: .bottom) } }
            }
            HStack(spacing: 10) {
                TextField(L("输入你的回答…"), text: $vm.inputText, axis: .vertical)
                    .lineLimit(1...4).focused($focused)
                    .padding(.horizontal, 14).padding(.vertical, 10)
                    .background(DS.surface, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(DS.stroke))
                Button { vm.send(); focused = false } label: {
                    Image(systemName: "arrow.up").font(.system(size: 16, weight: .bold)).foregroundStyle(.white)
                        .frame(width: 38, height: 38)
                        .background(vm.inputText.trimmingCharacters(in: .whitespaces).isEmpty || vm.isStreaming ? Color.gray.opacity(0.4) : role.tint, in: Circle())
                }
                .disabled(vm.inputText.trimmingCharacters(in: .whitespaces).isEmpty || vm.isStreaming)
            }
            .padding(.horizontal, 16).padding(.vertical, 10)
            .background(.bar)
        }
    }

    /// The interviewer marks the start of its final feedback with a control token: hide it.
    private func cleaned(_ m: ChatMessage) -> ChatMessage {
        var c = m
        c.content = m.content.replacingOccurrences(of: "[FEEDBACK_START]", with: "\n")
        return c
    }
}
