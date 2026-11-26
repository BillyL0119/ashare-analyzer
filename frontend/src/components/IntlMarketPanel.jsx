import { delayNote } from '../utils/quoteDelay'
import { useEffect, useState } from 'react'
import useCompareStore from '../store/compareStore'
import { CUR, localName } from '../utils/markets'
import visibleInterval from '../utils/visibleInterval'

// Landing panel for A-shares, Hong Kong and Japan (the US one is USMarketPanel): index levels, whether the
// exchange is trading, and the most-followed names. Green up / red down as in Hong Kong and the US; A-shares red up /
// green down with the rising / falling counts (from /api/home/lesson?market=cn).

const L = {
  zh: { cn: 'A股市场', hk: '港股市场', jp: '日本股市', up: '上涨', down: '下跌', flat: '平盘', open: '交易中', lunch: '午间休市', closed: '休市', popular: '热门股票', delayed: '数据可能延迟，仅供参考', local: { cn: '北京时间', hk: '香港时间', jp: '东京时间' } },
  en: { cn: 'China A-share Market', hk: 'Hong Kong Market', jp: 'Japan Market', up: 'up', down: 'down', flat: 'flat', open: 'Market open', lunch: 'Lunch break', closed: 'Closed', popular: 'Most followed', delayed: 'Data may be delayed', local: { cn: 'Beijing time', hk: 'HKT', jp: 'JST' } },
  ja: { cn: '中国A株市場', hk: '香港市場', jp: '日本市場', up: '上昇', down: '下落', flat: '変わらず', open: '取引中', lunch: '昼休み', closed: '休場', popular: '注目銘柄', delayed: 'データは遅延する場合があります', local: { cn: '北京時間', hk: '香港時間', jp: '日本時間' } },
  ko: { cn: '중국 A주 시장', hk: '홍콩 시장', jp: '일본 시장', up: '상승', down: '하락', flat: '보합', open: '거래 중', lunch: '점심 휴장', closed: '휴장', popular: '인기 종목', delayed: '데이터가 지연될 수 있습니다', local: { cn: '베이징 시간', hk: '홍콩 시간', jp: '도쿄 시간' } },
  fr: { cn: 'Marché chinois des actions A', hk: 'Marché de Hong Kong', jp: 'Marché japonais', up: 'en hausse', down: 'en baisse', flat: 'stables', open: 'Marché ouvert', lunch: 'Pause déjeuner', closed: 'Fermé', popular: 'Les plus suivies', delayed: 'Données possiblement différées', local: { cn: 'heure de Pékin', hk: 'heure de HK', jp: 'heure de Tokyo' } },
}

// Regular sessions in exchange time (public holidays are not modelled): HKEX 9:30-12:00 / 13:00-16:00,
// TSE 9:00-11:30 / 12:30-15:30 (the afternoon close moved to 15:30 in November 2024).
const SESSIONS = {
  cn: { tz: 'Asia/Shanghai', am: [570, 690], pm: [780, 900] },
  hk: { tz: 'Asia/Hong_Kong', am: [570, 720], pm: [780, 960] },
  jp: { tz: 'Asia/Tokyo', am: [540, 690], pm: [750, 930] },
}

function sessionState(market) {
  const { tz, am, pm } = SESSIONS[market]
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
    .formatToParts(new Date()).map((p) => [p.type, p.value]))
  const mins = Number(parts.hour) * 60 + Number(parts.minute)
  const time = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
  if (parts.weekday === 'Sat' || parts.weekday === 'Sun') return { state: 'closed', time }
  if ((mins >= am[0] && mins < am[1]) || (mins >= pm[0] && mins < pm[1])) return { state: 'open', time }
  if (mins >= am[1] && mins < pm[0]) return { state: 'lunch', time }
  return { state: 'closed', time }
}

const UP = 'var(--green-bright)', DOWN = 'var(--red-bright)'
const col = (p, market) => (p > 0 ? (market === 'cn' ? DOWN : UP) : p < 0 ? (market === 'cn' ? UP : DOWN) : 'var(--text-secondary)')
const pct = (p) => (p == null ? '—' : `${p > 0 ? '+' : ''}${p.toFixed(2)}%`)
const num = (v, d = 2) => (v == null ? '—' : v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }))
const card = { background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 12 }

export default function IntlMarketPanel({ lang, market }) {
  const t = L[lang] || L.en
  const [d, setD] = useState(null)
  const [, tick] = useState(0)

  useEffect(() => {
    let alive = true
    setD(null)
    // A-shares have no /api/cn/overview: the home panel's endpoint carries the same pieces
    const url = market === 'cn' ? '/api/home/lesson?market=cn' : `/api/${market}/overview`
    const shape = (j) => (market === 'cn' && j.hot
      ? { ...j, hot: j.hot.map((h) => ({ ...h, change_pct: h.pct })) }
      : j)
    const load = () => fetch(url).then((r) => r.json()).then((j) => alive && j.hot && setD(shape(j))).catch(() => {})
    load()
    const stop = visibleInterval(() => { load(); tick((n) => n + 1) }, 60000)
    return () => { alive = false; stop() }
  }, [market])

  if (!d) return <div className="skeleton" style={{ ...card, height: 150, marginBottom: 10 }} />

  const s = sessionState(market)
  const open = (q) => useCompareStore.getState().switchMarketAndAddSymbol(market, { code: q.symbol, name: localName(q, lang, market) })
  // Japanese prices are whole yen or one decimal
  const priceDigits = market === 'jp' ? 1 : 2

  return (
    <div style={{ ...card, padding: 16, marginBottom: 10, display: 'grid', gap: 16 }}>
      <style>{`.imp-tile { transition: background .15s, border-color .15s, transform .15s; }
.imp-tile:hover { border-color: var(--border-glow) !important; }
.imp-tile:focus-visible { outline: 2px solid var(--accent-blue); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .imp-tile { transition: none; } .imp-tile:hover { transform: none; } }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: s.state === 'open' ? UP : s.state === 'lunch' ? 'var(--accent-gold)' : 'var(--text-muted)' }} />
        <strong style={{ fontSize: 14 }}>{t[market]}</strong>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{t[s.state]}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{s.time} {t.local[market]} · {delayNote(market, lang) || t.delayed}</span>
      </div>

      {d.indices.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {d.indices.map((i) => (
            <div key={i.symbol} style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{lang === 'zh' || lang === 'ja' ? i.name_zh : i.name_en}</div>
              <div className="serif-num" style={{ fontSize: 27, margin: '2px 0' }}>{num(i.price)}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: col(i.change_pct, market), fontVariantNumeric: 'tabular-nums' }}>
                {pct(i.change_pct)}{i.change != null && <span style={{ marginLeft: 8, opacity: 0.8 }}>{i.change > 0 ? '+' : ''}{num(i.change)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {market === 'cn' && d.breadth && (
        <div>
          <div style={{ display: 'flex', gap: 2, height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
            <span style={{ flex: d.breadth.advancing, background: DOWN }} />
            <span style={{ flex: d.breadth.flat, background: 'var(--text-muted)', opacity: 0.5 }} />
            <span style={{ flex: d.breadth.declining, background: UP }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: DOWN }}>{num(d.breadth.advancing, 0)} {t.up}</span>
            <span style={{ color: 'var(--text-muted)' }}>{num(d.breadth.flat, 0)} {t.flat}</span>
            <span style={{ color: UP }}>{num(d.breadth.declining, 0)} {t.down}</span>
          </div>
        </div>
      )}

      <div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{t.popular}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
          {d.hot.map((q) => (
            <button key={q.symbol} className="imp-tile" onClick={() => open(q)}
              style={{ minWidth: 0, textAlign: 'left', background: 'var(--bg-tertiary)', border: '1px solid transparent', borderRadius: 10, padding: '8px 10px', color: 'inherit', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{localName(q, lang, market)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: '"JetBrains Mono", monospace' }}>{q.symbol}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4, gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{CUR[market]}{num(q.price, priceDigits)}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: col(q.change_pct, market), fontVariantNumeric: 'tabular-nums' }}>{pct(q.change_pct)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
