import { useState, useEffect } from 'react'
import './quote.css'

// The day's quote from a business leader, pinned to the top of the home page and set large.
// Quotes come in English and Chinese; the other languages show the English one.
const LABEL = { zh: '今日语录', en: 'Quote of the day', ja: '今日の言葉', ko: '오늘의 명언', fr: 'Citation du jour' }
const LOCALE = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR' }

// variant: 'band' (one slim row at the top of the desktop home page) or the default stacked card (phone)
export default function QuoteBanner({ lang, variant }) {
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const zh = lang === 'zh'

  useEffect(() => {
    fetch('/api/quotes/today')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setQuote(d?.quote_en || d?.quote_cn ? d : null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section className={`bfs-quote${variant === 'band' ? ' is-band' : ''}`} aria-hidden="true">
        <div className="skeleton" style={{ height: 14, width: 120, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 34, width: '80%', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 34, width: '55%' }} />
      </section>
    )
  }
  if (!quote) return null

  const text = zh ? (quote.quote_cn || quote.quote_en) : (quote.quote_en || quote.quote_cn)
  // The quote's own language (Chinese readers get the Chinese text), so the right typeface is used
  const textLang = text === quote.quote_cn ? 'zh-CN' : 'en'
  const author = zh ? (quote.author_cn || quote.author) : (quote.author || quote.author_cn)
  const title = zh ? (quote.title_cn || quote.title) : (quote.title || quote.title_cn)
  const initials = (quote.author || author || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const today = new Date().toLocaleDateString(LOCALE[lang] || 'en-US', { month: 'long', day: 'numeric' })
  const long = text.length > (zh ? 60 : 140)

  return (
    <figure className={`bfs-quote${variant === 'band' ? ' is-band' : ''}`}>
      <figcaption className="bfs-quote-head">
        <span>{LABEL[lang] || LABEL.en}</span>
        <span>{today}</span>
      </figcaption>
      <blockquote className={long ? 'is-long' : ''} lang={textLang}>
        <span className="mark" aria-hidden="true">“</span>{text}<span className="mark-end" aria-hidden="true">”</span>
      </blockquote>
      {author && (
        <div className="bfs-quote-who">
          <span className="avatar" aria-hidden="true">{initials}</span>
          <span>
            <b>{author}</b>
            {title && <span className="role">{title}</span>}
          </span>
        </div>
      )}
    </figure>
  )
}
