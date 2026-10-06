// Decides whether a visitor should get the phone (app-style) UI.
//
// In-app browsers (Instagram, TikTok, Facebook, WeChat, Line...) are detected explicitly: they are
// the usual way a link in a profile is opened, and they report a short, odd-sized viewport.

const IN_APP_PATTERNS = [
  ['instagram', /Instagram/i],
  ['facebook',  /FBAN|FBAV|FB_IAB|FBIOS/i],
  ['tiktok',    /musical_ly|BytedanceWebview|TikTok|trill/i],
  ['wechat',    /MicroMessenger/i],
  ['line',      /\bLine\//i],
  ['twitter',   /Twitter/i],
  ['snapchat',  /Snapchat/i],
  ['pinterest', /Pinterest/i],
  ['linkedin',  /LinkedInApp/i],
]

export function parseUserAgent(ua = '') {
  const inApp = IN_APP_PATTERNS.find(([, re]) => re.test(ua))?.[0] || null
  const ios = /iPhone|iPod/i.test(ua)
  const ipad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)
  const android = /Android/i.test(ua)
  const phone = ios || (android && /Mobile/i.test(ua)) || /Windows Phone|BlackBerry|Opera Mini/i.test(ua)
  return { inApp, ios, ipad, android, phone, tablet: ipad || (android && !/Mobile/i.test(ua)) }
}

const OVERRIDE_KEY = 'bfs_ui'

/** `?ui=mobile` / `?ui=desktop` forces a UI and remembers it for the session. */
function readOverride(search, storage) {
  const q = new URLSearchParams(search).get('ui')
  if (q === 'mobile' || q === 'desktop') {
    try { storage?.setItem(OVERRIDE_KEY, q) } catch { /* private mode */ }
    return q
  }
  if (q === 'auto') {
    try { storage?.removeItem(OVERRIDE_KEY) } catch { /* ignore */ }
    return null
  }
  try { return storage?.getItem(OVERRIDE_KEY) || null } catch { return null }
}

export function chooseUI({ ua = '', width = 1024, search = '', storage = null } = {}) {
  const override = readOverride(search, storage)
  if (override) return override

  const d = parseUserAgent(ua)
  if (d.inApp && (d.phone || width <= 900)) return 'mobile'
  if (d.phone) return 'mobile'
  // Narrow window on a real mobile browser engine that did not say "Mobile" (rare), but never
  // switch a desktop browser just because its window is small: that is a deliberate choice.
  if (d.tablet) return width <= 700 ? 'mobile' : 'desktop'
  return 'desktop'
}

export function currentUI() {
  if (typeof window === 'undefined') return 'desktop'
  let storage = null
  try { storage = window.sessionStorage } catch { /* blocked */ }
  return chooseUI({
    ua: navigator.userAgent || '',
    width: window.innerWidth,
    search: window.location.search,
    storage,
  })
}

export function setUIOverride(mode) {
  try {
    if (mode === 'auto') sessionStorage.removeItem(OVERRIDE_KEY)
    else sessionStorage.setItem(OVERRIDE_KEY, mode)
  } catch { /* ignore */ }
}

export function inAppName() {
  return typeof navigator === 'undefined' ? null : parseUserAgent(navigator.userAgent).inApp
}
