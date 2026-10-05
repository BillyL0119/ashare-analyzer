import SwiftUI

struct TopicDetailView: View {
    let exam: String
    let topicID: String
    let topicTitle: String

    @StateObject private var vm = TopicViewModel()
    @ObservedObject private var progress = LearningProgressStore.shared

    var body: some View {
        Group {
            if let err = vm.error, vm.topic == nil {
                ErrorRetryView(message: err) {
                    Task { await vm.load(exam: exam, topicID: topicID) }
                }
            } else if let topic = vm.topic {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        header(topic)

                        ForEach(Array(topic.sections.enumerated()), id: \.element.id) { idx, section in
                            SectionCard(index: idx + 1, section: section as TopicSection)
                        }

                        completeButton

                        Text("disclaimer")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 24)
                }
            } else {
                ProgressView(String(localized: "loading"))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.load(exam: exam, topicID: topicID) }
    }

    private var completeButton: some View {
        let done = progress.isDone(exam, topicID)
        let green = Color(red: 0.18, green: 0.72, blue: 0.39)
        return Button {
            withAnimation(.snappy(duration: 0.3)) { progress.toggle(exam, topicID) }
        } label: {
            Label(done ? L("已学完") : L("标记为已学完"),
                  systemImage: done ? "checkmark.circle.fill" : "checkmark.circle")
                .font(.headline)
                .foregroundStyle(done ? green : Color.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background {
                    if done {
                        RoundedRectangle(cornerRadius: 18, style: .continuous).fill(green.opacity(0.14))
                    } else {
                        RoundedRectangle(cornerRadius: 18, style: .continuous).fill(DS.accentGradient)
                    }
                }
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.success, trigger: done)
    }

    private var examName: String {
        ["alevel": "A-Level", "igcse": "IGCSE", "ap_macro": "AP Macro",
         "ap_micro": "AP Micro", "ib": "IB", "stocks": L("股票入门")][exam] ?? exam.uppercased()
    }

    private func header(_ topic: TopicDetail) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(topic.title)
                .font(.title.weight(.bold))
                .fixedSize(horizontal: false, vertical: true)
            chips(topic)
        }
        .padding(.top, 4)
    }

    private func chips(_ topic: TopicDetail) -> some View {
        HStack(spacing: 8) {
            chip(examName, icon: "graduationcap.fill", tint: DS.accent)
            chip(L("%lld 个章节", topic.sections.count), icon: "list.bullet", tint: .secondary)
            if let time = topic.estimatedTime {
                chip(time, icon: "clock", tint: .secondary)
            }
            Spacer(minLength: 0)
        }
    }

    private func chip(_ text: String, icon: String, tint: Color) -> some View {
        Label(text, systemImage: icon)
            .font(.system(.caption, design: .rounded).weight(.semibold))
            .foregroundStyle(tint)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(tint.opacity(0.14), in: Capsule())
    }
}

private struct SectionCard: View {
    let index: Int
    let section: TopicSection
    @State private var expanded = true

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Button {
                withAnimation(.snappy(duration: 0.25)) { expanded.toggle() }
            } label: {
                HStack(spacing: 12) {
                    Text("\(index)")
                        .font(.system(.footnote, design: .rounded).weight(.bold))
                        .foregroundStyle(DS.accent)
                        .frame(width: 28, height: 28)
                        .background(DS.accent.opacity(0.14), in: Circle())
                    Text(section.heading)
                        .font(.headline)
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)
                    Spacer(minLength: 8)
                    Image(systemName: "chevron.down")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .rotationEffect(.degrees(expanded ? 0 : -90))
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if expanded {
                Text(section.body)
                    .font(.body)
                    .lineSpacing(5)
                    .foregroundStyle(.primary.opacity(0.92))
                    .fixedSize(horizontal: false, vertical: true)

                if let terms = section.keyTerms, !terms.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("关键术语")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        FlowLayout(spacing: 6) {
                            ForEach(terms, id: \.self) { term in
                                Text(term)
                                    .font(.caption.weight(.medium))
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 5)
                                    .background(DS.accent.opacity(0.14), in: Capsule())
                                    .foregroundStyle(DS.accent)
                            }
                        }
                    }
                }

                if let rw = section.realWorld {
                    callout(icon: "globe", title: L("真实案例"), text: rw, tint: DS.accent)
                }

                if let tip = section.examTip {
                    callout(icon: "lightbulb.fill", title: L("考试技巧"), text: tip, tint: .orange)
                }
            }
        }
        .card()
    }

    private func callout(icon: String, title: String, text: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(title, systemImage: icon)
                .font(.caption.weight(.bold))
                .foregroundStyle(tint)
            Text(text)
                .font(.callout)
                .lineSpacing(3)
                .foregroundStyle(.primary.opacity(0.88))
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.10), in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
    }
}

private struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        arrange(width: proposal.width ?? .infinity, subviews: subviews).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(width: bounds.width, subviews: subviews)
        for (i, origin) in result.origins.enumerated() {
            subviews[i].place(at: CGPoint(x: bounds.minX + origin.x, y: bounds.minY + origin.y),
                              proposal: .unspecified)
        }
    }

    private func arrange(width: CGFloat, subviews: Subviews) -> (size: CGSize, origins: [CGPoint]) {
        var origins: [CGPoint] = []
        var x: CGFloat = 0, y: CGFloat = 0, rowH: CGFloat = 0, maxW: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x > 0 && x + s.width > width { x = 0; y += rowH + spacing; rowH = 0 }
            origins.append(CGPoint(x: x, y: y))
            x += s.width + spacing
            rowH = max(rowH, s.height)
            maxW = max(maxW, x - spacing)
        }
        return (CGSize(width: maxW, height: y + rowH), origins)
    }
}
