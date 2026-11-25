// Colours for index changes and English names of the China indices, shared by the ticker bar (GlobalSentiment.jsx) and the world map (WorldMap.jsx).

// ── Ticker helpers ────────────────────────────────────────────────────────────
export function changePctColor(pct) {
  if (pct === null || pct === undefined) return 'var(--text-secondary)'
  if (pct > 0)  return '#3fb67a'
  if (pct < 0)  return '#e5484d'
  return 'var(--text-secondary)'
}
export function changePctBg(pct) {
  if (pct === null || pct === undefined) return 'rgba(148,163,184,0.06)'
  if (pct > 0) return 'rgba(63,182,122,0.08)'
  if (pct < 0) return 'rgba(229,72,77,0.08)'
  return 'rgba(148,163,184,0.06)'
}
export function changePctBorder(pct) {
  if (pct === null || pct === undefined) return 'rgba(148,163,184,0.15)'
  if (pct > 0) return 'rgba(63,182,122,0.2)'
  if (pct < 0) return 'rgba(229,72,77,0.2)'
  return 'rgba(148,163,184,0.15)'
}

export const CN_INDEX_EN = {
  '上证指数': 'SSE Composite', '深证成指': 'SZSE Component', '创业板指': 'ChiNext',
  '沪深300': 'CSI 300', '科创50': 'STAR 50', '恒生指数': 'Hang Seng', '上证50': 'SSE 50', '中证500': 'CSI 500',
}
