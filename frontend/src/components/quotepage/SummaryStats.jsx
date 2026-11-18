import Term from './Term'
import { DASH, isNum, fmtPrice, fmtInt, fmtRatio, fmtMoney, fmtDate, fmtPct } from './format'
import summaryStrings, { fill } from './summaryStrings'
import './quotepage.css'
import './summary.css'

/** low - high with a thin bar marking where the price sits; a dash when either end is unknown */
function RangeValue({ low, high, price, lang }) {
  if (!isNum(low) || !isNum(high)) return DASH
  const pos = isNum(price) && high > low ? Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100)) : null
  return (
    <>
      {fmtPrice(low, lang)} – {fmtPrice(high, lang)}
      {pos !== null && <span className="qs-bar" aria-hidden="true"><i style={{ left: `${pos}%` }} /></span>}
    </>
  )
}

const withSize = (price, size, lang) => (isNum(price) ? `${fmtPrice(price, lang)}${isNum(size) ? ` × ${fmtInt(size, lang)}` : ''}` : DASH)

function statRows(d, lang, S) {
  const earn = d.earnings
  const div = isNum(d.dividend_rate) ? `$${fmtPrice(d.dividend_rate, lang)}${isNum(d.dividend_yield) ? ` (${fmtPct(d.dividend_yield)})` : ''}` : DASH
  return [
    ['prev_close', isNum(d.prev_close) ? fmtPrice(d.prev_close, lang) : DASH],
    ['open', isNum(d.open) ? fmtPrice(d.open, lang) : DASH],
    ['bid', withSize(d.bid, d.bid_size, lang)],
    ['ask', withSize(d.ask, d.ask_size, lang)],
    ['day_range', <RangeValue key="d" low={d.day_low} high={d.day_high} price={d.price} lang={lang} />],
    ['week52_range', <RangeValue key="w" low={d.week52_low} high={d.week52_high} price={d.price} lang={lang} />],
    ['volume', fmtInt(d.volume, lang)],
    ['avg_volume_3m', fmtInt(d.avg_volume_3m, lang)],
    ['market_cap', fmtMoney(d.market_cap, lang, d.currency || 'USD')],
    ['beta_5y_monthly', fmtRatio(d.beta_5y_monthly, lang)],
    ['pe_ttm', fmtRatio(d.pe_ttm, lang)],
    ['eps_ttm', fmtRatio(d.eps_ttm, lang)],
    ['earnings_date', earn?.date ? (
      <>
        {fmtDate(earn.date, lang)}
        {(earn.timing || isNum(earn.eps_estimate)) && (
          <span className="m">
            {[earn.timing && S[earn.timing], isNum(earn.eps_estimate) && fill(S.epsEstimate, { value: `$${fmtPrice(earn.eps_estimate, lang)}` })].filter(Boolean).join(', ')}
          </span>
        )}
      </>
    ) : earn?.announced === false ? S.notAnnounced : DASH],
    ['forward_dividend_yield', div],
    ['ex_dividend_date', d.ex_dividend_date ? fmtDate(d.ex_dividend_date, lang) : DASH],
    ['target_1y', isNum(d.target_1y) ? fmtPrice(d.target_1y, lang) : DASH],
  ]
}

export default function SummaryStats({ live, lang }) {
  const S = summaryStrings(lang)
  const rows = statRows(live, lang, S)
  const col = (list) => (
    <dl className="qp-dl">
      {list.map(([k, v]) => [
        <dt key={`t${k}`}><Term k={k} lang={lang}>{S[`lbl_${k}`]}</Term></dt>,
        <dd key={`d${k}`}>{v}</dd>,
      ])}
    </dl>
  )
  return (
    <section className="qp-card qs-stats" aria-label={S.keyStats}>
      <div className="qp-head">
        <h3 className="qp-h">{S.keyStats}</h3>
        <span className="qp-sub">{S.keyStatsHint}</span>
      </div>
      <div className="qs-stats-grid">
        {col(rows.slice(0, 8))}
        {col(rows.slice(8))}
      </div>
    </section>
  )
}
