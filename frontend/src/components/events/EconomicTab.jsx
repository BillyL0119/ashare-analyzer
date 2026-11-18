import { Fragment, useMemo, useState } from 'react'
import { eventName } from '../../utils/macro'
import { LOCALE } from '../quotepage/format'

// Economic tab: the macro releases of one day (CPI, jobs, rate decisions ...) with forecast, actual and previous,
// an importance filter, a country filter, the above/below-forecast flag and a plain "why it matters" note.
// This is what the old /macro page did, now one day at a time.

const COUNTRY_KEY = { 'United States': 'us', China: 'cn', 'Euro Zone': 'eu', Japan: 'jp', 'United Kingdom': 'uk' }
const COUNTRIES = ['us', 'cn', 'eu', 'jp', 'uk']


export default function EconomicTab({ t, lang, rows, filters, setFilters, empty }) {
  const [open, setOpen] = useState(null)
  const { countries, minImp } = filters
  const shown = useMemo(
    () => rows.filter((e) => countries.includes(COUNTRY_KEY[e.country]) && e.importance >= minImp),
    [rows, countries, minImp],
  )
  const toggle = (c) => setFilters({
    ...filters,
    countries: countries.includes(c) ? (countries.length > 1 ? countries.filter((x) => x !== c) : countries) : [...countries, c],
  })
  const clock = (iso) => new Date(iso).toLocaleTimeString(LOCALE[lang] || 'en-US', { hour: '2-digit', minute: '2-digit' })
  const showCountry = countries.length > 1

  return (
    <>
      <div className="ev-filters">
        <div className="ev-filter" role="group" aria-label={t.countryLabel}>
          <span>{t.countryLabel}</span>
          <div className="qp-seg">
            {COUNTRIES.map((c) => (
              <button key={c} type="button" aria-pressed={countries.includes(c)} onClick={() => toggle(c)}>{t.countries[c]}</button>
            ))}
          </div>
        </div>
        <div className="ev-filter" role="group" aria-label={t.impLabel}>
          <span>{t.impLabel}</span>
          <div className="qp-seg">
            {[3, 2, 1].map((n) => (
              <button key={n} type="button" aria-pressed={minImp === n} onClick={() => setFilters({ ...filters, minImp: n })}>{t.imp[n]}</button>
            ))}
          </div>
        </div>
      </div>

      {!shown.length ? <div className="qp-empty">{empty}</div> : (
        <div className="qp-scroll">
          <table className="qp-table">
            <thead>
              <tr>
                <th scope="col" className="ev-timeh">{t.col.time}</th>
                <th scope="col" className="ev-evh">{t.col.event}</th>
                <th scope="col">{t.col.actual}</th>
                <th scope="col">{t.col.forecast}</th>
                <th scope="col">{t.col.previous}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e, i) => {
                const id = `${e.time_utc}-${e.name}-${e.period || ''}-${i}`
                const isOpen = open === id
                return (
                  <Fragment key={id}>
                    <tr>
                      <td className="ev-time">{e.time_utc ? clock(e.time_utc) : '—'}</td>
                      <td className="ev-evcell">
                        <span className="ev-dots" aria-label={`${t.impLabel} ${e.importance}/3`} role="img">
                          {[1, 2, 3].map((n) => <i key={n} className={n <= e.importance ? 'on' : ''} />)}
                        </span>
                        {e.explain ? (
                          <button type="button" className="ev-ev" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : id)}>
                            <span className={`ev-ev-name${e.importance === 3 ? ' big' : ''}`}>{eventName(e.name, lang)}</span>
                            <span className="ev-ev-more" aria-hidden="true">{isOpen ? '▴' : '▾'}</span>
                          </button>
                        ) : <span className={`ev-ev-name${e.importance === 3 ? ' big' : ''}`}>{eventName(e.name, lang)}</span>}
                        {e.period && <span className="ev-tag">{t[e.period]}</span>}
                        {showCountry && <span className="ev-tag">{t.countries[COUNTRY_KEY[e.country]] || e.country}</span>}
                      </td>
                      <td className={e.released ? 'strong' : ''} title={e.surprise ? t[e.surprise] : undefined}>
                        {e.actual || '—'}
                        {e.surprise && <span className="ev-surprise" aria-label={t[e.surprise]}>{e.surprise === 'above' ? '▲' : '▼'}</span>}
                      </td>
                      <td>{e.consensus || '—'}</td>
                      <td>{e.previous || '—'}</td>
                    </tr>
                    {isOpen && e.explain && (
                      <tr className="ev-whyrow">
                        <td />
                        <td colSpan={4}><p className="ev-why"><b>{t.why}{lang === 'zh' ? '：' : ': '}</b>{e.explain}</p></td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="ev-note">{t.localTimes}</p>
    </>
  )
}
