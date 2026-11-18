import { useState } from 'react'
import './quotepage.css'
import './stats.css'
import useQuoteApi from './useQuoteApi'
import useActiveTicker from './useActiveTicker'
import TickerSwitch from './TickerSwitch'
import Term from './Term'
import { explain } from './glossary'
import statsStrings from './statsStrings'
import { fmtValue, fmtDate, isNum } from './format'

// Statistics tab: Yahoo-style groups of figures, each label explained by the glossary.
// Props: { stocks, market, lang, onOpenStock }

const LEFT = ['fiscal', 'profitability', 'management', 'income', 'balance', 'cashflow']
const RIGHT = ['price_history', 'shares', 'dividends']

/** fmtValue prints "$-1.23" for negative prices; put the sign first instead. */
function show(row, lang) {
  if (row.fmt === 'price' && isNum(row.value) && row.value < 0) return `−${fmtValue(-row.value, 'price', lang)}`
  return fmtValue(row.value, row.fmt, lang)
}

function Rows({ rows, t, lang }) {
  return (
    <dl className="qp-dl">
      {rows.map((r) => {
        const tag = r.as_of && r.value != null
          ? fmtDate(r.as_of, lang)
          : r.period === 'ttm' || r.period === 'mrq' ? t[`tag_${r.period}`] : null
        return [
          <dt key={`${r.key}-l`}><Term k={r.key} lang={lang}>{t.labels[r.key] || r.key}</Term></dt>,
          <dd key={`${r.key}-v`}>
            {show(r, lang)}
            {tag && r.value != null && <span className="qt-tag">{tag}</span>}
          </dd>,
        ]
      })}
    </dl>
  )
}

function Skeleton() {
  return (
    <div className="qp" aria-busy="true">
      <div className="qp-skel" style={{ height: 150 }} />
      <div className="qp-cols">
        {[0, 1].map((i) => (
          <div key={i} className="qp-skel" style={{ height: 520 }} />
        ))}
      </div>
    </div>
  )
}

export default function QuoteStatistics({ stocks, lang }) {
  const [code, setCode] = useActiveTicker(stocks)
  const [nonce, setNonce] = useState(0)
  const t = statsStrings(lang)
  // the nonce only exists to make "Try again" bypass the shared fetch cache
  const url = code ? `/api/us/quote/${encodeURIComponent(code)}/stats${nonce ? `?r=${nonce}` : ''}` : null
  const { data, error, loading } = useQuoteApi(url, { ttl: 60_000 })

  const head = (
    <>
      <TickerSwitch stocks={stocks} code={code} onChange={setCode} label={t.switchLabel} />
      <p className="qt-intro">{t.intro}</p>
    </>
  )

  if (!code) return null
  if (loading) return <div className="qp">{head}<Skeleton /></div>
  if (error || !data) {
    return (
      <div className="qp">
        {head}
        <div className="qp-card qp-empty" role="alert">
          <div>{t.error}</div>
          <p><button type="button" className="qp-btn" onClick={() => setNonce((n) => n + 1)}>{t.retry}</button></p>
        </div>
      </div>
    )
  }

  const byKey = Object.fromEntries((data.groups || []).map((g) => [g.key, g.rows || []]))
  const group = (key) => (byKey[key]?.length ? (
    <section key={key} className="qt-group" aria-label={t[`g_${key}`]}>
      <h4 className="qt-sub">{t[`g_${key}`]}</h4>
      <Rows rows={byKey[key]} t={t} lang={lang} />
    </section>
  ) : null)
  const valuation = byKey.valuation || []
  const third = Math.ceil(valuation.length / 3)

  return (
    <div className="qp">
      {head}

      <section className="qp-card" aria-labelledby="qt-valuation">
        <div className="qp-head"><h3 className="qp-h" id="qt-valuation">{t.g_valuation}</h3></div>
        <p className="qt-hint">{t.h_valuation}</p>
        <div className="qt-trio">
          {[0, 1, 2].map((i) => {
            const rows = valuation.slice(i * third, (i + 1) * third)
            return rows.length ? <Rows key={i} rows={rows} t={t} lang={lang} /> : null
          })}
        </div>
      </section>

      <div className="qp-cols">
        <section className="qp-card" aria-labelledby="qt-highlights">
          <div className="qp-head"><h3 className="qp-h" id="qt-highlights">{t.g_highlights}</h3></div>
          <p className="qt-hint">{t.h_highlights}</p>
          {LEFT.map(group)}
        </section>
        <section className="qp-card" aria-labelledby="qt-trading">
          <div className="qp-head"><h3 className="qp-h" id="qt-trading">{t.g_trading}</h3></div>
          <p className="qt-hint">{t.h_trading}</p>
          {RIGHT.map(group)}
        </section>
      </div>

      <section className="qp-card" aria-labelledby="qt-abbr">
        <div className="qp-head"><h3 className="qp-h" id="qt-abbr">{t.abbrTitle}</h3></div>
        <dl className="qt-abbr">
          {['ttm', 'mrq', 'yoy'].map((k) => (
            <div key={k}>
              <dt>{t[`abbr_${k}`]}</dt>
              <dd>{explain(`abbr_${k}`, lang)?.d}</dd>
            </div>
          ))}
        </dl>
        <p className="qp-note">{t.stale}</p>
        <p className="qp-note">{t.sourceLine(fmtDate((data.as_of || '').slice(0, 10), lang))}</p>
      </section>
    </div>
  )
}
