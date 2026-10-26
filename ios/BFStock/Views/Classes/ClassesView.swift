import SwiftUI

// MARK: - Entry card (paper trading tab)

struct ClassesEntryCard: View {
    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: "person.3.fill")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 46, height: 46)
                .background(LinearGradient(colors: [Color(r: 0x10, g: 0xB9, b: 0x81), Color(r: 0x0E, g: 0xA5, b: 0xE9)],
                                           startPoint: .topLeading, endPoint: .bottomTrailing),
                            in: RoundedRectangle(cornerRadius: 13, style: .continuous))
            VStack(alignment: .leading, spacing: 3) {
                Text(L("班级")).font(.subheadline.weight(.semibold))
                Text(L("加入老师的班级：作业根据你在 App 里的练习自动完成"))
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

// MARK: - Classes (student side)

/// Join a teacher's class with its code, follow its assignments and leaderboard, or leave it.
/// Teachers create and manage classes on the website.
struct ClassesView: View {
    @Binding var link: String?        // class code from an invite link, looked up on arrival
    let nickname: String?             // the paper account's, suggested as the class nickname
    let missionCount: Int
    let onMission: (String) -> Void   // opens the paper-trading step for a learning mission id

    @StateObject private var vm = ClassesViewModel()
    @StateObject private var tm = TimeMachineViewModel()
    @State private var scenarioID: String?
    @State private var leaving: StudentClass?
    @State private var code = ""

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    Text(L("用老师给的班级码加入班级。作业会根据你在这个 App 里的学习任务、模拟交易和历史穿越自动完成。"))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.horizontal, 4)

                    if let list = vm.classes {
                        if !list.isEmpty {
                            VStack(alignment: .leading, spacing: 10) {
                                SectionHeader(L("我加入的班级"))
                                ForEach(list) { c in
                                    ClassCard(c: c, missionCount: missionCount, onStart: start) { leaving = c }
                                }
                            }
                        }
                        if let err = vm.loadError {
                            ErrorRetryView(message: err) { Task { await vm.load() } }
                        }
                        JoinClassCard(vm: vm, code: $code, nickname: nickname, joinedCodes: Set(list.map(\.code)), empty: list.isEmpty)
                            .id("join")
                    } else {
                        VStack(alignment: .leading, spacing: 12) {
                            SkeletonBar(width: 160, height: 18)
                            SkeletonBar(height: 12)
                            SkeletonBar(height: 48, radius: 12)
                            SkeletonBar(height: 48, radius: 12)
                        }
                        .card()
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 40)
            }
            .task(id: link) {
                // An invite link: look the class up on the join card and bring it into view
                guard let c = link else { return }
                code = c
                if vm.classes == nil { await vm.load() }
                await vm.find(c)
                withAnimation { proxy.scrollTo("join", anchor: .top) }
                link = nil      // last: changing the id cancels this task
            }
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle(L("班级"))
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await vm.load() }
        .task { await vm.load() }      // also picks up assignments finished in a time-machine run
        .navigationDestination(item: $scenarioID) { id in
            TimeMachineGameView(vm: tm, scenarioID: id)
        }
        .onChange(of: scenarioID) { _, id in
            if id == nil { tm.close() }
        }
        .alert(leaving.map { "\(L("退出班级")) · \($0.name)" } ?? "",
               isPresented: Binding(get: { leaving != nil }, set: { if !$0 { leaving = nil } }),
               presenting: leaving) { c in
            Button(L("退出班级"), role: .destructive) { Task { await vm.leave(c) } }
            Button("取消", role: .cancel) {}
        } message: { _ in
            Text(L("确定退出这个班级吗？老师将看不到你的进度。"))
        }
    }

    private func start(_ a: ClassAssignment) {
        if a.isTimeMachine {
            Task { await tm.open(a.ref, fresh: false) }     // resumes a run in progress
            scenarioID = a.ref
        } else {
            onMission(a.ref)
        }
    }
}

// MARK: - A joined class

private struct ClassCard: View {
    let c: StudentClass
    let missionCount: Int
    let onStart: (ClassAssignment) -> Void
    let onLeave: () -> Void

    private static let today: String = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f.string(from: .now)
    }()

    var body: some View {
        let done = c.assignments.filter(\.done).count
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text(c.name).font(.headline)
                Text([c.teacherName.flatMap { $0.isEmpty ? nil : L("老师：%@", $0) }, L("你的昵称：%@", c.nickname)]
                        .compactMap { $0 }.joined(separator: " · "))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 10) {
                    Text(L("作业")).font(.subheadline.weight(.semibold))
                    if !c.assignments.isEmpty {
                        Text(verbatim: "\(done)/\(c.assignments.count)")
                            .font(.caption).foregroundStyle(.secondary).monospacedDigit()
                        ProgressView(value: Double(done), total: Double(c.assignments.count)).tint(.green)
                    }
                }
                if c.assignments.isEmpty {
                    Text(L("老师还没有布置作业。")).font(.footnote).foregroundStyle(.secondary)
                }
                ForEach(c.assignments) { a in
                    assignment(a)
                }
            }

            if c.leaderboard.count >= 2 { leaderboard }

            HStack(spacing: 8) {
                Text(L("班级码")).font(.caption).foregroundStyle(.secondary)
                Text(verbatim: c.code)
                    .font(.system(.footnote, design: .monospaced).weight(.bold))
                    .tracking(2)
                    .textSelection(.enabled)
                Spacer()
                Button(action: onLeave) {
                    Text(L("退出班级"))
                        .font(.footnote.weight(.semibold))
                        .padding(.horizontal, 12).padding(.vertical, 6)
                        .foregroundStyle(.red)
                        .background(DS.surfaceHi, in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .card()
    }

    private func assignment(_ a: ClassAssignment) -> some View {
        let late = !a.done && (a.due.map { $0 < Self.today } ?? false)
        return HStack(alignment: .center, spacing: 12) {
            Image(systemName: a.done ? "checkmark.circle.fill" : "circle")
                .font(.title3)
                .foregroundStyle(a.done ? Color.green : Color.secondary)
                .accessibilityLabel(a.done ? L("已完成") : L("未完成"))
            VStack(alignment: .leading, spacing: 3) {
                Text(a.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(a.done ? .secondary : .primary)
                    .fixedSize(horizontal: false, vertical: true)
                if !a.done, let d = a.detail, !d.isEmpty {
                    Text(d).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                }
                if let due = a.due {
                    Label(L("截止 %@", due), systemImage: "calendar")
                        .font(.caption2.weight(late ? .semibold : .regular))
                        .foregroundStyle(late ? Color.orange : Color.secondary)
                        .monospacedDigit()
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if a.done {
                Text(L("已完成")).font(.caption.weight(.semibold)).foregroundStyle(.green)
            } else {
                Button { onStart(a) } label: {
                    Text(L("去完成")).font(.footnote.weight(.semibold))
                        .padding(.horizontal, 14).padding(.vertical, 7)
                        .foregroundStyle(.white).background(DS.accent, in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(12)
        .background(DS.surfaceHi.opacity(a.done ? 0.45 : 0.9), in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
    }

    private var leaderboard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(L("班级排行")).font(.subheadline.weight(.semibold))
                Spacer()
                Text(L("美股收益")).font(.caption2).foregroundStyle(.secondary)
            }
            VStack(spacing: 0) {
                let rows = Array(c.leaderboard.enumerated())
                ForEach(rows, id: \.offset) { i, r in
                    HStack(spacing: 10) {
                        Text(verbatim: "\(i + 1)")
                            .font(.system(.subheadline, design: .rounded).weight(.semibold))
                            .monospacedDigit()
                            .foregroundStyle(.secondary)
                            .frame(width: 24)
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 6) {
                                Text(r.nickname)
                                    .font(.subheadline.weight(r.me ? .semibold : .regular))
                                    .lineLimit(1)
                                if r.me {
                                    Text("我")
                                        .font(.caption2.weight(.bold))
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 6).padding(.vertical, 2)
                                        .background(DS.accent, in: Capsule())
                                }
                            }
                            Text(verbatim: "\(L("作业")) \(r.done)/\(c.assignments.count) · \(L("学习任务")) \(r.missions)/\(missionCount)")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .monospacedDigit()
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        Text(TMFmt.pct(r.returnPct))
                            .font(.footnote.weight(.semibold))
                            .monospacedDigit()
                            .foregroundStyle(r.returnPct.map { $0 == 0 ? Color.secondary : TMFmt.color($0, .us) } ?? .secondary)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 9)
                    .background(r.me ? DS.accent.opacity(0.12) : Color.clear)
                    if i < rows.count - 1 { RowDivider() }
                }
            }
            .background(DS.surfaceHi.opacity(0.45))
            .clipShape(RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
        }
    }
}

// MARK: - Join with a code

private struct JoinClassCard: View {
    @ObservedObject var vm: ClassesViewModel
    @Binding var code: String
    let nickname: String?
    let joinedCodes: Set<String>
    let empty: Bool

    @State private var nick = ""
    private let haptic = UINotificationFeedbackGenerator()

    private var nickOK: Bool { nick.trimmingCharacters(in: .whitespaces).count >= 2 }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(L("加入班级"))
            VStack(alignment: .leading, spacing: 12) {
                if empty {
                    Text(L("你还没有加入班级。向老师要班级码，在下面输入即可。"))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Text(L("班级码")).font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                HStack(spacing: 10) {
                    TextField(L("例如 PR96RQ"), text: $code)
                        .font(.system(.title3, design: .monospaced).weight(.bold))
                        .tracking(code.isEmpty ? 0 : 3)      // not the placeholder
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                        .submitLabel(.search)
                        .onSubmit { find() }
                        .padding(.horizontal, 14).padding(.vertical, 10)
                        .background(DS.surfaceHi, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .onChange(of: code) { _, v in
                            let clean = String(v.uppercased().filter { $0.isASCII && ($0.isLetter || $0.isNumber) }.prefix(6))
                            if clean != v {
                                code = clean
                            } else if vm.found != nil && vm.found?.code != clean || vm.joinError != nil {
                                vm.found = nil
                                vm.joinError = nil
                            }
                        }
                    Button(action: find) {
                        Text(L("查找")).font(.subheadline.weight(.semibold))
                            .padding(.horizontal, 18).padding(.vertical, 11)
                            .foregroundStyle(code.count == 6 ? DS.accent : Color.secondary)
                            .background(DS.accent.opacity(code.count == 6 ? 0.14 : 0.06), in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .disabled(code.count != 6 || vm.busy)
                }

                if let info = vm.found { found(info) }

                if let err = vm.joinError {
                    Text(err).font(.footnote).foregroundStyle(.red).fixedSize(horizontal: false, vertical: true)
                }

                Text(L("App 和网页版的模拟账户是分开的。如果你在网页上加入过这个班级，请在 App 里再加入一次，App 里的进度才会算进去。"))
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .card()
        }
        .onAppear {
            if nick.isEmpty, let n = nickname, !n.hasPrefix("用户#") { nick = String(n.prefix(16)) }
        }
    }

    private func found(_ info: ClassInfo) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(info.name).font(.headline)
                Text([info.teacherName.flatMap { $0.isEmpty ? nil : L("老师：%@", $0) }, L("%lld 名学生", info.students)]
                        .compactMap { $0 }.joined(separator: " · "))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if joinedCodes.contains(info.code) {
                Label(L("已加入"), systemImage: "checkmark.circle.fill")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.green)
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    Text(L("你在班上的昵称")).font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                    TextField(L("老师能认出你的名字，2–16 个字"), text: $nick)
                        .autocorrectionDisabled()
                        .submitLabel(.join)
                        .onSubmit { if nickOK { join() } }
                        .padding(.horizontal, 14).padding(.vertical, 10)
                        .background(DS.surface, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .onChange(of: nick) { _, v in if v.count > 16 { nick = String(v.prefix(16)) } }
                }
                Text(L("加入后，老师可以看到你的昵称、学习任务完成情况、模拟交易次数和收益、历史穿越成绩。老师看不到你的邮箱，你可以随时退出。"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                Button(action: join) {
                    Group {
                        if vm.busy { ProgressView().tint(.white) } else { Text(L("加入")) }
                    }
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .foregroundStyle(.white)
                    .background(DS.accentGradient, in: Capsule())
                    .opacity(nickOK ? 1 : 0.45)
                }
                .buttonStyle(.plain)
                .disabled(vm.busy || !nickOK)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(DS.accent.opacity(0.07), in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous).strokeBorder(DS.accent.opacity(0.35)))
    }

    private func find() {
        guard code.count == 6 else { return }
        Task { await vm.find(code) }
    }

    private func join() {
        let n = nick.trimmingCharacters(in: .whitespaces)
        Task {
            if await vm.join(nickname: n) {
                haptic.notificationOccurred(.success)
                code = ""
            } else {
                haptic.notificationOccurred(.error)
            }
        }
    }
}
