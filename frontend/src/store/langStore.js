import { create } from 'zustand'

const SUPPORTED = ['zh', 'en', 'ja', 'ko', 'fr']

// First visit: follow the browser language instead of blocking the page with a picker.
// Crawlers keep the Chinese default so the indexed page language does not change.
function detectLang() {
  if (/bot|crawl|spider|slurp|facebookexternalhit|preview/i.test(navigator.userAgent || '')) return 'zh'
  for (const l of navigator.languages || [navigator.language || '']) {
    const code = String(l).toLowerCase().split('-')[0]
    if (SUPPORTED.includes(code)) return code
  }
  return 'en'
}

// Priority: logged-in user cookie → guest localStorage → browser language
function readLangHint() {
  const saved = document.cookie.match(/bfs_lang_hint=(\w+)/)?.[1] || localStorage.getItem('bfs_lang')
  if (saved) return saved
  const lang = detectLang()
  try { localStorage.setItem('bfs_lang', lang) } catch { /* private mode */ }
  return lang
}

const useLangStore = create((set) => ({
  lang: readLangHint(),
  setLang: (lang) => set({ lang }),
}))

export default useLangStore
