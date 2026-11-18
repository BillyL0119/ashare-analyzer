import SwiftUI

// The website's events calendar (/macro): a week strip with counts per type, a type picker and the selected
// day's list. Words come from the text bundle's `events` section; dates are plain YYYY-MM-DD strings and
// "today" is New York's date (the market's calendar).

// MARK: - Dates

private enum EventsCal {
    static let types: [String] = ["economic", "earnings", "ipos", "splits", "dividends"]

    private static var utc: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC") ?? .current
        return c
    }

    static func todayET() -> String {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/New_York") ?? .current
        let p = c.dateComponents([.year, .month, .day], from: Date())
        return String(format: "%04d-%02d-%02d", p.year ?? 1970, p.month ?? 1, p.day ?? 1)
    }

    static func iso(_ d: Date) -> String {
        let p = utc.dateComponents([.year, .month, .day], from: d)
        return String(format: "%04d-%02d-%02d", p.year ?? 1970, p.month ?? 1, p.day ?? 1)
    }

    static func addDays(_ iso: String, _ n: Int) -> String {
        guard let d = QuoteFormat.parseDay(iso), let r = utc.date(byAdding: .day, value: n, to: d) else { return iso }
        return Self.iso(r)
    }

    static func sundayOf(_ iso: String) -> String {
        guard let d = QuoteFormat.parseDay(iso) else { return iso }
        let wd = utc.component(.weekday, from: d)   // 1 = Sunday
        return addDays(iso, -(wd - 1))
    }

    /// A day in the app's language by template ("EEEMMMd"), always as written (no time zone shift)
    static func text(_ iso: String, _ template: String) -> String {
        guard let d = QuoteFormat.parseDay(iso) else { return QuoteFormat.dash }
        let f = DateFormatter()
        f.locale = Lang.locale
        f.timeZone = TimeZone(identifier: "UTC")
        f.setLocalizedDateFormatFromTemplate(template)
        return f.string(from: d)
    }

    static let clockParser: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    static func clock(_ s: String?) -> String {
        guard let s, let d = clockParser.date(from: s) else { return QuoteFormat.dash }
        return d.formatted(.dateTime.hour().minute().locale(Lang.locale))
    }
}

// MARK: - Data

@MainActor
private final class EventsCalendarModel: ObservableObject {
    @Published var weeks: [String: EventsWeek] = [:]
    @Published var days: [String: EventsDay] = [:]
    @Published var failed: Set<String> = []

    static func key(_ date: String, _ type: String) -> String { "\(type)|\(date)" }

    func loadWeek(_ start: String, force: Bool = false) async {
        if !force, weeks[start] != nil { return }
        let r: EventsWeek? = try? await APIClient.shared.get("/events/week", params: ["start": start])
        if let r { weeks[start] = r }
    }

    func loadDay(_ date: String, _ type: String, force: Bool = false) async {
        let key = Self.key(date, type)
        if !force, days[key] != nil { return }
        failed.remove(key)
        var params: [String: String] = ["date": date, "type": type, "lang": Lang.code]
        if force { params["r"] = String(Int(Date().timeIntervalSince1970)) }
        do {
            let d: EventsDay = try await APIClient.shared.get("/events/day", params: params)
            if d.error == true { failed.insert(key) } else { days[key] = d }
        } catch {
            if !Task.isCancelled { failed.insert(key) }
        }
    }
}

// MARK: - Screen

struct EventsCalendarView: View {
    @ObservedObject private var text = QuoteText.shared
    @StateObject private var model = EventsCalendarModel()

    @State private var today: String = EventsCal.todayET()
    @State private var date: String = EventsCal.todayET()
    @State private var type: String = "economic"
    @State private var country: String = "us"     // "us" | "all"
    @State private var minImp: Int = 2
    @State private var openRow: String?
    @State private var showAll = false
    @State private var stripDay: String?          // the day the week strip keeps in view (only that ScrollView moves)

    private let earningsLimit = 50

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                weekCard
                dayCard
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(DS.bg.ignoresSafeArea())
        .navigationTitle(text.s("tabs", "tabMacro"))
        .navigationBarTitleDisplayMode(.inline)
        .task(id: Lang.code) { await QuoteText.shared.ensure(Lang.code) }
        .task(id: EventsCal.sundayOf(date)) { await model.loadWeek(EventsCal.sundayOf(date)) }
        .task(id: EventsCalendarModel.key(date, type)) { await model.loadDay(date, type) }
        .refreshable {
            await model.loadWeek(EventsCal.sundayOf(date), force: true)
            await model.loadDay(date, type, force: true)
        }
        .onChange(of: date) { _, _ in resetRows() }
        .onChange(of: type) { _, _ in resetRows() }
    }

    private func resetRows() {
        openRow = nil
        showAll = false
    }

    private func t(_ path: String...) -> String {
        switch path.count {
        case 1: return text.s("events", path[0])
        case 2: return text.s("events", path[0], path[1])
        default: return ""
        }
    }

    // MARK: Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(t("title")).font(.title2.weight(.semibold))
            Text(t("sub")).font(.subheadline).foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    // MARK: Week strip

    private var weekStart: String { EventsCal.sundayOf(date) }

    private var weekCard: some View {
        let start = weekStart
        let end = EventsCal.addDays(start, 6)
        let range = EventsCal.text(start, "MMMd") + " – " + EventsCal.text(end, "yMMMd")
        return VStack(alignment: .leading, spacing: 12) {
            Text(range).font(.subheadline.weight(.semibold)).monospacedDigit()
            weekNav(start: start)
            weekStrip(start: start)
        }
        .card(padding: 14)
        .accessibilityElement(children: .contain)
    }

    private func weekNav(start: String) -> some View {
        HStack(spacing: 8) {
            navButton(t("prevWeek")) { date = EventsCal.addDays(date, -7) }
            navButton(t("nextWeek")) { date = EventsCal.addDays(date, 7) }
            if EventsCal.sundayOf(today) != start {
                navButton(t("thisWeek")) { date = today }
            }
            Spacer(minLength: 0)
        }
    }

    private func navButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.footnote.weight(.medium))
                .foregroundStyle(DS.accent)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(DS.surfaceHi, in: Capsule())
        }
        .buttonStyle(.plain)
    }

    private func weekStrip(start: String) -> some View {
        let days: [String] = (0..<7).map { EventsCal.addDays(start, $0) }
        var counts: [String: EventsWeek.Counts] = [:]
        for wd in model.weeks[start]?.days ?? [] { counts[wd.date] = wd.counts }
        // A ruled strip like the website's (no row of boxed tiles). scrollPosition moves only this horizontal
        // ScrollView; ScrollViewReader.scrollTo also scrolled the page and hid the title under the bar.
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 0) {
                ForEach(days, id: \.self) { d in
                    dayColumn(d, counts: counts[d], first: d == days.first).id(d)
                }
            }
            .scrollTargetLayout()
        }
        .scrollPosition(id: $stripDay, anchor: .center)
        .overlay(alignment: .top) { Rectangle().fill(DS.stroke).frame(height: 1) }
        .overlay(alignment: .bottom) { Rectangle().fill(DS.stroke).frame(height: 1) }
        .onAppear { stripDay = date }
        .onChange(of: date) { _, new in
            withAnimation(.snappy(duration: 0.25)) { stripDay = new }
        }
    }

    private func countValue(_ c: EventsWeek.Counts?, _ k: String) -> Int? {
        guard let c else { return nil }
        switch k {
        case "economic": return c.economic
        case "earnings": return c.earnings
        case "ipos": return c.ipos
        case "splits": return c.splits
        default: return c.dividends
        }
    }

    private func dayColumn(_ d: String, counts: EventsWeek.Counts?, first: Bool) -> some View {
        let selected = d == date
        return Button {
            date = d
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 4) {
                    Text(EventsCal.text(d, "EEE")).font(.footnote.weight(.semibold))
                    if d == today {
                        Text(t("today"))
                            .font(.caption2.weight(.medium))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 5).padding(.vertical, 1)
                            .background(DS.accentFill, in: Capsule())
                    }
                }
                Text(EventsCal.text(d, "MMMd")).font(.caption).foregroundStyle(.secondary)
                Rectangle().fill(DS.stroke).frame(height: 1).padding(.vertical, 2)
                ForEach(EventsCal.types, id: \.self) { k in
                    HStack(spacing: 4) {
                        Text(t("types", k)).font(.caption2).lineLimit(1).minimumScaleFactor(0.7)
                        Spacer(minLength: 2)
                        Text(countValue(counts, k).map { String($0) } ?? QuoteFormat.dash)
                            .font(.caption2.weight(k == type ? .semibold : .regular))
                            .monospacedDigit()
                    }
                    .foregroundStyle(k == type ? Color.primary : Color.secondary)
                }
            }
            .padding(10)
            .frame(width: 104, alignment: .leading)
            .background(selected ? DS.surfaceHi : Color.clear)
            .overlay(alignment: .bottom) {
                Rectangle().fill(selected ? DS.accent : Color.clear).frame(height: 2)
            }
            .overlay(alignment: .leading) {
                Rectangle().fill(first ? Color.clear : DS.stroke).frame(width: 1)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    // MARK: Day card

    /// Event types as chips that scroll sideways: five segments truncated "Economic" on a phone
    private var typeChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(EventsCal.types, id: \.self) { k in
                    let on = k == type
                    Button {
                        withAnimation(.snappy(duration: 0.2)) { type = k }
                    } label: {
                        Text(t("types", k))
                            .font(.subheadline.weight(on ? .semibold : .regular))
                            .foregroundStyle(on ? Color.primary : Color.secondary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(on ? DS.raised : DS.surfaceHi, in: Capsule())
                            .overlay(Capsule().strokeBorder(on ? DS.stroke : Color.clear))
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(on ? .isSelected : [])
                }
            }
        }
    }

    private var dayLabel: String { EventsCal.text(date, "EEEEMMMd") }

    private var dayCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            typeChips

            Text(dayLabel).font(.headline)
            Text(t("hint", type)).font(.footnote).foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            if type == "economic" { filters }
            dayBody
            Text(type == "economic" ? t("sourceEcon") : t("sourceNote"))
                .font(.caption).foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .card(padding: 14)
    }

    @ViewBuilder
    private var dayBody: some View {
        let key = EventsCalendarModel.key(date, type)
        if model.failed.contains(key) {
            VStack(spacing: 10) {
                Text(t("failedDay")).font(.subheadline).foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                Button {
                    Task { await model.loadDay(date, type, force: true) }
                } label: {
                    Text(t("retry")).font(.subheadline.weight(.medium)).foregroundStyle(DS.accent)
                        .padding(.horizontal, 14).padding(.vertical, 7)
                        .background(DS.surfaceHi, in: Capsule())
                }
                .buttonStyle(.plain)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
        } else if let day = model.days[key] {
            dayList(day)
        } else {
            SkeletonRows(rows: 5, trailingPill: false)
        }
    }

    private func emptyView(_ ty: String) -> some View {
        VStack(spacing: 6) {
            Text(fill(t("empty", ty), args: [dayLabel]))
            if ty == "splits" { Text(t("splitsNote")) }
        }
        .font(.subheadline)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
    }

    // MARK: Economic filters

    private var filters: some View {
        VStack(alignment: .leading, spacing: 8) {
            filterRow(t("countryLabel")) {
                Picker(t("countryLabel"), selection: $country) {
                    Text(t("countries", "us")).tag("us")
                    Text(t("imp", "1")).tag("all")
                }
                .pickerStyle(.segmented)
            }
            filterRow(t("impLabel")) {
                Picker(t("impLabel"), selection: $minImp) {
                    Text(t("imp", "3")).tag(3)
                    Text(t("imp", "2")).tag(2)
                    Text(t("imp", "1")).tag(1)
                }
                .pickerStyle(.segmented)
            }
        }
    }

    private func filterRow<C: View>(_ label: String, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            content()
        }
    }

    // MARK: Lists

    @ViewBuilder
    private func dayList(_ day: EventsDay) -> some View {
        switch type {
        case "economic": economicList(day.rows)
        case "earnings": limitedList(day.rows) { earningsRow($0) }
        case "ipos": plainList(day) { iposRow($0) }
        case "splits": splitsList(day)
        default: plainList(day) { dividendRow($0) }
        }
    }

    private func plainList<R: View>(_ day: EventsDay, @ViewBuilder row: @escaping (CalendarEventRow) -> R) -> some View {
        Group {
            if day.rows.isEmpty {
                emptyView(type)
            } else {
                limitedList(day.rows, row: row)
            }
        }
    }

    private func splitsList(_ day: EventsDay) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if day.rows.isEmpty {
                emptyView("splits")
            } else {
                limitedList(day.rows) { splitRow($0) }
                if let n = day.note, !n.isEmpty {
                    Text(n).font(.caption).foregroundStyle(.secondary)
                } else {
                    Text(t("splitsNote")).font(.caption).foregroundStyle(.secondary)
                }
            }
        }
    }

    /// Ruled rows in an inner card; only the first 50 until "Show all"
    private func limitedList<R: View>(_ rows: [CalendarEventRow], @ViewBuilder row: @escaping (CalendarEventRow) -> R) -> some View {
        let shown: [CalendarEventRow] = showAll ? rows : Array(rows.prefix(earningsLimit))
        return VStack(spacing: 0) {
            if rows.isEmpty {
                emptyView(type)
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(Array(shown.enumerated()), id: \.offset) { i, r in
                        row(r)
                        if i < shown.count - 1 { Rectangle().fill(DS.stroke).frame(height: 1) }
                    }
                }
                if !showAll && rows.count > earningsLimit {
                    Rectangle().fill(DS.stroke).frame(height: 1)
                    Button {
                        showAll = true
                    } label: {
                        Text(fill(t("showAll"), args: [String(rows.count)]))
                            .font(.subheadline.weight(.medium)).foregroundStyle(DS.accent)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: Economic

    private func economicList(_ rows: [CalendarEventRow]) -> some View {
        let shown: [CalendarEventRow] = rows.filter { (r: CalendarEventRow) -> Bool in
            let okCountry = country == "all" || r.country == "United States"
            return okCountry && (r.importance ?? 0) >= minImp
        }
        return VStack(alignment: .leading, spacing: 8) {
            if shown.isEmpty {
                emptyView("economic")
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(Array(shown.enumerated()), id: \.offset) { i, r in
                        economicRow(r, id: "\(i)|\(r.id)")
                        if i < shown.count - 1 { Rectangle().fill(DS.stroke).frame(height: 1) }
                    }
                }
            }
            Text(t("localTimes")).font(.caption).foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func dots(_ n: Int) -> some View {
        HStack(spacing: 3) {
            ForEach(1..<4, id: \.self) { i in
                Circle().fill(i <= n ? DS.accent : DS.stroke).frame(width: 6, height: 6)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(t("impLabel")) \(n)/3")
    }

    private func economicRow(_ r: CalendarEventRow, id: String) -> some View {
        let imp = r.importance ?? 0
        let isOpen = openRow == id
        let hasWhy = !(r.explain ?? "").isEmpty
        return Button {
            guard hasWhy else { return }
            withAnimation(.snappy(duration: 0.25)) { openRow = isOpen ? nil : id }
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text(EventsCal.clock(r.timeUtc)).font(.caption).foregroundStyle(.secondary)
                        .monospacedDigit().frame(width: 52, alignment: .leading)
                    VStack(alignment: .leading, spacing: 4) {
                        dots(imp)
                        HStack(spacing: 6) {
                            Text(MacroEventsSection.displayName(r.name ?? ""))
                                .font(.subheadline.weight(imp >= 3 ? .semibold : .regular))
                                .multilineTextAlignment(.leading)
                            if let p = r.period, p == "mom" || p == "yoy" {
                                Text(t(p)).font(.caption2).foregroundStyle(.secondary)
                            }
                            if country == "all", let c = r.country, c != "United States" {
                                Text(c).font(.caption2).foregroundStyle(.secondary)
                            }
                        }
                    }
                    Spacer(minLength: 4)
                    if hasWhy {
                        Image(systemName: isOpen ? "chevron.up" : "chevron.down")
                            .font(.caption2.weight(.semibold)).foregroundStyle(.tertiary)
                    }
                }
                HStack(alignment: .top, spacing: 8) {
                    actualFact(r)
                    fact(t("col", "forecast"), dashIfEmpty(r.consensus))
                    fact(t("col", "previous"), dashIfEmpty(r.previous))
                }
                .padding(.leading, 62)
                if isOpen, let ex = r.explain, !ex.isEmpty {
                    Text(ex).font(.footnote).foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.leading, 62)
                }
            }
            .padding(.vertical, 10)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func dashIfEmpty(_ s: String?) -> String {
        guard let s, !s.isEmpty else { return QuoteFormat.dash }
        return s
    }

    private func actualFact(_ r: CalendarEventRow) -> some View {
        let flag: String = r.surprise == "above" ? "▲" : (r.surprise == "below" ? "▼" : "")
        let color: Color = r.surprise == "above" ? DS.good : (r.surprise == "below" ? DS.bad : Color.primary)
        let spoken: String = r.surprise == "above" ? t("above") : (r.surprise == "below" ? t("below") : "")
        return VStack(alignment: .leading, spacing: 1) {
            Text(t("col", "actual")).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
            HStack(spacing: 3) {
                Text(dashIfEmpty(r.actual)).font(.footnote.weight(r.released == true ? .semibold : .regular))
                    .monospacedDigit()
                if !flag.isEmpty { Text(flag).font(.caption2) }
            }
            .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(t("col", "actual")) \(dashIfEmpty(r.actual)) \(spoken)")
    }

    // MARK: Row pieces

    private func fact(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(label).font(.caption2).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.8)
            Text(value).font(.footnote).monospacedDigit().lineLimit(1).minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func titleLine(symbol: String?, name: String?, link: Bool, trailing: String?) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            if let s = symbol, !s.isEmpty {
                Text(s).font(.subheadline.weight(.semibold)).foregroundStyle(link ? DS.accent : Color.primary)
            }
            Text(name ?? "").font(.footnote).foregroundStyle(.secondary).lineLimit(1)
            Spacer(minLength: 4)
            if let tr = trailing {
                Text(tr).font(.subheadline.weight(.semibold)).monospacedDigit()
            }
        }
    }

    private func epsText(_ v: Double?) -> String {
        guard let v, v.isFinite else { return QuoteFormat.dash }
        return (v < 0 ? "−" : "") + QuoteFormat.dollars(abs(v))
    }

    /// $0.0655 keeps its fourth decimal, $0.5 reads $0.50
    private func perShare(_ v: Double?) -> String {
        guard let v, v.isFinite else { return QuoteFormat.dash }
        return "$" + v.formatted(.number.precision(.fractionLength(2...4)).locale(Lang.locale))
    }

    // MARK: Earnings

    @ViewBuilder
    private func earningsRow(_ r: CalendarEventRow) -> some View {
        if let sym = r.symbol, !sym.isEmpty {
            NavigationLink {
                StockDetailView(code: sym, name: r.name ?? sym, market: .us)
            } label: {
                earningsContent(r).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(fill(t("openStock"), args: [sym]))
        } else {
            earningsContent(r)
        }
    }

    private func earningsContent(_ r: CalendarEventRow) -> some View {
        let timing = t("timing", r.timing ?? "none")
        let est: String = r.estimates.map { QuoteFormat.int(Double($0)) } ?? QuoteFormat.dash
        return VStack(alignment: .leading, spacing: 6) {
            titleLine(symbol: r.symbol, name: r.name, link: true, trailing: r.marketCap.map { QuoteFormat.money($0) })
            HStack(alignment: .top, spacing: 8) {
                fact(t("col", "reports"), timing)
                fact(t("col", "epsForecast"), epsText(r.epsEstimate))
                fact(t("col", "estimates"), est)
                fact(t("col", "lastEps"), epsText(r.lastYearEps))
            }
        }
        .padding(.vertical, 10)
    }

    // MARK: IPOs

    @ViewBuilder
    private func iposRow(_ r: CalendarEventRow) -> some View {
        if let sym = r.symbol, !sym.isEmpty, r.status == "priced" {
            NavigationLink {
                StockDetailView(code: sym, name: r.company ?? sym, market: .us)
            } label: {
                iposContent(r, link: true).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(fill(t("openStock"), args: [sym]))
        } else {
            iposContent(r, link: false)
        }
    }

    private func iposPrice(_ r: CalendarEventRow) -> String {
        if let p = r.price, p.isFinite { return QuoteFormat.dollars(p) }
        if let s = r.priceText, !s.isEmpty { return "$" + s.replacingOccurrences(of: "-", with: " – $") }
        return QuoteFormat.dash
    }

    private func iposContent(_ r: CalendarEventRow, link: Bool) -> some View {
        let status: String = r.status.map { s -> String in
            let v = t("status", s)
            return v.isEmpty ? s : v
        } ?? QuoteFormat.dash
        return VStack(alignment: .leading, spacing: 6) {
            titleLine(symbol: r.symbol, name: r.company, link: link, trailing: r.dealSize.map { QuoteFormat.money($0) })
            HStack(alignment: .top, spacing: 8) {
                fact(t("col", "status"), status)
                fact(t("col", "exchange"), dashIfEmpty(r.exchange))
                fact(t("col", "price"), iposPrice(r))
                fact(t("col", "shares"), QuoteFormat.compact(r.shares))
            }
        }
        .padding(.vertical, 10)
    }

    // MARK: Splits

    @ViewBuilder
    private func splitRow(_ r: CalendarEventRow) -> some View {
        if let sym = r.symbol, !sym.isEmpty {
            NavigationLink {
                StockDetailView(code: sym, name: r.name ?? sym, market: .us)
            } label: {
                splitContent(r).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(fill(t("openStock"), args: [sym]))
        } else {
            splitContent(r)
        }
    }

    private func splitContent(_ r: CalendarEventRow) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            titleLine(symbol: r.symbol, name: r.name, link: true, trailing: r.ratio)
            HStack(alignment: .top, spacing: 8) {
                fact(t("col", "ratio"), dashIfEmpty(r.ratio))
                fact(t("col", "effective"), QuoteFormat.date(r.effectiveDate))
            }
        }
        .padding(.vertical, 10)
    }

    // MARK: Dividends

    @ViewBuilder
    private func dividendRow(_ r: CalendarEventRow) -> some View {
        if let sym = r.symbol, !sym.isEmpty {
            NavigationLink {
                StockDetailView(code: sym, name: r.name ?? sym, market: .us)
            } label: {
                dividendContent(r).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(fill(t("openStock"), args: [sym]))
        } else {
            dividendContent(r)
        }
    }

    private func dividendContent(_ r: CalendarEventRow) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            titleLine(symbol: r.symbol, name: r.name, link: true, trailing: perShare(r.amount))
            HStack(alignment: .top, spacing: 8) {
                fact(t("col", "annual"), perShare(r.annual))
                fact(t("col", "record"), QuoteFormat.date(r.recordDate))
                fact(t("col", "payment"), QuoteFormat.date(r.paymentDate))
            }
        }
        .padding(.vertical, 10)
    }
}
