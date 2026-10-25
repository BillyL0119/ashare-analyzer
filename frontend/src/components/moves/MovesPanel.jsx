import { useEffect, useState } from 'react'
import movesStrings from './movesStrings'

// "Why did it move?": a stock's biggest one-day moves of the past year with the facts on record for
// each day (market and sector moves, SEC filings, Fed decisions, headlines, cninfo announcements),
// and an AI explanation from those facts on request.

const UP = '#10b981', DOWN = '#ef4444', ACCENT = '#0ea5e9'
const KIND_COLOR = { market: '#8b5cf6', sector: '#f59e0b', stock: ACCENT }

// A-shares are red-up like the rest of the site; US green-up
const col = (v, market) => (!v ? 'var(--text-secondary)' : (v > 0) === (market !== 'cn') ? UP : DOWN)
const pct = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${Number(v).toFixed(2)}%`)

const CSS = `
.mv { display: grid; gap: 14px; }
.mv-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 14px; padding: 14px 16px; display: grid; gap: 10px; min-width: 0; }
.mv-muted { color: var(--text-secondary); }
.mv-chip { font-size: 12px; font-weight: 650; padding: 3px 9px; border-radius: 999px; background: var(--bg-tertiary); white-space: nowrap; font-variant-numeric: tabular-nums; }
.mv-h { font-size: 11.5px; font-weight: 800; letter-spacing: .3px; color: var(--text-secondary); text-transform: uppercase; }
.mv-link { color: var(--text-primary); text-decoration: none; font-size: 13px; line-height: 1.5; }
.mv-link:hover { color: ${ACCENT}; }
.mv-btn { border: 1px solid var(--border-primary); background: transparent; color: var(--text-primary); border-radius: 8px; padding: 6px 12px; font-size: 12.5px; font-weight: 650; cursor: pointer; justify-self: start; }
.mv-btn:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
.mv-ai { border-left: 3px solid ${ACCENT}; background: ${ACCENT}10; border-radius: 8px; padding: 10px 12px; font-size: 13.5px; line-height: 1.65; }
`

function Day({ d, s, lang, market, symbol }) {
  const [ai, setAi] = useState(d.explanation ? { text: d.explanation } : null)
  const f = d.facts
  const hasFacts = f.filings.length || f.fomc || f.news.length || f.announcements.length
  const ask = async () => {
    setAi({ loading: true })
    try {
      const r = await fetch(`/api/moves/${market}/${encodeURIComponent(symbol)}/explain`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: d.date, lang }) })
      const j = await r.json()
      setAi(r.ok ? { text: j.text } : { error: true })
    } catch { setAi({ error: true }) }
  }
  return (
    <article className="mv-card">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <b style={{ fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{d.date}</b>
        <span style={{ fontSize: 22, fontWeight: 800, color: col(d.change_pct, market), fontVariantNumeric: 'tabular-nums' }}>{pct(d.change_pct)}</span>
        <span className="mv-chip" title={s.kindHelp[d.kind]} style={{ background: `${KIND_COLOR[d.kind]}22`, color: KIND_COLOR[d.kind] }}>{s.kinds[d.kind]}</span>
        <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
          {d.market_pct != null && <span className="mv-chip">{s.market(d.benchmark)} <span style={{ color: col(d.market_pct, market) }}>{pct(d.market_pct)}</span></span>}
          {d.sector_pct != null && <span className="mv-chip">{s.sector(d.sector_etf)} <span style={{ color: col(d.sector_pct, market) }}>{pct(d.sector_pct)}</span></span>}
        </span>
      </div>
      {f.fomc && <div style={{ fontSize: 13 }}>🏛 {s.fomc}</div>}
      {f.filings.length > 0 && (
        <div style={{ display: 'grid', gap: 4 }}>
          <span className="mv-h">{s.filings}</span>
          {f.filings.map((x) => (
            <a key={x.url} className="mv-link" href={x.url} target="_blank" rel="noopener noreferrer">
              📄 <b>{x.form}</b>{x.labels.length ? ` · ${x.labels.join(' · ')}` : ''} <span className="mv-muted" style={{ fontSize: 12 }}>· {x.time} {s.et} ↗</span>
            </a>
          ))}
        </div>
      )}
      {f.announcements.length > 0 && (
        <div style={{ display: 'grid', gap: 4 }}>
          <span className="mv-h">{s.anns}</span>
          {f.announcements.map((a) => <a key={a.url} className="mv-link" href={a.url} target="_blank" rel="noopener noreferrer">📄 {a.title} <span className="mv-muted" style={{ fontSize: 12 }}>· {a.date} ↗</span></a>)}
        </div>
      )}
      {f.news.length > 0 && (
        <div style={{ display: 'grid', gap: 4 }}>
          <span className="mv-h">{s.news}</span>
          {f.news.map((n) => <a key={n.url} className="mv-link" href={n.url} target="_blank" rel="noopener noreferrer">📰 {n.title} <span className="mv-muted" style={{ fontSize: 12 }}>· {n.publisher || ''} {n.date} ↗</span></a>)}
        </div>
      )}
      {!hasFacts && d.kind === 'stock' && <div className="mv-muted" style={{ fontSize: 13, lineHeight: 1.55 }}>{s.noFacts}</div>}
      {!ai && <button className="mv-btn" onClick={ask}>✨ {s.ai}</button>}
      {ai?.loading && <div className="mv-muted" style={{ fontSize: 13 }}>{s.aiLoading}</div>}
      {ai?.error && <div className="mv-muted" style={{ fontSize: 13 }}>{s.aiFail}</div>}
      {ai?.text && <div className="mv-ai">✨ {ai.text}<div className="mv-muted" style={{ fontSize: 11.5, marginTop: 6 }}>{s.aiNote}</div></div>}
    </article>
  )
}

export default function MovesPanel({ symbol, market, lang }) {
  const s = movesStrings(lang)
  const [data, setData] = useState(null)
  const supported = market === 'us' || market === 'cn'
  useEffect(() => {
    if (!supported || !symbol) return undefined
    let alive = true
    fetch(`/api/moves/${market}/${encodeURIComponent(symbol)}?lang=${lang}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { if (alive) setData({ key: `${market}:${symbol}:${lang}`, ...d }) })
      .catch(() => { if (alive) setData({ key: `${market}:${symbol}:${lang}`, error: true }) })
    return () => { alive = false }
  }, [symbol, market, lang, supported])
  const current = data?.key === `${market}:${symbol}:${lang}` ? data : null

  return (
    <section className="mv">
      <style>{CSS}</style>
      <div style={{ display: 'grid', gap: 4 }}>
        <h3 style={{ margin: 0, fontSize: 17 }}>📉📈 {s.title} <span className="mv-muted" style={{ fontSize: 13, fontWeight: 500 }}>{symbol}</span></h3>
        <p className="mv-muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6, maxWidth: 820 }}>{s.intro}</p>
      </div>
      {!supported && <div className="mv-card mv-muted">{s.unsupported}</div>}
      {supported && !current && <div className="mv-card mv-muted" style={{ fontSize: 13 }}>{s.loading}</div>}
      {current?.error && <div className="mv-card mv-muted">{s.err}</div>}
      {current && !current.error && (
        <>
          {current.threshold != null && <div className="mv-muted" style={{ fontSize: 12 }}>{s.threshold(current.threshold)}{current.news_from ? ` · ${s.newsNote(current.news_from)}` : ''}</div>}
          {current.days.length === 0 && <div className="mv-card mv-muted">{s.none}</div>}
          {current.days.map((d) => <Day key={d.date} d={d} s={s} lang={lang} market={market} symbol={current.symbol} />)}
        </>
      )}
    </section>
  )
}
