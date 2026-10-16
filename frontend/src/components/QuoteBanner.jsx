import { useState, useEffect } from 'react'

// The quote of the day, set as a statement near the end of the home page.
export default function QuoteBanner({ lang }) {
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const zh = lang === 'zh'

  useEffect(() => {
    fetch('/api/quotes/today')
      .then(r => r.json())
      .then(d => { setQuote(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading || !quote) return null

  const text = zh ? (quote.quote_cn || quote.quote_en) : (quote.quote_en || quote.quote_cn)
  const author = zh ? (quote.author_cn || quote.author) : (quote.author || quote.author_cn)
  const title = zh ? (quote.title_cn || quote.title) : (quote.title || quote.title_cn)

  return (
    <figure data-reveal style={{ margin: '0 auto', maxWidth: 880, padding: '120px 0 0' }}>
      <blockquote style={{ margin: 0, fontSize: 'clamp(22px, 2.3vw, 34px)', lineHeight: 1.3, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
        <p style={{ margin: 0 }}>“{text}”</p>
      </blockquote>
      {author && (
        <figcaption style={{ marginTop: 20, fontSize: 15, color: 'var(--text-secondary)' }}>
          {author}{title && <span style={{ color: 'var(--text-muted)' }}>, {title}</span>}
        </figcaption>
      )}
    </figure>
  )
}
