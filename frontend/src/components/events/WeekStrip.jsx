import { useEffect, useRef } from 'react'
import { fmtDate } from '../quotepage/format'
import { addDays, sundayOf } from './dates'

const TYPES = ['economic', 'earnings', 'ipos', 'splits', 'dividends']

// Sunday to Saturday with a count per event type under each day. The week loads on its own: while it does,
// or if Nasdaq did not answer for a type, the count shows a dash (unknown), never a made-up zero.
export default function WeekStrip({ t, lang, date, today, type, week, onPick }) {
  const start = sundayOf(date)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const byDate = Object.fromEntries((week?.days || []).map((d) => [d.date, d.counts]))
  const scRef = useRef(null)

  // On a phone the strip scrolls sideways: bring the selected day into view (only the strip moves, not the page)
  useEffect(() => {
    const sc = scRef.current
    const el = sc?.querySelector('[aria-pressed="true"]')
    if (!sc || !el) return
    if (el.offsetLeft < sc.scrollLeft || el.offsetLeft + el.offsetWidth > sc.scrollLeft + sc.clientWidth) {
      sc.scrollLeft = Math.max(0, el.offsetLeft - 16)
    }
  }, [date])

  const range = `${fmtDate(start, lang, { month: 'short', day: 'numeric' })} – ${fmtDate(days[6], lang)}`

  return (
    <section className="qp-card" aria-label={t.weekNav}>
      <div className="ev-week-head">
        <h2 className="ev-week-title">{range}</h2>
        <div className="ev-nav">
          {sundayOf(today) !== start && <button type="button" onClick={() => onPick(today)}>{t.thisWeek}</button>}
          <button type="button" onClick={() => onPick(addDays(date, -7))}>{t.prevWeek}</button>
          <button type="button" onClick={() => onPick(addDays(date, 7))}>{t.nextWeek}</button>
        </div>
      </div>
      <div className="ev-strip-scroll" ref={scRef}>
        <div className="ev-strip" style={{ position: 'relative' }}>
          {days.map((d) => {
            const counts = byDate[d]
            return (
              <button key={d} type="button" className="ev-day" aria-pressed={d === date} onClick={() => onPick(d)}>
                <span className="ev-day-wd">
                  <span>{fmtDate(d, lang, { weekday: 'short' })}</span>
                  {d === today && <b>{t.today}</b>}
                </span>
                <span className="ev-day-date">{fmtDate(d, lang, { month: 'short', day: 'numeric' })}</span>
                {TYPES.map((k) => {
                  const n = counts ? counts[k] : null
                  return (
                    <span key={k} className={`ev-count${k === type ? ' on' : ''}${n === 0 ? ' zero' : ''}`}>
                      <span>{t.types[k]}</span>
                      <span>{n == null ? '—' : n}</span>
                    </span>
                  )
                })}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
