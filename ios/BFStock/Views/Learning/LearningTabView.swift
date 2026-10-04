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
                        .padding(.vertical, 8)
                        .background(.bar)
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
                            .padding(.horizontal, 14)
                            .padding(.vertical, 6)
                            .background(isSelected ? Color.accentColor : Color.secondary.opacity(0.12))
                            .foregroundStyle(isSelected ? .white : .primary)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
        }
    }

    // MARK: - Topic List

    @ViewBuilder
    private func curriculumList(_ curriculum: Curriculum) -> some View {
        if let papers = curriculum.papers, !papers.isEmpty {
            List {
                ForEach(papers) { paper in
                    Section(header: Text(paper.title).font(.subheadline.weight(.semibold))) {
                        ForEach(paper.topics) { topic in
                            NavigationLink(destination: TopicDetailView(
                                exam: curriculum.key,
                                topicID: topic.topicID,
                                topicTitle: topic.title
                            )) {
                                TopicRow(topic: topic)
                            }
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
        } else {
            List(curriculum.allTopics) { topic in
                NavigationLink(destination: TopicDetailView(
                    exam: curriculum.key,
                    topicID: topic.topicID,
                    topicTitle: topic.title
                )) {
                    TopicRow(topic: topic)
                }
            }
            .listStyle(.insetGrouped)
        }
    }
}

private struct TopicRow: View {
    let topic: TopicSummary

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(topic.title)
                    .font(.subheadline)
                if let sections = topic.sectionCount {
                    Text("\(sections) sections")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
            Spacer()
            if let time = topic.estimatedTime {
                Text(time)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }
}
