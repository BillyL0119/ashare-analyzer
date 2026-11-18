import { useMemo, useState } from 'react'
import './quotepage.css'
import './history.css'
import useQuoteApi from './useQuoteApi'
import useActiveTicker from './useActiveTicker'
import TickerSwitch from './TickerSwitch'
import { fmtDate, fmtInt, fmtPrice, LOCALE } from './format'
import historyStrings, { fill } from './historyStrings'
import { csvName, dividendsCsv, dividendsCsvName, downloadText, historyCsv } from './historyCsv'

const RANGES = ['1m', '3m', '6m', 'ytd', '1y', '2y', '5y', '10y']
const INTERVALS = ['1d', '1wk', '1mo']
const PAGE = 100

/** "$0.27", "$0.205": at least two decimals, up to four, so small dividends are not rounded away */
function fmtDividend(v, lang) {
  return `$${new Intl.NumberFormat(LOCALE[lang] || 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(v)}`
}

/** Dividends by the row they sit under: the newest row dated on or before the ex-date (rows newest first). */
function dividendsByRow(rows, dividends) {
  const map = new Map()
  for (const d of dividends) {
    let at = rows.findIndex((r) => r.date <= d.date)
    if (at < 0) at = rows.length - 1
    if (at < 0) continue
    if (!map.has(at)) map.set(at, [])
    map.get(at).push(d)
  }
  return map
}

// The table is its own component, keyed by symbol / range / interval, so "Show 100 more" starts over at 100
// whenever the data changes without any effect-driven state reset.
function HistoryTable({ data, lang, S }) {
  const [shown, setShown] = useState(PAGE)
  const rows = data.rows
  const under = useMemo(() => dividendsByRow(rows, data.dividends || []), [rows, data.dividends])
  const visible = rows.slice(0, shown)
  const left = rows.length - visible.length

  return (
    <>
      <div className="qp-scroll qh-scroll">
        <table className="qp-table sticky qh-table">
          <thead>
            <tr>
              <th scope="col">{S.date}</th>
              <th scope="col">{S.open}</th>
              <th scope="col">{S.high}</th>
              <th scope="col">{S.low}</th>
              <th scope="col">{S.close}</th>
              <th scope="col">{S.adj}</th>
              <th scope="col">{S.volume}</th>
            </tr>
          </thead>
          <tbody>
            {visible.flatMap((r, i) => {
              const out = [
                <tr key={r.date}>
                  <td>{fmtDate(r.date, lang)}</td>
                  <td>{fmtPrice(r.open, lang)}</td>
                  <td>{fmtPrice(r.high, lang)}</td>
                  <td>{fmtPrice(r.low, lang)}</td>
                  <td className="qh-close">{fmtPrice(r.close, lang)}</td>
                  <td>{fmtPrice(r.adj_close, lang)}</td>
                  <td>{fmtInt(r.volume, lang)}</td>
                </tr>,
              ]
              for (const d of under.get(i) || []) {
                out.push(
                  <tr key={`div-${d.date}`} className="qh-div">
                    <td colSpan={7}>{S.dividend} <strong>{fmtDividend(d.amount, lang)}</strong></td>
                  </tr>,
                )
              }
              return out
            })}
          </tbody>
        </table>
      </div>
      {left > 0 && (
        <div className="qh-more">
          <button type="button" className="qp-link" onClick={() => setShown((n) => n + PAGE)}>
            {fill(S.showMore, { n: Math.min(PAGE, left) })}
          </button>
        </div>
      )}
    </>
  )
}

function Skeleton({ label }) {
  return (
    <div role="status" aria-label={label} style={{ display: 'grid', gap: 8 }}>
      <div className="qp-skel" style={{ height: 32, width: 320, maxWidth: '100%' }} />
      {Array.from({ length: 10 }, (_, i) => <div key={i} className="qp-skel" style={{ height: 30 }} />)}
    </div>
  )
}

export default function QuoteHistory({ stocks, lang }) {
  const S = historyStrings(lang)
  const [code, setCode] = useActiveTicker(stocks)
  const [range, setRange] = useState('1y')
  const [interval, setInterval_] = useState('1d')

  const url = code ? `/api/us/quote/${encodeURIComponent(code)}/history?range=${range}&interval=${interval}` : null
  const { data, error, loading } = useQuoteApi(url, { ttl: 5 * 60_000 })
  if (!code) return null

  const ready = data && data.rows

  const download = () => downloadText(historyCsv(data.rows), csvName(data.symbol, data.interval, data.from, data.to))
  const downloadDivs = () => downloadText(dividendsCsv(data.dividends), dividendsCsvName(data.symbol, data.from, data.to))

  return (
    <section className="qp" aria-label={S.title}>
      <TickerSwitch stocks={stocks} code={code} onChange={setCode} label={S.tickers} />
      <div className="qp-card">
        <div className="qp-head">
          <h2 className="qp-h">{S.title}</h2>
          <span className="qp-sub">{S.intro}</span>
        </div>

        <div className="qh-controls">
          <div className="qp-seg" role="group" aria-label={S.rangeLabel}>
            {RANGES.map((r) => (
              <button key={r} type="button" aria-pressed={r === range} onClick={() => setRange(r)}>{S.ranges[r]}</button>
            ))}
          </div>
          <div className="qp-seg" role="group" aria-label={S.intervalLabel}>
            {INTERVALS.map((i) => (
              <button key={i} type="button" aria-pressed={i === interval} onClick={() => setInterval_(i)}>{S.intervals[i]}</button>
            ))}
          </div>
          <span className="qh-spacer" />
          {ready && data.dividends.length > 0 && (
            <button type="button" className="qp-link" onClick={downloadDivs}>{S.downloadDivs}</button>
          )}
          <button type="button" className="qp-btn" onClick={download} disabled={!ready || data.rows.length === 0}>
            {S.download}
          </button>
        </div>

        {loading && <Skeleton label={S.loading} />}
        {!loading && error && <div className="qp-empty" role="alert">{S.error}</div>}
        {ready && data.rows.length === 0 && <div className="qp-empty">{S.empty}</div>}
        {ready && data.rows.length > 0 && (
          <>
            <p className="qh-meta">
              {fill(S.rows, { n: fmtInt(data.rows.length, lang), from: fmtDate(data.from, lang), to: fmtDate(data.to, lang) })}
              {data.interval === '1wk' && ` ${S.weekly}`}
              {data.interval === '1mo' && ` ${S.monthly}`}
            </p>
            {!data.adjusted && <p className="qh-meta">{S.notAdjusted}</p>}
            {data.adjusted && !data.dividend_data && <p className="qh-meta">{S.noDivData}</p>}
            <HistoryTable key={`${data.symbol}-${data.range}-${data.interval}`} data={data} lang={lang} S={S} />
            <div className="qh-foot">
              <p>{S.foot1}</p>
              {data.adjusted && <p>{S.foot2}</p>}
              <p>{S.source}</p>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
