import SwiftUI

struct LearningTabView: View {
    @StateObject private var vm = LearningViewModel()

    private let examLabels: [String: String] = [
        "alevel":   "A-Level",
        "igcse":    "IGCSE",
        "ap_macro": "AP Macro",
        "ap_micro": "AP Micro",
        "ib":       "IB",
        "stocks":   "股票入门",
    ]

    private let examOrder = ["alevel", "igcse", "ap_macro", "ap_micro", "ib", "stocks"]

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
                if let papers = curriculum.papers, !papers.isEmpty {
                    ForEach(papers) { paper in
                        VStack(alignment: .leading, spacing: 10) {
                            SectionHeader(paper.title) {
                                Text("\(paper.topics.count) 个主题")
                                    .font(.caption)
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

    private func topicCard(_ topics: [TopicSummary], exam: String) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(topics.enumerated()), id: \.element.id) { idx, topic in
                NavigationLink(destination: TopicDetailView(
                    exam: exam, topicID: topic.topicID, topicTitle: topic.title
                )) {
                    TopicRow(topic: topic)
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

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(topic.title)
                    .font(.subheadline.weight(.medium))
                    .multilineTextAlignment(.leading)
                if let sections = topic.sectionCount {
                    Text("\(sections) sections")
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
