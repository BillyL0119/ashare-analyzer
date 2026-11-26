// How old a market's quotes are, measured 2026-11-26 against the sources' own timestamps (Tencent, Yahoo):
// US (Nasdaq), A-shares and Hong Kong are real time (within a few seconds); Japan is about 20 minutes late at the
// source (the free Japanese feeds are exchange-delayed, Yahoo's too). Shown so nobody trades on a stale price.
const JP = {
  zh: '日股行情约延迟 20 分钟（免费数据源的交易所规定）',
  en: 'Japanese quotes are delayed about 20 minutes (exchange rule for free data)',
  ja: '日本株の株価は約20分遅れです（無料データの取引所ルール）',
  ko: '일본 주가는 약 20분 지연됩니다 (무료 데이터의 거래소 규정)',
  fr: 'Les cours japonais sont différés d’environ 20 minutes (règle de la bourse pour les données gratuites)',
}

/** The delay notice for a market, or null when its quotes are real time. */
export function delayNote(market, lang) {
  return market === 'jp' ? (JP[lang] || JP.en) : null
}
