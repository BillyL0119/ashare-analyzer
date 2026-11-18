import { useEffect, useState } from 'react'
import useLangStore from '../store/langStore'
import { useAPI } from './data'
import { Section, Skeleton } from './ui'
import { changeColor } from './helpers'
import summaryStrings, { fill } from '../components/quotepage/summaryStrings'
import { explain } from '../components/quotepage/glossary'
import { DASH, isNum, fmtPrice, fmtInt, fmtRatio, fmtMoney, fmtDate, fmtPct, fmtSignedPct } from '../components/quotepage/format'
import quoteStrings from './quoteStrings'

const US = 'us'
const KEYS = ['prev_close', 'open', 'bid', 'ask', 'day_range', 'week52_range', 'volume', 'avg_volume_3m', 'market_cap',
  'beta_5y_monthly', 'pe_ttm', 'eps_ttm', 'earnings_date', 'forward_dividend_yield', 'ex_dividend_date', 'target_1y']

const withSize = (p, size, lang) => (isNum(p) ? `${fmtPrice(p, lang)}${isNum(size) ? ` × ${fmtInt(size, lang)}` : ''}` : DASH)

function Range({ low, high, price, lang }) {
  if (!isNum(low) || !isNum(high)) return DASH
  const pos = isNum(price) && high > low ? Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100)) : null
  return (
    <>
      {fmtPrice(low, lang)} – {fmtPrice(high, lang)}
      {pos !== null && <span className="m-qs-range" aria-hidden="true"><i style={{ left: `${pos}%` }} /></span>}
    </>
  )
}

function values(d, lang, S) {
  const e = d.earnings
  const div = isNum(d.dividend_rate) ? `$${fmtPrice(d.dividend_rate, lang)}${isNum(d.dividend_yield) ? ` (${fmtPct(d.dividend_yield)})` : ''}` : DASH
  const sub = e && [e.timing && S[e.timing], isNum(e.eps_estimate) && fill(S.epsEstimate, { value: `$${fmtPrice(e.eps_estimate, lang)}` })].filter(Boolean).join(', ')
  return {
    prev_close: isNum(d.prev_close) ? fmtPrice(d.prev_close, lang) : DASH,
    open: isNum(d.open) ? fmtPrice(d.open, lang) : DASH,
    bid: withSize(d.bid, d.bid_size, lang),
    ask: withSize(d.ask, d.ask_size, lang),
    day_range: <Range low={d.day_low} high={d.day_high} price={d.price} lang={lang} />,
    week52_range: <Range low={d.week52_low} high={d.week52_high} price={d.price} lang={lang} />,
    volume: fmtInt(d.volume, lang),
    avg_volume_3m: fmtInt(d.avg_volume_3m, lang),
    market_cap: fmtMoney(d.market_cap, lang, d.currency || 'USD'),
    beta_5y_monthly: fmtRatio(d.beta_5y_monthly, lang),
    pe_ttm: fmtRatio(d.pe_ttm, lang),
    eps_ttm: fmtRatio(d.eps_ttm, lang),
    earnings_date: e?.date ? <>{fmtDate(e.date, lang)}{sub && <span className="m-qs-sub">{sub}</span>}</> : e?.announced === false ? S.notAnnounced : DASH,
    forward_dividend_yield: div,
    ex_dividend_date: d.ex_dividend_date ? fmtDate(d.ex_dividend_date, lang) : DASH,
    target_1y: isNum(d.target_1y) ? fmtPrice(d.target_1y, lang) : DASH,
  }
}

export function KeyStats({ symbol }) {
  const lang = useLangStore((s) => s.lang)
  const S = summaryStrings(lang), Q = quoteStrings(lang)
  const { data: d, error, reload } = useAPI(`/us/quote/${symbol}/live`, { refreshMs: 30000 })
  const [openAt, setOpen] = useState(null)   // {symbol, key}: a stale symbol means closed
  const open = openAt && openAt.symbol === symbol ? openAt.key : null
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!d) return <Section title={S.keyStats}>{error ? <Failed onRetry={reload} text={Q.error} /> : <Skeleton h={420} r={20} />}</Section>
  const vals = values(d, lang, S)
  return (
    <Section title={S.keyStats}>
      <div className="m-card flush">
        <p className="m-qs-hint">{S.keyStatsHint}</p>
        {KEYS.map((k) => {
          const g = open === k ? explain(k, lang) : null
          return (
            <div key={k} className="m-qs-item">
              <div className="m-qs-row">
                <button type="button" className="m-qs-term" aria-expanded={open === k} onClick={() => setOpen(open === k ? null : { symbol, key: k })}>{S[`lbl_${k}`]}</button>
                <span className="m-qs-val m-num">{vals[k]}</span>
              </div>
              {g && (
                <div className="m-qs-explain" role="note">
                  <p>{g.d}</p>
                  {g.f && <p><b>{Q.formula}</b> {g.f}</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function Failed({ onRetry, text }) {
  const lang = useLangStore((s) => s.lang)
  return (
    <div className="m-card m-empty">
      <div style={{ marginBottom: 12 }}>{text}</div>
      <button className="m-pill" style={{ background: 'var(--accent)', color: '#fff' }} onClick={onRetry}>{summaryStrings(lang).retry}</button>
    </div>
  )
}

const abs1 = (v) => Math.abs(v).toFixed(1)
function sentence(S, sym, rows) {
  const r = rows.find((x) => x.key === '1y' && isNum(x.stock) && isNum(x.benchmark)) || rows.find((x) => isNum(x.stock) && isNum(x.benchmark))
  if (!r) return null
  const base = fill(S.perfSentence, { period: S[`perfPhrase_${r.key}`], sym, va: r.stock >= 0 ? S.rose : S.fell, a: abs1(r.stock), vb: r.benchmark >= 0 ? S.rose : S.fell, b: abs1(r.benchmark) })
  const diff = r.stock - r.benchmark
  return Math.abs(diff) < 0.05 ? base : `${base} ${fill(diff > 0 ? S.perfBeat : S.perfTrail, { sym, d: abs1(diff) })}`
}

function Bar({ label, v, neg, pos, color }) {
  const range = neg + pos || 1
  const zero = (neg / range) * 100
  const w = isNum(v) ? (Math.abs(v) / range) * 100 : 0
  return (
    <div className="m-qs-perf-line">
      <span className="k">{label}</span>
      <span className="m-qs-track" style={{ '--zero': `${zero}%` }} aria-hidden="true">
        {isNum(v) && <b style={{ left: `${v >= 0 ? zero : zero - w}%`, width: `${w}%`, background: color }} />}
      </span>
      <span className="v m-num" style={{ color: isNum(v) ? changeColor(v, US) : 'var(--text-3)' }}>{isNum(v) ? fmtSignedPct(v, 1) : DASH}</span>
    </div>
  )
}

export function Performance({ symbol }) {
  const lang = useLangStore((s) => s.lang)
  const S = summaryStrings(lang)
  const { data, error, reload } = useAPI(`/us/quote/${symbol}/performance`)
  if (!data) return <Section title={S.perfTitle}>{error ? <Failed onRetry={reload} text={S.perfError} /> : <Skeleton h={250} r={20} />}</Section>
  const rows = data.rows || []
  const vals = rows.flatMap((r) => [r.stock, r.benchmark]).filter(isNum)
  if (!vals.length) return <Section title={S.perfTitle}><div className="m-card m-empty">{S.perfEmpty}</div></Section>
  const neg = Math.max(0, ...vals.filter((v) => v < 0).map((v) => -v))
  const pos = Math.max(0, ...vals.filter((v) => v > 0))
  const s = sentence(S, symbol, rows)
  return (
    <Section title={S.perfTitle}>
      <div className="m-card" style={{ display: 'grid', gap: 12 }}>
        <div className="m-qs-perf">
          {rows.map((r) => (
            <div key={r.key} className="m-qs-perf-row">
              <span className="m-qs-perf-label">{S[`perf_${r.key}`]}</span>
              <Bar label={symbol} v={r.stock} neg={neg} pos={pos} color={changeColor(r.stock, US)} />
              <Bar label={S.sp500} v={r.benchmark} neg={neg} pos={pos} color="var(--text-3)" />
            </div>
          ))}
        </div>
        {s && <p style={{ fontSize: 13.5, lineHeight: 1.5 }}>{s}</p>}
        <p className="m-label">{S.perfNote}</p>
      </div>
    </Section>
  )
}

export function AnalystSnapshot({ symbol }) {
  const lang = useLangStore((s) => s.lang)
  const S = summaryStrings(lang)
  const { data, loading } = useAPI(`/us/quote/${symbol}/analysts`)
  if (!data) return loading ? <Section title={S.analystsTitle}><Skeleton h={170} r={20} /></Section> : null
  const t = data.targets, r = data.rating
  const total = r ? (r.buy || 0) + (r.hold || 0) + (r.sell || 0) : 0
  if (data.asset_class === 'etf' || (!t && !total)) return null
  const { low, average: avg, high, current: price } = t || {}
  const haveScale = isNum(low) && isNum(high) && high > low
  const lo = haveScale ? Math.min(low, isNum(price) ? price : low) : 0
  const hi = haveScale ? Math.max(high, isNum(price) ? price : high) : 1
  const at = (v) => `${Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100))}%`
  const upside = isNum(avg) && isNum(price) && price > 0 ? (avg / price - 1) * 100 : null
  const cell = (k, v) => <div key={k}><div className="m-label">{k}</div><div className="m-num" style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{isNum(v) ? `$${fmtPrice(v, lang)}` : DASH}</div></div>
  return (
    <Section title={S.analystsTitle}>
      <div className="m-card" style={{ display: 'grid', gap: 14 }}>
        {t && (
          <>
            {haveScale && (
              <div className="m-qs-scale" aria-hidden="true">
                {isNum(avg) && <i className="avg" style={{ left: at(avg) }} />}
                {isNum(price) && <i className="now" style={{ left: at(price) }} />}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
              {cell(S.targetLow, low)}{cell(S.targetAvg, avg)}{cell(S.targetNow, price)}{cell(S.targetHigh, high)}
            </div>
            {upside !== null && <p className="m-label">{fill(upside >= 0 ? S.upside : S.downside, { d: Math.abs(upside).toFixed(1) })}</p>}
          </>
        )}
        {total > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            <div className="m-qs-split" aria-hidden="true">
              {r.buy > 0 && <i style={{ flex: r.buy, background: changeColor(1, US) }} />}
              {r.hold > 0 && <i style={{ flex: r.hold, background: 'var(--text-3)' }} />}
              {r.sell > 0 && <i style={{ flex: r.sell, background: changeColor(-1, US) }} />}
            </div>
            <div className="m-label m-num" style={{ display: 'flex', gap: 16 }}>
              <span><b>{r.buy || 0}</b> {S.buy}</span><span><b>{r.hold || 0}</b> {S.hold}</span><span><b>{r.sell || 0}</b> {S.sell}</span>
            </div>
          </div>
        )}
        <p className="m-label">{S.analystsHint}</p>
      </div>
    </Section>
  )
}

export function Peers({ symbol, onOpen }) {
  const lang = useLangStore((s) => s.lang)
  const S = summaryStrings(lang)
  const { data } = useAPI(`/us/quote/${symbol}/peers`)
  const rows = (data?.peers || []).slice(0, 6)
  if (!rows.length) return null
  return (
    <Section title={S.peersTitle}>
      <div className="m-card flush">
        <p className="m-qs-hint">{fill(data.basis === 'industry' ? S.peersHintIndustry : S.peersHintSector, { group: data.group })}</p>
        {rows.map((p) => (
          <button key={p.symbol} type="button" className="m-row" onClick={() => onOpen(p.symbol)}>
            <div className="m-grow" style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{p.symbol}</div>
              <div className="m-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
            </div>
            <div className="m-num" style={{ textAlign: 'right', flex: 'none' }}>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{isNum(p.price) ? `$${fmtPrice(p.price, lang)}` : DASH}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: changeColor(p.change_pct, US) }}>{fmtSignedPct(p.change_pct)}</div>
            </div>
          </button>
        ))}
      </div>
    </Section>
  )
}
