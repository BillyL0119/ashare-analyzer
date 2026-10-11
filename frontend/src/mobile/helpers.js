import { guessMarket } from '../utils/markets'
/** East-Asian markets quote red-up; the US convention is green-up (same rule as the iOS app). */
export function changeColor(p, market = 'cn') {
  if (p == null || p === 0) return 'var(--text-2)'
  const up = p > 0
  const cn = market === 'cn'
  return (up === cn) ? 'var(--cn-up)' : 'var(--cn-down)'
}
export const marketOfRegion = (r) => (['cn', 'hk', 'jp', 'kr'].includes(r) ? 'cn' : 'us')


/** Market of a saved item: its own field, else the shape of the code (6 digits A-share, 5 HK, 4 Japan). */
export const marketOf = (code, market) => market || guessMarket(code)

/** API paths: A-shares have their own routes; US, Hong Kong and Japan share the US shapes. */
export const quotePath = (m, code) => (m === 'cn' ? `/stocks/${code}/realtime` : `/${m}/stock/${code}/realtime`)
export const historyPath = (m, code, n) => (m === 'cn' ? `/stocks/${code}/history?count=${n}` : `/${m}/stock/${code}/history?count=${n}`)
export const chipLabel = (m) => ({ us: '美股', cn: 'A股', hk: '港股', jp: '日股' })[m] || '美股'

/** Backend study content carries `title_ja`, `body_fr`... : prefer the translation, fall back to the base field. */
export function loc(obj, field, lang) {
  if (!obj) return ''
  if (['ja', 'ko', 'fr'].includes(lang) && obj[`${field}_${lang}`]) return obj[`${field}_${lang}`]
  if (lang === 'en' && obj[`${field}_en`]) return obj[`${field}_en`]
  const v = obj[field] ?? ''
  // curriculum titles are stored as "中文 / English"; show the Chinese half in zh
  return lang === 'zh' && field === 'title' && typeof v === 'string' && v.includes(' / ') ? v.split(' / ')[0] : v
}
