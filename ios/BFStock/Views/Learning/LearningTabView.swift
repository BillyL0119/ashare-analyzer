import SwiftUI

struct LearningTabView: View {
    @StateObject private var vm = LearningViewModel()
    @ObservedObject private var progress = LearningProgressStore.shared

    private let examLabels: [String: String] = [
        "alevel":   "A-Level",
        "igcse":    "IGCSE",
        "ap_macro": "AP Macro",
        "ap_micro": "AP Micro",
        "ib":       "IB",
        "stocks":   L("股票入门"),
    ]

    private let examOrder = ["stocks", "alevel", "igcse", "ap_macro", "ap_micro", "ib"]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if !vm.curricula.isEmpty {
                    examPicker
                        .padding(.vertical, 10)
                }

                Group {
                    if vm.isLoading && vm.curricula.isEmpty {
                        ProgressView(String(localized: "loading"))
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if let err = vm.error, vm.curricula.isEmpty {
                        ErrorRetryView(message: err) { Task { await vm.load() } }
                    } else if let curriculum = vm.selected {
                        curriculumList(curriculum)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .background(DS.bg.ignoresSafeArea())
            .navigationTitle("tab.learning")
        }
        .task { await vm.load() }
    }

    // MARK: - Exam Picker

    private var examPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(examOrder, id: \.self) { key in
                    let label = examLabels[key] ?? key
                    let isSelected = vm.selectedKey == key
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            vm.selectedKey = key
                        }
                    } label: {
                        Text(label)
                            .font(.subheadline.weight(isSelected ? .semibold : .regular))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(isSelected ? DS.accent : DS.surfaceHi, in: Capsule())
                            .foregroundStyle(isSelected ? Color.white : Color.primary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
        }
        .sensoryFeedback(.selection, trigger: vm.selectedKey)
    }

    // MARK: - Topic List

    @ViewBuilder
    private func curriculumList(_ curriculum: Curriculum) -> some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 22) {
                DailyKnowledgeCard()
                progressCard(curriculum)
                if let papers = curriculum.papers, !papers.isEmpty {
                    ForEach(papers) { paper in
                        VStack(alignment: .leading, spacing: 10) {
                            SectionHeader(paper.title) {
                                Text("\(progress.count(exam: curriculum.key, topics: paper.topics))/\(paper.topics.count)")
                                    .font(.system(.caption, design: .rounded).weight(.semibold))
                                    .monospacedDigit()
                                    .foregroundStyle(.secondary)
                            }
                            topicCard(paper.topics, exam: curriculum.key)
                        }
                    }
                } else {
                    topicCard(curriculum.allTopics, exam: curriculum.key)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 4)
            .padding(.bottom, 24)
        }
    }

    private func progressCard(_ curriculum: Curriculum) -> some View {
        let all = curriculum.allTopics
        let done = progress.count(exam: curriculum.key, topics: all)
        let total = max(all.count, 1)
        let fraction = Double(done) / Double(total)
        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text("学习进度")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text("\(done)/\(all.count) 已学完")
                    .font(.system(.caption, design: .rounded).weight(.semibold))
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
                    .contentTransition(.numericText(value: Double(done)))
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(DS.surfaceHi)
                    Capsule().fill(DS.accentGradient)
                        .frame(width: max(geo.size.width * fraction, done > 0 ? 8 : 0))
                }
            }
            .frame(height: 8)
            .animation(.snappy(duration: 0.4), value: done)
        }
        .card()
    }

    private func topicCard(_ topics: [TopicSummary], exam: String) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(topics.enumerated()), id: \.element.id) { idx, topic in
                NavigationLink(destination: TopicDetailView(
                    exam: exam, topicID: topic.topicID, topicTitle: topic.title
                )) {
                    TopicRow(topic: topic, done: progress.isDone(exam, topic.topicID))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                if idx < topics.count - 1 { RowDivider() }
            }
        }
        .card(padding: 0)
    }
}

private struct TopicRow: View {
    let topic: TopicSummary
    var done = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: done ? "checkmark.circle.fill" : "circle")
                .font(.title3)
                .foregroundStyle(done ? Color(red: 0.18, green: 0.72, blue: 0.39) : Color.secondary.opacity(0.4))
            VStack(alignment: .leading, spacing: 4) {
                Text(topic.title)
                    .font(.subheadline.weight(.medium))
                    .multilineTextAlignment(.leading)
                if let sections = topic.sectionCount {
                    Text(L("%lld 个章节", sections))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 8)
            if let time = topic.estimatedTime {
                Text(time)
                    .font(.system(.caption2, design: .rounded).weight(.medium))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(DS.surfaceHi, in: Capsule())
                    .foregroundStyle(.secondary)
            }
            Image(systemName: "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.tertiary)
        }
    }
}
