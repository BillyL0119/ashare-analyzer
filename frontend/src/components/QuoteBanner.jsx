import { useState, useEffect } from 'react'

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

  if (loading) {
    return (
      <div className="skeleton-appear" style={{ margin: '14px 0 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton" style={{ height: 13, width: '70%' }} />
        <div className="skeleton" style={{ height: 10, width: '25%' }} />
      </div>
    )
  }

  if (!quote) return null

  const text = zh ? (quote.quote_cn || quote.quote_en) : (quote.quote_en || quote.quote_cn)
  const author = zh ? (quote.author_cn || quote.author) : (quote.author || quote.author_cn)
  const title = zh ? (quote.title_cn || quote.title) : (quote.title || quote.title_cn)

  return (
    <blockquote style={{
      margin: '14px 0 10px', padding: 0,
      display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap',
    }}>
      <span style={{
        flex: '1 1 420px',
        fontSize: 15,
        color: 'var(--text-secondary)',
        lineHeight: 1.55,
        fontStyle: 'italic',
        fontFamily: 'var(--heading)',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        “{text}”
      </span>
      {author && (
        <cite style={{ fontStyle: 'normal', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{author}</span>
          {title ? ` · ${title}` : ''}
        </cite>
      )}
    </blockquote>
  )
}
