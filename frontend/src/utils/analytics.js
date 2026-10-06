// Fire-and-forget analytics helpers. Never throws — silently swallows errors.
import { currentUI, inAppName } from './device'

const REFERRER_SOURCES = [
  [/(^|\.)instagram\.com$/, 'instagram'], [/(^|\.)(facebook|fb)\.com$|^l\.facebook\.com$/, 'facebook'],
  [/(^|\.)tiktok\.com$/, 'tiktok'], [/(^|\.)(twitter|x)\.com$|^t\.co$/, 'twitter'], [/(^|\.)youtube\.com$|^youtu\.be$/, 'youtube'],
  [/(^|\.)reddit\.com$/, 'reddit'], [/(^|\.)google\./, 'google'], [/(^|\.)bing\.com$/, 'bing'], [/(^|\.)baidu\.com$/, 'baidu'],
  [/(^|\.)xiaohongshu\.com$|(^|\.)xhslink\.com$/, 'xiaohongshu'], [/(^|\.)weibo\.(com|cn)$/, 'weibo'], [/(^|\.)linkedin\.com$/, 'linkedin'],
]

/**
 * Traffic source as a short category (never a URL): ?utm_source=... wins (so you can tag your Instagram bio link),
 * then the in-app browser the page runs in, then the referrer's site. Remembered for the browser session.
 */
export function detectSource() {
  try {
    const cached = sessionStorage.getItem('bfs_src')
    if (cached !== null) return cached
    const utm = new URLSearchParams(window.location.search).get('utm_source')
    let src = utm ? utm.toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 24) : ''
    if (!src) src = inAppName() || ''
    if (!src && document.referrer) {
      let host = ''
      try { host = new URL(document.referrer).hostname.replace(/^www\./, '') } catch { /* ignore */ }
      if (host && host !== window.location.hostname) src = REFERRER_SOURCES.find(([re]) => re.test(host))?.[1] || 'other'
    }
    sessionStorage.setItem('bfs_src', src)
    return src
  } catch { return '' }
}

function getDeviceId() {
  const key = 'bfs_device_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = Math.random().toString(36).substr(2, 9) + Date.now()
    localStorage.setItem(key, id)
  }
  return id
}

export function trackVisit(page = 'home') {
  fetch('/api/analytics/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: getDeviceId(), page, ui: currentUI(), source: detectSource() }),
  }).catch(() => {})
}

export function trackSearch(symbol) {
  if (!symbol) return
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: getDeviceId(), event: 'search', symbol }),
  }).catch(() => {})
}

export function trackFeature(feature) {
  if (!feature) return
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: getDeviceId(), event: 'feature', feature }),
  }).catch(() => {})
}
