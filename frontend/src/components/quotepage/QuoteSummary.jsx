import { useState } from 'react'
import useActiveTicker from './useActiveTicker'
import TickerSwitch from './TickerSwitch'
import useQuoteApi from './useQuoteApi'
import QuoteChart from './QuoteChart'
import SummaryStats from './SummaryStats'
import SummaryPerformance from './SummaryPerformance'
import SummaryRail from './SummaryRail'
import SummaryNews from './SummaryNews'
import { QuoteHeaderView } from './QuoteHeader'
import { extendedSessionNow } from './session'
import summaryStrings from './summaryStrings'
import './quotepage.css'
import './summary.css'

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
      <QuoteHeaderView d={d} lang={lang} />
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
