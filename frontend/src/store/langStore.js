import { create } from 'zustand'

const SUPPORTED = ['zh', 'en', 'ja', 'ko', 'fr']

// Language rules (Nov 2026): English first for everyone. A visitor gets another language only
//   1. when they chose it (language menu, welcome picker, phone settings, or their account), or
//   2. when the link says so (?lang=zh), or
//   3. when they arrived from a search engine in that language: Baidu, Sogou, Yahoo Japan, Naver,
//      a regional Google (google.com.hk, google.co.jp, ...), or any search engine when their browser
//      is set to that language (Google hides the query itself, so the browser language is the best
//      sign that they searched in Chinese or Japanese).
// A visitor who types the address or follows another link gets English, whatever their browser says.
//
// localStorage: bfs_lang holds the language, bfs_lang_src why ('pick' | 'search' | 'auto').
// Values saved before these rules have no bfs_lang_src and are worked out again once.

const REGIONAL = [
  [/(^|\.)baidu\.com$|(^|\.)sogou\.com$|(^|\.)so\.com$|(^|\.)sm\.cn$|(^|\.)360\.cn$|(^|\.)zhihu\.com$|(^|\.)weixin\.qq\.com$|(^|\.)bilibili\.com$|(^|\.)xiaohongshu\.com$|(^|\.)weibo\.com$|(^|\.)douyin\.com$|^cn\.bing\.com$|(^|\.)google\.(cn|com\.hk|com\.tw)$/, 'zh'],
  [/(^|\.)yahoo\.co\.jp$|(^|\.)goo\.ne\.jp$|(^|\.)google\.co\.jp$/, 'ja'],
  [/(^|\.)naver\.com$|(^|\.)daum\.net$|(^|\.)google\.co\.kr$/, 'ko'],
  [/(^|\.)google\.fr$|(^|\.)qwant\.com$/, 'fr'],
]
const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|yandex|startpage|search\.brave)\.[a-z.]+$/

function browserLang() {
  for (const l of navigator.languages || [navigator.language || '']) {
    const code = String(l).toLowerCase().split('-')[0]
    if (SUPPORTED.includes(code)) return code
  }
  return null
}

function urlLang() {
  try {
    const q = new URLSearchParams(window.location.search).get('lang')
    return SUPPORTED.includes(q) ? q : null
  } catch { return null }
}

function searchLang() {
  let host = ''
  try { host = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : '' } catch { /* bad referrer */ }
  if (!host || host.endsWith('bestfriendstock.com')) return null
  for (const [re, lang] of REGIONAL) if (re.test(host)) return lang
  if (SEARCH.test(host)) {
    const b = browserLang()
    if (b && b !== 'en') return b
  }
  return null
}

const read = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const write = (lang, src) => { try { localStorage.setItem('bfs_lang', lang); localStorage.setItem('bfs_lang_src', src) } catch { /* private mode */ } }

/** Remember a language the reader chose themselves (menus, pickers, settings). */
export function rememberLang(lang) { write(lang, 'pick') }

function readLangHint() {
  // Crawlers keep the language the page's HTML is written in (Chinese for the site, English for a
  // case page from an English source), unless the link asks for another one
  if (/bot|crawl|spider|slurp|facebookexternalhit|preview/i.test(navigator.userAgent || '')) {
    return urlLang() || (document.documentElement.lang?.startsWith('en') ? 'en' : 'zh')
  }
  const account = document.cookie.match(/bfs_lang_hint=(\w+)/)?.[1]
  if (SUPPORTED.includes(account)) return account
  const fromLink = urlLang()
  if (fromLink) { write(fromLink, 'pick'); return fromLink }
  const saved = read('bfs_lang'), src = read('bfs_lang_src')
  if (src === 'pick' && SUPPORTED.includes(saved)) return saved
  const fromSearch = searchLang()
  if (fromSearch) { write(fromSearch, 'search'); return fromSearch }
  if (src === 'search' && SUPPORTED.includes(saved)) return saved
  write('en', 'auto')
  return 'en'
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
