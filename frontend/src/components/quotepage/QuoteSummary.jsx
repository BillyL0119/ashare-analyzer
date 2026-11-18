import { useState } from 'react'
import useActiveTicker from './useActiveTicker'
import TickerSwitch from './TickerSwitch'
import useQuoteApi from './useQuoteApi'
import QuoteChart from './QuoteChart'
import SummaryStats from './SummaryStats'
import SummaryPerformance from './SummaryPerformance'
import SummaryRail from './SummaryRail'
import SummaryNews from './SummaryNews'
import { isNum, fmtPrice, fmtSigned, fmtSignedPct, fmtShortDate, changeColor } from './format'
import summaryStrings, { fill } from './summaryStrings'
import './quotepage.css'
import './summary.css'

// Pre-market, regular and after-hours prices all move (04:00-20:00 ET, weekdays): poll fast then, slowly otherwise.
function extendedSessionNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(new Date()).map((x) => [x.type, x.value]))
  const mins = (Number(p.hour) % 24) * 60 + Number(p.minute)
  return !['Sat', 'Sun'].includes(p.weekday) && mins >= 4 * 60 && mins < 20 * 60
}

function statusLine(d, lang, S) {
  const time = d.trade_time
  if (d.market_status === 'open' && time) return fill(S.statusOpen, { time })
  if (d.trade_date && time) return fill(S.statusClosed, { date: fmtShortDate(d.trade_date, lang), time })
  if (d.trade_date) return fill(S.statusDateOnly, { date: fmtShortDate(d.trade_date, lang) })
  return d.as_of_text || ''
}

function Header({ d, lang, S }) {
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

function SummaryBody({ code, lang, onOpenStock, onRetry }) {
  const S = summaryStrings(lang)
  const live = useQuoteApi(`/api/us/quote/${code}/live`, { ttl: 10_000, poll: extendedSessionNow() ? 15_000 : 120_000 })
  const d = live.data

  if (live.loading) {
    return (
      <div className="qp" aria-busy="true">
        <div className="qp-skel" style={{ height: 118 }} />
        <div className="qs-layout">
          <div className="qs-main"><div className="qp-skel" style={{ height: 380 }} /><div className="qp-skel" style={{ height: 330 }} /></div>
          <div className="qs-rail"><div className="qp-skel" style={{ height: 190 }} /></div>
        </div>
      </div>
    )
  }
  if (!d) {
    return (
      <div className="qp-card qs-err" role="alert">
        <span>{S.loadError}</span>
        <button type="button" className="qp-btn" onClick={onRetry}>{S.retry}</button>
      </div>
    )
  }
  return (
    <>
      <Header d={d} lang={lang} S={S} />
      <div className="qs-layout">
        <div className="qs-main">
          <QuoteChart code={code} lang={lang} live={d} />
          <SummaryStats live={d} lang={lang} />
          <SummaryPerformance code={code} lang={lang} />
        </div>
        <SummaryRail code={code} lang={lang} live={d} onOpenStock={onOpenStock} />
      </div>
      <SummaryNews code={code} lang={lang} />
    </>
  )
}

// Props: { stocks, market, lang, onOpenStock }. One ticker at a time; the others are one tap away.
export default function QuoteSummary({ stocks, lang, onOpenStock }) {
  const [code, setCode] = useActiveTicker(stocks)
  const [attempt, setAttempt] = useState(0)
  const S = summaryStrings(lang)
  if (!code) return null
  return (
    <div className="qp qs">
      <TickerSwitch stocks={stocks} code={code} onChange={setCode} label={S.switchLabel} />
      <SummaryBody key={`${code}-${attempt}`} code={code} lang={lang} onOpenStock={onOpenStock} onRetry={() => setAttempt((n) => n + 1)} />
    </div>
  )
}
