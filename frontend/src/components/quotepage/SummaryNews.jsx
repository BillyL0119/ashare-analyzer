import useQuoteApi from './useQuoteApi'
import { LOCALE } from './format'
import summaryStrings from './summaryStrings'
import './quotepage.css'
import './summary.css'

// The news feed sends RFC dates ("Wed, 18 Nov 2026 12:31:11 +0000"); show the day, in the reader's language.
function newsDate(s, lang) {
  const d = new Date(s)
  if (!s || Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return null
  return d.toLocaleDateString(LOCALE[lang] || 'en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })
}

export default function SummaryNews({ code, lang }) {
  const S = summaryStrings(lang)
  const { data, error, loading } = useQuoteApi(`/api/news/${code}?market=us&lang=${lang}`, { ttl: 300_000 })
  const items = (data?.news || []).filter((n) => n.title && /^https?:\/\//.test(n.url || '')).slice(0, 5)
  return (
    <section className="qp-card" aria-label={S.newsTitle}>
      <div className="qp-head"><h3 className="qp-h">{S.newsTitle}</h3></div>
      {loading && <div className="qp-skel" style={{ height: 200 }} aria-hidden="true" />}
      {!loading && items.length === 0 && <div className="qp-empty">{error ? S.newsError : S.newsEmpty}</div>}
      {items.length > 0 && (
        <ul className="qs-news">
          {items.map((n) => (
            <li key={n.url}>
              <a href={n.url} target="_blank" rel="noopener noreferrer">{n.title}</a>
              <span className="by">{[n.source, newsDate(n.time, lang)].filter(Boolean).join(', ')}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
