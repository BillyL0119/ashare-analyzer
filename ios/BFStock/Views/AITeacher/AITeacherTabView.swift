import SwiftUI

struct AITeacherTabView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                Spacer()
                Image(systemName: "bubble.left.and.bubble.right.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(.secondary)
                Text("tab.ai_teacher")
                    .font(.title2.weight(.semibold))
                Text("Coming in Step 7")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                Spacer()
            }
            .navigationTitle("tab.ai_teacher")
        }
    }
}

#Preview {
    AITeacherTabView()
}
