// Number and date formatting shared by every quote-page tab (Summary, Statistics, Historical data,
// Holders, Analysts) so the same figure reads the same way everywhere. Missing values print as DASH.
import { riseColor, fallColor } from '../../utils/chartTheme'

export const LOCALE = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR' }
export const DASH = '—'
export const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const loc = (lang) => LOCALE[lang] || 'en-US'

/** 1,234.56 (always two decimals by default; prices under $1 get four) */
export function fmtPrice(v, lang, digits) {
  if (!isNum(v)) return DASH
  const d = digits ?? (Math.abs(v) < 1 && v !== 0 ? 4 : 2)
  return new Intl.NumberFormat(loc(lang), { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)
}

/** $5.11T / $382.4M in English, the locale's own compact words elsewhere (5.11万亿美元) */
export function fmtMoney(v, lang, currency = 'USD') {
  if (!isNum(v)) return DASH
  if (Math.abs(v) < 1e4) return new Intl.NumberFormat(loc(lang), { style: 'currency', currency, maximumFractionDigits: 2 }).format(v)
  return new Intl.NumberFormat(loc(lang), { notation: 'compact', style: 'currency', currency, maximumFractionDigits: 2 }).format(v)
}

/** 12.6M shares, 3.4B */
export function fmtCompact(v, lang) {
  if (!isNum(v)) return DASH
  return new Intl.NumberFormat(loc(lang), { notation: 'compact', maximumFractionDigits: 2 }).format(v)
}

/** 12,640,411 */
export function fmtInt(v, lang) {
  if (!isNum(v)) return DASH
  return new Intl.NumberFormat(loc(lang), { maximumFractionDigits: 0 }).format(v)
}

/** 37.62 (P/E, beta, ratios) */
export function fmtRatio(v, lang, digits = 2) {
  if (!isNum(v)) return DASH
  return new Intl.NumberFormat(loc(lang), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v)
}

/** 12.34% from a percent number (12.34, not 0.1234) */
export function fmtPct(v, digits = 2) {
  if (!isNum(v)) return DASH
  return `${v.toFixed(digits)}%`
}

/** +12.34% / −3.10% (true minus sign) */
export function fmtSignedPct(v, digits = 2) {
  if (!isNum(v)) return DASH
  const s = Math.abs(v).toFixed(digits)
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${s}%`
}

/** +1.23 / −0.45 */
export function fmtSigned(v, digits = 2) {
  if (!isNum(v)) return DASH
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(digits)}`
}

/** 'YYYY-MM-DD' -> Nov 18, 2026 (or the locale's form). Noon UTC so no time zone shifts the day. */
export function fmtDate(iso, lang, opts = { year: 'numeric', month: 'short', day: 'numeric' }) {
  if (!iso) return DASH
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? DASH : d.toLocaleDateString(loc(lang), { timeZone: 'UTC', ...opts })
}

/** 'YYYY-MM-DD' -> Nov 18 */
export const fmtShortDate = (iso, lang) => fmtDate(iso, lang, { month: 'short', day: 'numeric' })

/** Rise / fall colour for a change (US: green up, red down; theme-aware). Neutral for 0 or missing. */
export function changeColor(v, market = 'us') {
  if (!isNum(v) || v === 0) return 'var(--text-secondary)'
  return v > 0 ? riseColor(market) : fallColor(market)
}

/**
 * Format a value by the `fmt` tag the quote APIs send with each row:
 * money | price | ratio | pct | signed_pct | compact | int | shares | date | text | x (a multiple, "1.8x")
 */
export function fmtValue(v, fmt, lang) {
  switch (fmt) {
    case 'money': return fmtMoney(v, lang)
    case 'price': return isNum(v) ? `$${fmtPrice(v, lang)}` : DASH
    case 'ratio': return fmtRatio(v, lang)
    case 'pct': return fmtPct(v)
    case 'signed_pct': return fmtSignedPct(v)
    case 'compact':
    case 'shares': return fmtCompact(v, lang)
    case 'int': return fmtInt(v, lang)
    case 'date': return fmtDate(v, lang)
    case 'x': return isNum(v) ? `${fmtRatio(v, lang)}x` : DASH
    case 'text': return v == null || v === '' ? DASH : String(v)
    default: return v == null ? DASH : String(v)
  }
}
