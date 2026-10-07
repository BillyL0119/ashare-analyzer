import SwiftUI

/// "Today's concept" card shown on top of the learning list.
struct DailyKnowledgeCard: View {
    @StateObject private var vm = DailyKnowledgeViewModel()

    var body: some View {
        // The zero-height anchor keeps `.task` alive while there is nothing to show yet.
        VStack(spacing: 0) {
            Color.clear.frame(height: 0).task { await vm.load() }
            if let k = vm.knowledge {
                let e = k.finance
                let zh = Lang.code == "zh"
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 6) {
                        Image(systemName: "lightbulb.fill").foregroundStyle(.orange).font(.caption)
                        Text("今日知识").font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                        Spacer()
                        if let c = e.category, zh { Text(c).font(.caption2).foregroundStyle(.tertiary) }
                    }
                    Text(zh ? e.topicZh : e.topicEn).font(.headline)
                    Text(zh ? e.contentZh : e.contentEn)
                        .font(.footnote).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                    if let f = e.keyFormula, !f.isEmpty {
                        Text(f).font(.system(.caption, design: .monospaced))
                            .padding(8).frame(maxWidth: .infinity, alignment: .leading)
                            .background(DS.surfaceHi, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                }
                .card(padding: 16)
            }
        }
    }
}
