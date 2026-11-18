import useQuoteApi from './useQuoteApi'
import { extendedSessionNow } from './session'
import { isNum, fmtPrice, fmtSigned, fmtSignedPct, fmtShortDate, changeColor } from './format'
import summaryStrings, { fill } from './summaryStrings'
import './quotepage.css'
import './summary.css'

// The quote header every quote tab opens with, as Yahoo shows it above all its tabs: name, ticker, exchange,
// price and change, when the price is from, and the pre-market or after-hours price.


function statusLine(d, lang, S) {
  const time = d.trade_time
  if (d.market_status === 'open' && time) return fill(S.statusOpen, { time })
  if (d.trade_date && time) return fill(S.statusClosed, { date: fmtShortDate(d.trade_date, lang), time })
  if (d.trade_date) return fill(S.statusDateOnly, { date: fmtShortDate(d.trade_date, lang) })
  return d.as_of_text || ''
}

export function QuoteHeaderView({ d, lang }) {
  const S = summaryStrings(lang)
  const digits = isNum(d.price) && Math.abs(d.price) < 1 ? 4 : 2
  const color = changeColor(d.change_pct)
  const ext = d.extended
  const extTime = ext?.as_of_text?.match(/\d{1,2}:\d{2} [AP]M/)?.[0]
  return (
    <header className="qs-head">
      <h2 className="qs-name">{d.name || d.symbol}<span className="sym">{d.symbol}</span></h2>
      <div className="qs-exch">{fill(S.exchangeLine, { exchange: d.exchange || '', currency: d.currency || 'USD' })}</div>
      <div className="qs-price-row">
        <span className="qs-price">{isNum(d.price) ? fmtPrice(d.price, lang, digits) : '—'}</span>
        {isNum(d.change_pct) && (
          <span className="qs-chg" style={{ color }}>
            {isNum(d.change) ? `${fmtSigned(d.change, digits)} ` : ''}({fmtSignedPct(d.change_pct)})
          </span>
        )}
      </div>
      <div className="qs-status">{statusLine(d, lang, S)}</div>
      {ext && isNum(ext.price) && (
        <div className="qs-ext">
          {ext.session === 'pre' ? S.extPre : S.extPost}
          <b>${fmtPrice(ext.price, lang, digits)}</b>
          {isNum(ext.change_pct) && <span style={{ color: changeColor(ext.change_pct) }}>{fmtSignedPct(ext.change_pct)}</span>}
          {extTime && <span className="t">{extTime} ET</span>}
        </div>
      )}
    </header>
  )
}

/** The header for tabs other than Summary: fetches the same live quote (shared cache, so no extra request
 * when Summary was open). A placeholder of the same height holds its place while it loads, so the tab below
 * does not jump; if the quote fails the header is left out rather than blocking the tab. */
export default function QuoteHeader({ code, lang }) {
  const live = useQuoteApi(code ? `/api/us/quote/${code}/live` : null, { ttl: 10_000, poll: extendedSessionNow() ? 15_000 : 120_000 })
  if (live.loading) return <div className="qp-skel" style={{ height: 112 }} aria-hidden="true" />
  if (!live.data) return null
  return <QuoteHeaderView d={live.data} lang={lang} />
}
