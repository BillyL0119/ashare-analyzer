import { create } from 'zustand'

const SUPPORTED = ['zh', 'en', 'ja', 'ko', 'fr']

// First visit: follow the browser language instead of blocking the page with a picker.
// Crawlers keep the language the page's HTML is written in, so the indexed language does not
// change: Chinese for the site, English for a case page from an English source
// (backend/services/case_pages.py writes its <html lang>).
function detectLang() {
  if (/bot|crawl|spider|slurp|facebookexternalhit|preview/i.test(navigator.userAgent || '')) {
    return document.documentElement.lang?.startsWith('en') ? 'en' : 'zh'
  }
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

const HTML_LANG = { zh: 'zh-CN', en: 'en', ja: 'ja', ko: 'ko', fr: 'fr' }
// <html lang> follows the reader's language so screen readers use the right voice
const markHtml = (lang) => { try { document.documentElement.lang = HTML_LANG[lang] || 'en' } catch { /* no DOM */ } }

const useLangStore = create((set) => ({
  lang: readLangHint(),
  setLang: (lang) => { markHtml(lang); set({ lang }) },
}))
markHtml(useLangStore.getState().lang)

export default useLangStore
