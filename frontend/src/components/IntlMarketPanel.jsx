import { useEffect, useState } from 'react'
import useCompareStore from '../store/compareStore'
import { CUR, localName } from '../utils/markets'

// Landing panel for Hong Kong and Japan (the US one is USMarketPanel): index levels, whether the
// exchange is trading, and the most-followed names. Green up / red down, as in Hong Kong and the US.

const L = {
  zh: { hk: '港股市场', jp: '日本股市', open: '交易中', lunch: '午间休市', closed: '休市', popular: '热门股票', delayed: '数据可能延迟，仅供参考', local: { hk: '香港时间', jp: '东京时间' } },
  en: { hk: 'Hong Kong Market', jp: 'Japan Market', open: 'Market open', lunch: 'Lunch break', closed: 'Closed', popular: 'Most followed', delayed: 'Data may be delayed', local: { hk: 'HKT', jp: 'JST' } },
  ja: { hk: '香港市場', jp: '日本市場', open: '取引中', lunch: '昼休み', closed: '休場', popular: '注目銘柄', delayed: 'データは遅延する場合があります', local: { hk: '香港時間', jp: '日本時間' } },
  ko: { hk: '홍콩 시장', jp: '일본 시장', open: '거래 중', lunch: '점심 휴장', closed: '휴장', popular: '인기 종목', delayed: '데이터가 지연될 수 있습니다', local: { hk: '홍콩 시간', jp: '도쿄 시간' } },
  fr: { hk: 'Marché de Hong Kong', jp: 'Marché japonais', open: 'Marché ouvert', lunch: 'Pause déjeuner', closed: 'Fermé', popular: 'Les plus suivies', delayed: 'Données possiblement différées', local: { hk: 'heure de HK', jp: 'heure de Tokyo' } },
}

// Regular sessions in exchange time (public holidays are not modelled): HKEX 9:30-12:00 / 13:00-16:00,
// TSE 9:00-11:30 / 12:30-15:30 (the afternoon close moved to 15:30 in November 2024).
const SESSIONS = {
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
const col = (p) => (p > 0 ? UP : p < 0 ? DOWN : 'var(--text-secondary)')
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
    const load = () => fetch(`/api/${market}/overview`).then((r) => r.json()).then((j) => alive && j.hot && setD(j)).catch(() => {})
    load()
    const id = setInterval(() => { load(); tick((n) => n + 1) }, 60000)
    return () => { alive = false; clearInterval(id) }
  }, [market])

  if (!d) return <div className="skeleton" style={{ ...card, height: 150, marginBottom: 10 }} />

  const s = sessionState(market)
  const open = (q) => useCompareStore.getState().switchMarketAndAddSymbol(market, { code: q.symbol, name: localName(q, lang, market) })
  // Japanese prices are whole yen or one decimal
  const priceDigits = market === 'jp' ? 1 : 2

  return (
    <div style={{ ...card, padding: 16, marginBottom: 10, display: 'grid', gap: 16 }}>
      <style>{`.imp-tile { transition: background .15s, border-color .15s, transform .15s; }
.imp-tile:hover { border-color: var(--border-glow) !important; transform: translateY(-1px); }
.imp-tile:focus-visible { outline: 2px solid var(--accent-blue); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .imp-tile { transition: none; } .imp-tile:hover { transform: none; } }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: s.state === 'open' ? UP : s.state === 'lunch' ? 'var(--accent-gold)' : 'var(--text-muted)' }} />
        <strong style={{ fontSize: 14 }}>{t[market]}</strong>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{t[s.state]}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{s.time} {t.local[market]} · {t.delayed}</span>
      </div>

      {d.indices.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {d.indices.map((i) => (
            <div key={i.symbol} style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{lang === 'zh' || lang === 'ja' ? i.name_zh : i.name_en}</div>
              <div className="serif-num" style={{ fontSize: 27, margin: '2px 0' }}>{num(i.price)}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: col(i.change_pct), fontVariantNumeric: 'tabular-nums' }}>
                {pct(i.change_pct)}{i.change != null && <span style={{ marginLeft: 8, opacity: 0.8 }}>{i.change > 0 ? '+' : ''}{num(i.change)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{t.popular}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
          {d.hot.map((q) => (
            <button key={q.symbol} className="imp-tile" onClick={() => open(q)}
              style={{ minWidth: 0, textAlign: 'left', background: 'var(--bg-tertiary)', border: '1px solid transparent', borderRadius: 10, padding: '8px 10px', color: 'inherit', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{localName(q, lang, market)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: '"JetBrains Mono", monospace' }}>{q.symbol}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4, gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{CUR[market]}{num(q.price, priceDigits)}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: col(q.change_pct), fontVariantNumeric: 'tabular-nums' }}>{pct(q.change_pct)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
