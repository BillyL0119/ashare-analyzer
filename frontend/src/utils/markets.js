// The four markets the site covers. A-shares are the odd one out: red means up, prices come from
// /api/stocks/..., and there is no currency sign. US, Hong Kong and Japan share the US-style API
// (/api/{market}/stock/{symbol}) and the international colour convention (green up).

export const MARKETS = ['us', 'cn', 'hk', 'jp']

export const isIntl = (m) => m !== 'cn'

export const CUR = { us: '$', cn: '¥', hk: 'HK$', jp: '¥' }

const LABELS = {
  us: { zh: '美股', en: 'US', ja: '米国株', ko: '미국', fr: 'US' },
  cn: { zh: 'A股', en: 'China A', ja: '中国A株', ko: 'A주', fr: 'Chine A' },
  hk: { zh: '港股', en: 'HK', ja: '香港株', ko: '홍콩', fr: 'HK' },
  jp: { zh: '日股', en: 'Japan', ja: '日本株', ko: '일본', fr: 'Japon' },
}
export const marketLabel = (m, lang) => (LABELS[m] || LABELS.us)[lang] || (LABELS[m] || LABELS.us).en

// Badge colours for search results / watchlist chips
export const MARKET_TINT = { us: '#0ea5e9', cn: '#22c55e', hk: '#f97316', jp: '#e11d48' }

export const realtimePath = (m, code) => (m === 'cn' ? `/stocks/${code}/realtime` : `/${m}/stock/${code}/realtime`)
export const historyPath = (m, code) => (m === 'cn' ? `/stocks/${code}/history` : `/${m}/stock/${code}`)

/** Name to show for a HK/JP security in the reader's language (the API sends every variant). */
export function localName(item, lang, market) {
  if (!item) return ''
  if (market === 'hk') return (lang === 'zh' || lang === 'ja' ? item.name_zh : item.name_en) || item.name || item.code
  if (market === 'jp') {
    if (lang === 'ja') return item.name_local || item.name
    if (lang === 'zh') return item.name_zh || item.name_local || item.name
    return item.name_en || item.name
  }
  return item.name || item.code
}

/** A ticker that can only belong to one market (used where old saved items have no market). */
export function guessMarket(code) {
  if (/^\d{6}$/.test(code)) return 'cn'
  if (/^\d{5}$/.test(code)) return 'hk'
  if (/^\d{4}$|^\d{3}[A-Z]$/.test(code)) return 'jp'
  return 'us'
}
