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
  const [open, setOpen] = useState(false)
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

  const text = zh ? quote.quote_cn : quote.quote_en
  const author = zh ? quote.author_cn : quote.author
  const title = zh ? quote.title_cn : quote.title
  const initial = (quote.author || '?')[0].toUpperCase()
  const avatarColor = getAvatarColor(quote.author || '')
  const preview = text.length > 60 ? text.slice(0, 60) + '…' : text
  const needsExpand = text.length > 60

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-primary)',
      borderLeft: '2px solid var(--accent-gold)',
      borderRadius: 10,
      marginBottom: 4,
      overflow: 'hidden',
      cursor: needsExpand ? 'pointer' : 'default',
    }}
      onClick={() => needsExpand && setOpen(v => !v)}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: open ? '10px 14px 6px' : '8px 14px',
        minHeight: 40,
      }}>
        {/* Left quote mark */}
        <span style={{
          fontSize: 28, lineHeight: 1,
          background: 'linear-gradient(135deg, var(--accent-gold), #f97316)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          flexShrink: 0, userSelect: 'none', marginTop: -4,
        }}>
          "
        </span>

        {/* Quote text */}
        <span style={{
          flex: 1,
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          fontStyle: 'italic',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: open ? 'unset' : 2,
          WebkitBoxOrient: 'vertical',
          letterSpacing: '0.1px',
        }}>
          {open ? text : preview}
        </span>

        {/* Author badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          flexShrink: 0, marginLeft: 4,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: avatarColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: '#fff',
            flexShrink: 0,
            boxShadow: `0 0 0 2px ${avatarColor}33`,
          }}>
            {initial}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              {author}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </div>
          </div>
        </div>

        {/* Expand chevron */}
        {needsExpand && (
          <span className={`bfs-chevron${open ? ' is-open' : ''}`} style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>▼</span>
        )}
      </div>

      {/* Expanded full view */}
      {open && (
        <div style={{
          borderTop: '1px solid var(--border-primary)',
          padding: '10px 14px 12px 14px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <p style={{
            margin: 0, fontSize: 13, color: 'var(--text-primary)',
            lineHeight: 1.7, fontStyle: 'italic',
          }}>
            "{text}"
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: avatarColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {initial}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{author}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{title}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
