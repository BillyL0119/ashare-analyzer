import SwiftUI

struct TopicDetailView: View {
    let exam: String
    let topicID: String
    let topicTitle: String

    @StateObject private var vm = TopicViewModel()

    var body: some View {
        Group {
            if vm.isLoading && vm.topic == nil {
                ProgressView(String(localized: "loading"))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let err = vm.error, vm.topic == nil {
                ErrorRetryView(message: err) {
                    Task { await vm.load(exam: exam, topicID: topicID) }
                }
            } else if let topic = vm.topic {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        if let time = topic.estimatedTime {
                            HStack {
                                Image(systemName: "clock")
                                Text(time)
                            }
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal)
                        }

                        ForEach(topic.sections) { section in
                            SectionCard(section: section as TopicSection)
                                .padding(.horizontal)
                        }

                        Text("disclaimer")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                            .frame(maxWidth: .infinity)
                            .padding()
                    }
                    .padding(.vertical)
                }
            }
        }
        .navigationTitle(topicTitle)
        .navigationBarTitleDisplayMode(.large)
        .task { await vm.load(exam: exam, topicID: topicID) }
    }
}

private struct SectionCard: View {
    let section: TopicSection
    @State private var expanded = true

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { expanded.toggle() }
            } label: {
                HStack {
                    Text(section.heading)
                        .font(.headline)
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)
                    Spacer()
                    Image(systemName: expanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if expanded {
                Text(section.body)
                    .font(.body)
                    .foregroundStyle(.primary)
                    .fixedSize(horizontal: false, vertical: true)

                if let terms = section.keyTerms, !terms.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("关键术语")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        FlowLayout(items: terms) { term in
                            Text(term)
                                .font(.caption)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.accentColor.opacity(0.12))
                                .foregroundStyle(Color.accentColor)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                    }
                }

                if let rw = section.realWorld {
                    VStack(alignment: .leading, spacing: 4) {
                        Label("真实案例", systemImage: "globe")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        Text(rw)
                            .font(.callout)
                            .foregroundStyle(.secondary)
                            .padding(10)
                            .background(Color.secondary.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }

                if let tip = section.examTip {
                    VStack(alignment: .leading, spacing: 4) {
                        Label("考试技巧", systemImage: "lightbulb.fill")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.orange)
                        Text(tip)
                            .font(.callout)
                            .foregroundStyle(.primary)
                            .padding(10)
                            .background(Color.orange.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }
        }
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}

// Simple flow layout for key term chips
private struct FlowLayout<Item: Hashable, Content: View>: View {
    let items: [Item]
    let content: (Item) -> Content

    var body: some View {
        var width: CGFloat = 0
        var height: CGFloat = 0
        return GeometryReader { geo in
            ZStack(alignment: .topLeading) {
                ForEach(items, id: \.self) { item in
                    content(item)
                        .padding(.trailing, 4)
                        .padding(.bottom, 4)
                        .alignmentGuide(.leading) { d in
                            if abs(width - d.width) > geo.size.width {
                                width = 0; height -= d.height
                            }
                            let result = width
                            if item == items.last { width = 0 } else { width -= d.width }
                            return result
                        }
                        .alignmentGuide(.top) { _ in
                            let result = height
                            if item == items.last { height = 0 }
                            return result
                        }
                }
            }
        }
        .frame(height: estimatedHeight(items: items))
    }

    private func estimatedHeight(items: [Item]) -> CGFloat {
        CGFloat(((items.count - 1) / 3 + 1) * 28)
    }
}
