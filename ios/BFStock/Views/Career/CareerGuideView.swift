import SwiftUI

/// Finance career guide: eight roles with day-to-day, skills, entry bar, path and pay, plus a mock interview.
struct CareerGuideView: View {
    @StateObject private var vm = CareerViewModel()

    var body: some View {
        Group {
            if vm.roles.isEmpty {
                if let err = vm.error {
                    VStack { ErrorRetryView(message: err) { Task { await vm.load() } }.padding(); Spacer() }
                } else {
                    ScrollView { SkeletonRows(rows: 5, trailingPill: false).card(padding: 0).padding(.horizontal, 16) }
                }
            } else {
                ScrollView {
                    VStack(spacing: 10) {
                        ForEach(vm.roles) { role in
                            NavigationLink(destination: CareerRoleDetailView(role: role)) { RoleCard(role: role) }
                                .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 24)
                }
            }
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle(L("求职指南"))
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.load() }
    }
}

private struct RoleCard: View {
    let role: CareerRole

    var body: some View {
        HStack(spacing: 14) {
            Text(role.icon).font(.system(size: 26))
                .frame(width: 52, height: 52)
                .background(role.tint.opacity(0.14), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            VStack(alignment: .leading, spacing: 4) {
                Text(role.displayTitle).font(.subheadline.weight(.semibold)).multilineTextAlignment(.leading)
                Text(role.displayTagline).font(.caption).foregroundStyle(.secondary)
                    .multilineTextAlignment(.leading).lineLimit(2)
            }
            Spacer(minLength: 4)
            Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(.tertiary)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DS.surface, in: RoundedRectangle(cornerRadius: DS.tileRadius + 2, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: DS.tileRadius + 2, style: .continuous).strokeBorder(DS.stroke))
    }
}

struct CareerRoleDetailView: View {
    let role: CareerRole

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack(spacing: 14) {
                    Text(role.icon).font(.system(size: 32))
                        .frame(width: 60, height: 60)
                        .background(role.tint.opacity(0.14), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    VStack(alignment: .leading, spacing: 4) {
                        Text(role.displayTitle).font(.title3.weight(.bold))
                        Text(role.displayTagline).font(.footnote).foregroundStyle(.secondary)
                    }
                }

                NavigationLink(destination: MockInterviewView(role: role)) {
                    Label(L("模拟面试"), systemImage: "person.wave.2.fill")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                        .background(role.tint, in: RoundedRectangle(cornerRadius: DS.tileRadius, style: .continuous))
                        .foregroundStyle(.white)
                }

                Text(role.displayDescription).font(.subheadline).foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)

                section(L("典型场景")) { Text(Self.stripLead(role.displayScenario)).font(.footnote).fixedSize(horizontal: false, vertical: true) }
                if !role.displayTypicalDay.isEmpty { section(L("典型的一天")) { timeline(role.displayTypicalDay) } }
                section(L("核心技能")) { bullets(role.displaySkills) }
                section(L("与相近岗位的区别")) { bullets(role.displayDifferentiators) }
                section(L("证书建议")) { bullets(role.displayCerts) }
                section(L("入门门槛")) { Text(role.displayEntry).font(.footnote).fixedSize(horizontal: false, vertical: true) }
                section(L("职业路径")) { Text(role.displayCareer).font(.footnote).fixedSize(horizontal: false, vertical: true) }
                section(L("薪资参考")) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(role.displaySalary).font(.footnote).fixedSize(horizontal: false, vertical: true)
                        Text(role.displayDisclaimer).font(.caption2).foregroundStyle(.secondary)
                    }
                }
            }
            .padding(16)
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
    }

    /// Scenario texts start with their own label ("典型场景：" / "Typical scenario:"), which the section title already shows.
    private static func stripLead(_ text: String) -> String {
        for lead in ["典型场景：", "典型场景:", "Typical scenario:", "Typical scenario："] where text.hasPrefix(lead) {
            return String(text.dropFirst(lead.count)).trimmingCharacters(in: .whitespaces)
        }
        return text
    }

    private func section<Content: View>(_ title: String, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.footnote.weight(.semibold)).foregroundStyle(.secondary)
            content().frame(maxWidth: .infinity, alignment: .leading)
                .padding(14).card(padding: 0)
        }
    }

    private func bullets(_ items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(items.enumerated()), id: \.offset) { _, t in
                HStack(alignment: .top, spacing: 8) {
                    Circle().fill(role.tint).frame(width: 5, height: 5).padding(.top, 6)
                    Text(t).font(.footnote).fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    /// "9:00 — Morning meeting …" lines: time on the left, text on the right.
    private func timeline(_ items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(Array(items.enumerated()), id: \.offset) { _, line in
                let parts = line.components(separatedBy: " — ")
                HStack(alignment: .top, spacing: 10) {
                    Text(parts.count > 1 ? parts[0] : "").font(.caption.weight(.bold)).monospacedDigit()
                        .lineLimit(1).minimumScaleFactor(0.8)
                        .foregroundStyle(role.tint).frame(width: 84, alignment: .leading)
                    Text(parts.count > 1 ? parts.dropFirst().joined(separator: " — ") : line)
                        .font(.footnote).fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
}
