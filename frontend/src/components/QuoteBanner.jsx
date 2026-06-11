import { useState, useEffect } from 'react'

const AVATAR_COLORS = [
  '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
]

function getAvatarColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

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
      <div className="skeleton-appear" style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        borderLeft: '2px solid var(--accent-gold)',
        borderRadius: 10, padding: '10px 16px', marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 20, color: 'var(--accent-gold)', flexShrink: 0, opacity: 0.5 }}>"</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton" style={{ height: 12, width: '80%' }} />
          <div className="skeleton" style={{ height: 10, width: '35%' }} />
        </div>
      </div>
    )
  }

  if (!quote) return null

  const text = zh ? (quote.quote_cn || quote.quote_en) : (quote.quote_en || quote.quote_cn)
  const author = zh ? (quote.author_cn || quote.author) : (quote.author || quote.author_cn)
  const title = zh ? (quote.title_cn || quote.title) : (quote.title || quote.title_cn)
  const initial = (quote.author || quote.author_cn || '?')[0].toUpperCase()
  const avatarColor = getAvatarColor(quote.author || quote.author_cn || '')

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-primary)',
      borderLeft: '2px solid var(--accent-gold)',
      borderRadius: 10,
      marginBottom: 4,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 14px',
    }}>
      {/* Left quote mark */}
      <span style={{
        fontSize: 28, lineHeight: 1,
        background: 'linear-gradient(135deg, var(--accent-gold), #f97316)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        flexShrink: 0, userSelect: 'none', alignSelf: 'flex-start', marginTop: 2,
      }}>
        "
      </span>

      {/* Quote text — full, no truncation, up to 3 lines via lineClamp */}
      <span style={{
        flex: 1,
        fontSize: 12,
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        fontStyle: 'italic',
        letterSpacing: '0.1px',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {text}
      </span>

      {/* Author badge */}
      {author && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, marginLeft: 4 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: avatarColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
            boxShadow: `0 0 0 2px ${avatarColor}33`,
          }}>
            {initial}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              {author}
            </div>
            {title && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {title}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
