/** East-Asian markets quote red-up; the US convention is green-up (same rule as the iOS app). */
export function changeColor(p, market = 'cn') {
  if (p == null || p === 0) return 'var(--text-2)'
  const up = p > 0
  const cn = market === 'cn'
  return (up === cn) ? 'var(--cn-up)' : 'var(--cn-down)'
}
export const marketOfRegion = (r) => (['cn', 'hk', 'jp', 'kr'].includes(r) ? 'cn' : 'us')


export const marketOf = (code) => (/^\d{6}$/.test(code) ? 'cn' : 'us')

/** Backend study content carries `title_ja`, `body_fr`... : prefer the translation, fall back to the base field. */
export function loc(obj, field, lang) {
  if (!obj) return ''
  if (['ja', 'ko', 'fr'].includes(lang) && obj[`${field}_${lang}`]) return obj[`${field}_${lang}`]
  if (lang === 'en' && obj[`${field}_en`]) return obj[`${field}_en`]
  const v = obj[field] ?? ''
  // curriculum titles are stored as "中文 / English"; show the Chinese half in zh
  return lang === 'zh' && field === 'title' && typeof v === 'string' && v.includes(' / ') ? v.split(' / ')[0] : v
}
