import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import '../quotepage/quotepage.css'
import './events.css'
import useQuoteApi from '../quotepage/useQuoteApi'
import { fmtDate } from '../quotepage/format'
import eventsStrings from './eventsStrings'
import WeekStrip from './WeekStrip'
import EconomicTab from './EconomicTab'
import EventTable from './EventTables'
import { isIso, sundayOf, todayET } from './dates'

const ECON_DEFAULT = { countries: ['us'], minImp: 2 }
const TYPES = ['economic', 'earnings', 'ipos', 'splits', 'dividends']

// The calendar at /macro. The URL keeps the state (/macro?date=2026-11-18&type=earnings) so a day can be shared.
export default function EventsCalendarPage({ lang }) {
  const t = eventsStrings(lang)
  const [params, setParams] = useSearchParams()
  const today = todayET()
  const date = isIso(params.get('date')) ? params.get('date') : today
  const type = TYPES.includes(params.get('type')) ? params.get('type') : 'economic'
  const [econ, setEcon] = useState(ECON_DEFAULT)
  const [nonce, setNonce] = useState(0)

  const go = (next) => setParams({ date, type, ...next }, { replace: true })

  const week = useQuoteApi(`/api/events/week?start=${sundayOf(date)}`, { ttl: 60_000 })
  const day = useQuoteApi(`/api/events/day?date=${date}&type=${type}&lang=${lang}${nonce ? `&r=${nonce}` : ''}`, { ttl: 60_000 })

  const label = fmtDate(date, lang, { weekday: 'long', month: 'short', day: 'numeric' })
  const failed = day.error || day.data?.error
  const rows = day.data?.rows || []

  let body
  if (failed) {
    body = (
      <div className="qp-empty">
        <p style={{ margin: '0 0 12px' }}>{t.failedDay}</p>
        <button type="button" className="qp-btn" onClick={() => setNonce((n) => n + 1)}>{t.retry}</button>
      </div>
    )
  } else if (day.loading || !day.data) {
    body = <div className="qp-empty">{t.loading}</div>
  } else if (type === 'economic') {
    body = <EconomicTab key={date} t={t} lang={lang} rows={rows} filters={econ} setFilters={setEcon} empty={t.empty.economic(label)} />
  } else if (!rows.length) {
    body = <div className="qp-empty">{t.empty[type](label)}{type === 'splits' && <><br />{t.splitsNote}</>}</div>
  } else {
    body = <EventTable key={`${date}-${type}`} type={type} rows={rows} t={t} lang={lang} />
  }

  return (
    <div className="ev">
      <header>
        <h1 className="ev-title">{t.title}</h1>
        <p className="ev-lede">{t.sub}</p>
      </header>

      <WeekStrip t={t} lang={lang} date={date} today={today} type={type} week={week.data} onPick={(d) => go({ date: d })} />

      <section className="qp-card" aria-label={t.types[type]}>
        <div className="ev-tabs-row">
          <div className="qp-seg" role="group" aria-label={t.title}>
            {TYPES.map((k) => (
              <button key={k} type="button" aria-pressed={k === type} onClick={() => go({ type: k })}>{t.types[k]}</button>
            ))}
          </div>
          <h2 className="ev-day-title">{label}</h2>
        </div>
        <p className="ev-hint">{t.hint[type]}</p>
        {body}
        <p className="ev-note">{type === 'economic' ? t.sourceEcon : t.sourceNote}</p>
      </section>
    </div>
  )
}
