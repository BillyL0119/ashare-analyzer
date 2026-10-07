import SwiftUI

enum AppearanceSetting: String, CaseIterable, Identifiable {
    case system, light, dark
    var id: String { rawValue }
    var label: String {
        switch self {
        case .system: return L("跟随系统")
        case .light:  return L("浅色")
        case .dark:   return L("深色")
        }
    }
    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light:  return .light
        case .dark:   return .dark
        }
    }
}

// MARK: - Language

enum AppLanguage: String, CaseIterable, Identifiable {
    case system, zh, en, ja, ko, fr
    var id: String { rawValue }

    var nativeName: String {
        switch self {
        case .system: return L("跟随系统")
        case .zh: return "中文"
        case .en: return "English"
        case .ja: return "日本語"
        case .ko: return "한국어"
        case .fr: return "Français"
        }
    }

    /// Folder name of the compiled .lproj for this language.
    var lproj: String? {
        switch self {
        case .system: return nil
        case .zh: return "zh-Hans"
        default: return rawValue
        }
    }
}

enum Lang {
    static let storageKey = "appLanguage"

    static var selected: AppLanguage {
        AppLanguage(rawValue: UserDefaults.standard.string(forKey: storageKey) ?? "") ?? .system
    }

    /// Effective language among zh / en / ja / ko / fr.
    static var code: String {
        let raw: String
        switch selected {
        case .system: raw = Locale.preferredLanguages.first ?? "en"
        default: raw = selected.rawValue
        }
        for c in ["zh", "ja", "ko", "fr"] where raw.hasPrefix(c) { return c }
        return "en"
    }

    /// zh / ja / ko group digits by 万 / 亿; the others use K / M / B.
    static var usesMyriad: Bool { ["zh", "ja", "ko"].contains(code) }

    /// Suffix the backend uses for translated study content (`title_ja`, `body_fr`, ...).
    static var contentSuffix: String? { ["en", "ja", "ko", "fr"].contains(code) ? code : nil }

    static var bundle: Bundle {
        let lproj = (AppLanguage(rawValue: code) ?? .en).lproj ?? code
        if let path = Bundle.main.path(forResource: lproj, ofType: "lproj"), let b = Bundle(path: path) {
            return b
        }
        return Bundle.main
    }

    static var locale: Locale { Locale(identifier: code == "zh" ? "zh-Hans" : code) }
}

/// Looks up a (Chinese-keyed) string in the selected language. Falls back to the key itself.
func L(_ key: String) -> String {
    Lang.bundle.localizedString(forKey: key, value: key, table: nil)
}

func L(_ key: String, _ args: CVarArg...) -> String {
    String(format: L(key), locale: Lang.locale, arguments: args)
}

@main
struct BFStockApp: App {
    @AppStorage("appearance") private var appearance = AppearanceSetting.system.rawValue
    @AppStorage(Lang.storageKey) private var language = AppLanguage.system.rawValue

    var body: some Scene {
        WindowGroup {
            ContentView()
                .id(language)
                .environment(\.locale, Lang.locale)
                .preferredColorScheme(AppearanceSetting(rawValue: appearance)?.colorScheme)
        }
    }
}
